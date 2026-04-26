from __future__ import annotations

import json
import base64
import logging
import gc
from typing import Any
import pandas as pd
import numpy as np
from sklearn.preprocessing import LabelEncoder
from aif360.datasets import BinaryLabelDataset
from aif360.algorithms.preprocessing import Reweighing

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from fastapi.encoders import jsonable_encoder

from services.bias_metrics import compute_fairness_metrics
from services.explainability import build_human_explanation, compute_top_feature_impacts
from services.mitigation import create_mitigated_dataset_csv, mitigate_with_reweighing
from services.model_handler import (
    decode_csv_base64,
    get_transformed_features,
    prepare_dataset,
    train_or_use_model,
)

app = FastAPI(title="LUMIS.AI ML Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["POST", "GET", "OPTIONS"],
    allow_headers=["*"],
)

logger = logging.getLogger("lumis.backend")
logging.basicConfig(level=logging.INFO)


class AnalyzeRequest(BaseModel):
    dataset_base64: str = Field(..., min_length=1)
    target_column: str = Field(..., min_length=1)
    sensitive_attributes: list[str] = Field(..., min_length=1)
    favorable_outcome: Any = Field(default=None)
    label_value: Any = Field(default=None)
    model_base64: str | None = None
    test_size: float = Field(default=0.25, gt=0.05, lt=0.5)
    random_state: int = 42
    top_k_features: int = Field(default=5, ge=3, le=10)

    def get_favorable_outcome(self) -> Any:
        if self.label_value is not None:
            return self.label_value
        if self.favorable_outcome is not None:
            return self.favorable_outcome
        return 1


class MitigateRequest(AnalyzeRequest):
    method: str = "reweighing"


def preprocess_dataframe(df: pd.DataFrame) -> tuple[pd.DataFrame, dict]:
    df = df.copy()
    encoders_map: dict = {}

    for col in list(df.columns):
        if df[col].nunique() > (len(df) * 0.9):
            df.drop(columns=[col], inplace=True)
            print(f"Dropped ID-like column: {col}")

    for col in df.columns:
        if df[col].dtype == object:
            df[col] = df[col].astype(str).str.strip()

        numeric_attempt = pd.to_numeric(df[col], errors='coerce')

        if numeric_attempt.isnull().sum() == 0:
            df[col] = numeric_attempt
        else:
            str_col = df[col].fillna('Unknown').astype(str).str.strip()
            le = LabelEncoder()
            encoded = le.fit_transform(str_col)
            encoders_map[col] = {
                str(cls): int(idx)
                for idx, cls in enumerate(le.classes_)
            }
            df[col] = encoded
            print(f"Encoded '{col}': {encoders_map[col]}")

    df = df.astype(np.float32)
    df = df.replace([np.inf, -np.inf], np.nan).fillna(0)
    return df, encoders_map


def resolve_favorable_outcome(raw_value: Any, target_col: str, encoders_map: dict) -> float:
    raw_str = str(raw_value).strip()

    if target_col in encoders_map:
        mapping = encoders_map[target_col]

        if raw_str in mapping:
            return float(mapping[raw_str])

        for key, val in mapping.items():
            if key.lower() == raw_str.lower():
                return float(val)

        try:
            numeric = float(raw_value)
            int_str = str(int(numeric))
            if int_str in mapping:
                return float(mapping[int_str])
            if numeric in mapping.values():
                return numeric
        except (ValueError, TypeError):
            pass

        fallback = float(max(mapping.values()))
        print(f"WARNING: Could not resolve '{raw_value}' in {mapping}. Using {fallback}.")
        return fallback
    else:
        try:
            return float(raw_value)
        except (ValueError, TypeError):
            return 1.0


def _json_safe(results: Any) -> Any:
    return json.loads(json.dumps(
        results,
        default=lambda x: (
            0 if isinstance(x, float) and (np.isnan(x) or np.isinf(x))
            else float(x) if isinstance(x, (np.float32, np.float64))
            else x
        )
    ))


def _risk_level(bias_detected: bool, bias_score: float) -> str:
    if not bias_detected:
        return "none" if bias_score > 85 else "low"
    if bias_score < 40:
        return "critical"
    if bias_score < 60:
        return "high"
    return "moderate"


def _run_analysis(payload: AnalyzeRequest) -> dict[str, Any]:
    logger.info("analyze:start target=%s sensitive=%s",
                payload.target_column, payload.sensitive_attributes)

    raw_frame = decode_csv_base64(payload.dataset_base64)

    if len(raw_frame) > 40000:
        raw_frame = raw_frame.sample(n=40000, random_state=42).reset_index(drop=True)

    frame, encoders_map = preprocess_dataframe(raw_frame)
    print(f"DEBUG head:\n{frame.head()}")

    if payload.target_column not in frame.columns:
        raise ValueError(
            f"Target column '{payload.target_column}' not found. "
            f"Available columns: {list(frame.columns)}"
        )
    for attr in payload.sensitive_attributes:
        if attr not in frame.columns:
            raise ValueError(
                f"Sensitive attribute '{attr}' not found. "
                f"Available columns: {list(frame.columns)}"
            )

    raw_outcome = payload.get_favorable_outcome()
    numeric_outcome = resolve_favorable_outcome(raw_outcome, payload.target_column, encoders_map)
    print(f"DEBUG: raw='{raw_outcome}' resolved={numeric_outcome}")

    prepared = prepare_dataset(
        frame=frame,
        target_column=payload.target_column,
        sensitive_attributes=payload.sensitive_attributes,
        favorable_outcome=float(numeric_outcome),
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
    summary_metrics = fairness["summary"]

    bias_score = max(0.0, min(100.0, (1 - abs(summary_metrics["statistical_parity"])) * 100))
    risk = _risk_level(summary_metrics["bias_detected"], float(bias_score))

    return {
        "summary": {
            "bias_score": round(float(bias_score), 2),
            "risk_level": risk,
            "bias_detected": summary_metrics["bias_detected"],
            "rows_analyzed": int(frame.shape[0]),
            "columns_analyzed": int(frame.shape[1]),
        },
        "metrics": {
            "statistical_parity": float(summary_metrics["statistical_parity"]),
            "equal_opportunity": float(summary_metrics["equal_opportunity"]),
            "disparate_impact": float(summary_metrics["disparate_impact"]),
        },
        "top_features": top_features,
        "recommendations": [
            "Apply reweighing to reduce representation imbalance.",
            "Review top proxy-like features and remove or regularize them.",
            "Audit decision threshold by protected groups and recalibrate.",
        ],
        "attribute_metrics": fairness["by_attribute"],
        "explanation": explanation,
    }


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/analyze")
def analyze(payload: AnalyzeRequest) -> JSONResponse:
    try:
        results = _run_analysis(payload)
        return JSONResponse(content=jsonable_encoder(_json_safe(results)))
    except ValueError as exc:
        logger.warning(f"Validation: {exc}")
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        logger.error(f"Analysis error: {exc}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {exc}")


@app.post("/mitigate")
async def mitigate(payload: MitigateRequest) -> JSONResponse:
    try:
        logger.info("mitigate:start method=%s", payload.method)

        raw_frame = decode_csv_base64(payload.dataset_base64)

        if len(raw_frame) > 40000:
            raw_frame = raw_frame.sample(n=40000, random_state=42).reset_index(drop=True)

        frame, encoders_map = preprocess_dataframe(raw_frame)

        if payload.target_column not in frame.columns:
            raise ValueError(f"Target column '{payload.target_column}' not found. Available: {list(frame.columns)}")
        for attr in payload.sensitive_attributes:
            if attr not in frame.columns:
                raise ValueError(f"Sensitive attribute '{attr}' not found. Available: {list(frame.columns)}")

        raw_outcome = payload.get_favorable_outcome()
        numeric_outcome = resolve_favorable_outcome(raw_outcome, payload.target_column, encoders_map)

        prepared = prepare_dataset(
            frame=frame,
            target_column=payload.target_column,
            sensitive_attributes=payload.sensitive_attributes,
            favorable_outcome=float(numeric_outcome),
            test_size=payload.test_size,
            random_state=payload.random_state,
        )

        model, predictions_before = train_or_use_model(prepared, payload.model_base64)
        before_fairness = compute_fairness_metrics(
            frame=prepared.frame,
            target_binary=prepared.target_binary.rename("label"),
            predictions=predictions_before,
            sensitive_attributes=payload.sensitive_attributes,
        )

        mitigated_predictions, mitigation_result = mitigate_with_reweighing(prepared, model)
        mitigated_dataset_csv = create_mitigated_dataset_csv(prepared, mitigated_predictions)

        del frame
        gc.collect()

        after_metrics = mitigation_result["metrics"]
        before_summary = before_fairness["summary"]
        after_summary = after_metrics["summary"]

        before_score = max(0.0, min(100.0, (1 - abs(before_summary["statistical_parity"])) * 100))
        after_score = max(0.0, min(100.0, (1 - abs(after_summary["statistical_parity"])) * 100))

        results = {
            "method": payload.method,
            "before": {
                "summary": {
                    "bias_score": round(float(before_score), 2),
                    "bias_detected": before_summary["bias_detected"],
                    "risk_level": _risk_level(before_summary["bias_detected"], float(before_score)),
                },
                "metrics": {k: float(v) if isinstance(v, (int, float, np.number)) else v for k, v in before_summary.items()},
            },
            "after": {
                "summary": {
                    "bias_score": round(float(after_score), 2),
                    "bias_detected": after_summary["bias_detected"],
                    "risk_level": _risk_level(after_summary["bias_detected"], float(after_score)),
                },
                "metrics": {k: float(v) if isinstance(v, (int, float, np.number)) else v for k, v in after_summary.items()},
            },
            "improved": after_score > before_score,
            "mitigated_dataset_csv": mitigated_dataset_csv,
            "mitigated_dataset_base64": base64.b64encode(mitigated_dataset_csv.encode()).decode(),
        }

        return JSONResponse(content=jsonable_encoder(_json_safe(results)))

    except ValueError as exc:
        logger.warning(f"Validation: {exc}")
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        logger.error(f"Mitigation error: {exc}")
        raise HTTPException(status_code=500, detail=f"Mitigation failed: {exc}")


@app.exception_handler(HTTPException)
async def http_exception_handler(_: Request, exc: HTTPException) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content={"error": str(exc.detail)})


@app.exception_handler(ValueError)
async def value_exception_handler(_: Request, exc: ValueError) -> JSONResponse:
    return JSONResponse(
        status_code=400,
        content={"error": str(exc), "trace": "Check target/sensitive column names match CSV headers"}
    )