from __future__ import annotations

from typing import Any

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from services.bias_metrics import compute_fairness_metrics
from services.explainability import build_human_explanation, compute_top_feature_impacts
from services.mitigation import mitigate_with_reweighing
from services.model_handler import (
    decode_csv_base64,
    get_transformed_features,
    prepare_dataset,
    train_or_use_model,
)


class AnalyzeRequest(BaseModel):
    dataset_base64: str = Field(..., min_length=1)
    target_column: str = Field(..., min_length=1)
    sensitive_attributes: list[str] = Field(..., min_length=1)
    favorable_outcome: str | int | float | bool = 1
    model_base64: str | None = None
    test_size: float = Field(default=0.25, gt=0.05, lt=0.5)
    random_state: int = 42
    top_k_features: int = Field(default=5, ge=3, le=10)


class MitigateRequest(AnalyzeRequest):
    method: str = "reweighing"


app = FastAPI(title="LUMIS.AI ML Backend", version="1.0.0")


def _run_analysis(payload: AnalyzeRequest) -> dict[str, Any]:
    frame = decode_csv_base64(payload.dataset_base64)
    prepared = prepare_dataset(
        frame=frame,
        target_column=payload.target_column,
        sensitive_attributes=payload.sensitive_attributes,
        favorable_outcome=payload.favorable_outcome,
        test_size=payload.test_size,
        random_state=payload.random_state,
    )
    model, predictions = train_or_use_model(prepared, payload.model_base64)
    fairness = compute_fairness_metrics(
        frame=prepared.frame,
        target_binary=prepared.target_binary.rename("label"),
        predictions=predictions,
        sensitive_attributes=payload.sensitive_attributes,
    )
    transformed, feature_names = get_transformed_features(model, prepared.features)
    top_features = compute_top_feature_impacts(
        model=model,
        transformed_features=transformed,
        feature_names=feature_names,
        top_k=payload.top_k_features,
    )

    explanation = build_human_explanation(top_features, fairness["summary"])
    return {
        "rows_analyzed": int(frame.shape[0]),
        "columns_analyzed": int(frame.shape[1]),
        "metrics": fairness,
        "explainability": {
            "top_features": top_features,
            "human_explanation": explanation,
        },
        "bias_detected": fairness["summary"]["bias_detected"],
    }


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/analyze")
def analyze(payload: AnalyzeRequest) -> dict[str, Any]:
    try:
        return _run_analysis(payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Analysis failed: {exc}") from exc


@app.post("/mitigate")
def mitigate(payload: MitigateRequest) -> dict[str, Any]:
    if payload.method.lower() != "reweighing":
        raise HTTPException(
            status_code=400,
            detail="Only 'reweighing' is currently implemented. Adversarial debiasing is scaffolded for future use.",
        )
    try:
        frame = decode_csv_base64(payload.dataset_base64)
        prepared = prepare_dataset(
            frame=frame,
            target_column=payload.target_column,
            sensitive_attributes=payload.sensitive_attributes,
            favorable_outcome=payload.favorable_outcome,
            test_size=payload.test_size,
            random_state=payload.random_state,
        )
        model, predictions_before = train_or_use_model(prepared, payload.model_base64)
        before_metrics = compute_fairness_metrics(
            frame=prepared.frame,
            target_binary=prepared.target_binary.rename("label"),
            predictions=predictions_before,
            sensitive_attributes=payload.sensitive_attributes,
        )
        _, mitigation_result = mitigate_with_reweighing(prepared, model)
        after_metrics = mitigation_result["metrics"]
        return {
            "method": "reweighing",
            "before": before_metrics,
            "after": after_metrics,
            "improved": (
                abs(after_metrics["summary"]["statistical_parity"])
                < abs(before_metrics["summary"]["statistical_parity"])
            ),
        }
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Mitigation failed: {exc}") from exc
