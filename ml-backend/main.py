from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
from __future__ import annotations

import logging
from typing import Any

<<<<<<< HEAD
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
=======
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
>>>>>>> 1c67a710f11c6b7e969d5418235ba1d51b2a50a5
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
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="LUMIS.AI ML Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # your React app
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# ✅ Create app
app = FastAPI(title="LUMIS.AI ML Backend", version="1.0.0")

# ✅ ADD CORS HERE (IMPORTANT FIX)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # allow frontend (localhost:5173)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------- MODELS ---------------- #

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


<<<<<<< HEAD
# ---------------- CORE LOGIC ---------------- #
=======
app = FastAPI(title="LUMIS.AI ML Backend", version="1.0.0")
logger = logging.getLogger("lumis.backend")
logging.basicConfig(level=logging.INFO)


def _risk_level(bias_detected: bool, bias_score: float) -> str:
    if not bias_detected:
        return "low"
    if bias_score < 60:
        return "high"
    return "medium"

>>>>>>> 1c67a710f11c6b7e969d5418235ba1d51b2a50a5

def _run_analysis(payload: AnalyzeRequest) -> dict[str, Any]:
    logger.info("analyze:start target=%s sensitive=%s", payload.target_column, payload.sensitive_attributes)
    frame = decode_csv_base64(payload.dataset_base64)

    prepared = prepare_dataset(
        frame=frame,
        target_column=payload.target_column,
        sensitive_attributes=payload.sensitive_attributes,
        favorable_outcome=payload.favorable_outcome,
        test_size=payload.test_size,
        random_state=payload.random_state,
    )
<<<<<<< HEAD

    model, predictions = train_or_use_model(prepared, payload.model_base64)

=======
    logger.info("analyze:model_training_start rows=%s", len(frame))
    model, predictions = train_or_use_model(prepared, payload.model_base64)
    logger.info("analyze:model_training_end")
>>>>>>> 1c67a710f11c6b7e969d5418235ba1d51b2a50a5
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
<<<<<<< HEAD

=======
    summary_metrics = fairness["summary"]
    bias_score = max(0.0, min(100.0, (1 - abs(summary_metrics["statistical_parity"])) * 100))
    risk_level = _risk_level(summary_metrics["bias_detected"], float(bias_score))
    recommendations = [
        "Apply reweighing to reduce representation imbalance.",
        "Review top proxy-like features and remove or regularize them.",
        "Audit decision threshold by protected groups and recalibrate.",
    ]

    logger.info(
        "analyze:end bias_detected=%s bias_score=%.2f", summary_metrics["bias_detected"], bias_score
    )
>>>>>>> 1c67a710f11c6b7e969d5418235ba1d51b2a50a5
    return {
        "summary": {
            "bias_score": round(float(bias_score), 2),
            "risk_level": risk_level,
            "bias_detected": summary_metrics["bias_detected"],
            "rows_analyzed": int(frame.shape[0]),
            "columns_analyzed": int(frame.shape[1]),
        },
        "metrics": {
            "statistical_parity": summary_metrics["statistical_parity"],
            "equal_opportunity": summary_metrics["equal_opportunity"],
            "disparate_impact": summary_metrics["disparate_impact"],
        },
        "top_features": top_features,
        "recommendations": recommendations,
        "attribute_metrics": fairness["by_attribute"],
        "explanation": explanation,
    }


# ---------------- ROUTES ---------------- #

@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.exception_handler(HTTPException)
async def http_exception_handler(_: Request, exc: HTTPException) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content={"error": str(exc.detail)})


@app.exception_handler(ValueError)
async def value_exception_handler(_: Request, exc: ValueError) -> JSONResponse:
    return JSONResponse(status_code=400, content={"error": str(exc)})


@app.post("/analyze")
def analyze(payload: AnalyzeRequest) -> dict[str, Any]:
    try:
        return _run_analysis(payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {exc}") from exc


@app.post("/mitigate")
def mitigate(payload: MitigateRequest) -> dict[str, Any]:
    if payload.method.lower() != "reweighing":
        raise HTTPException(
            status_code=400,
            detail="Only 'reweighing' is currently implemented.",
        )

    try:
        logger.info("mitigate:start method=%s", payload.method.lower())
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
<<<<<<< HEAD

        _, mitigation_result = mitigate_with_reweighing(prepared, model)

        after_metrics = mitigation_result["metrics"]

=======
        logger.info("mitigate:reweighing_start")
        _, mitigation_result = mitigate_with_reweighing(prepared, model)
        logger.info("mitigate:reweighing_end")
        after_metrics = mitigation_result["metrics"]
        before_summary = before_metrics["summary"]
        after_summary = after_metrics["summary"]
        before_score = max(0.0, min(100.0, (1 - abs(before_summary["statistical_parity"])) * 100))
        after_score = max(0.0, min(100.0, (1 - abs(after_summary["statistical_parity"])) * 100))
        logger.info("mitigate:end improved=%s", after_score > before_score)
>>>>>>> 1c67a710f11c6b7e969d5418235ba1d51b2a50a5
        return {
            "method": "reweighing",
            "before": {
                "summary": {
                    "bias_score": round(float(before_score), 2),
                    "bias_detected": before_summary["bias_detected"],
                    "risk_level": _risk_level(before_summary["bias_detected"], float(before_score)),
                },
                "metrics": {
                    "statistical_parity": before_summary["statistical_parity"],
                    "equal_opportunity": before_summary["equal_opportunity"],
                    "disparate_impact": before_summary["disparate_impact"],
                },
            },
            "after": {
                "summary": {
                    "bias_score": round(float(after_score), 2),
                    "bias_detected": after_summary["bias_detected"],
                    "risk_level": _risk_level(after_summary["bias_detected"], float(after_score)),
                },
                "metrics": {
                    "statistical_parity": after_summary["statistical_parity"],
                    "equal_opportunity": after_summary["equal_opportunity"],
                    "disparate_impact": after_summary["disparate_impact"],
                },
            },
            "improved": after_score > before_score,
        }

    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Mitigation failed: {exc}") from exc