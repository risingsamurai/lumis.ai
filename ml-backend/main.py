from __future__ import annotations

import logging
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

from services.bias_metrics import compute_fairness_metrics
from services.explainability import build_human_explanation, compute_top_feature_impacts
from services.mitigation import mitigate_with_reweighing
from services.model_handler import (
    decode_csv_base64,
    get_transformed_features,
    prepare_dataset,
    train_or_use_model,
)

# --- App Setup ---
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

# --- Request Models ---
class AnalyzeRequest(BaseModel):
    dataset_base64: str = Field(..., min_length=1)
    target_column: str = Field(..., min_length=1)
    sensitive_attributes: list[str] = Field(..., min_length=1)
    favorable_outcome: Any = Field(default=1)
    model_base64: str | None = None
    test_size: float = Field(default=0.25, gt=0.05, lt=0.5)
    random_state: int = 42
    top_k_features: int = Field(default=5, ge=3, le=10)

class MitigateRequest(AnalyzeRequest):
    method: str = "reweighing"

# --- Preprocessing Logic ---
def preprocess_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """Converts EVERYTHING to numbers to ensure AIF360/SHAP compatibility."""
    df = df.copy()
    
    # 1. Fill missing values immediately
    df = df.fillna(0)
    
    # 2. Encode all text/object columns to numbers
    le = LabelEncoder()
    for col in df.columns:
        if df[col].dtype == 'object' or df[col].dtype.name == 'category':
            df[col] = le.fit_transform(df[col].astype(str))
            
    # 3. Force all values to float64 for math operations
    return df.astype(np.float64)

def _risk_level(bias_detected: bool, bias_score: float) -> str:
    if not bias_detected:
        return "none" if bias_score > 85 else "low"
    if bias_score < 40:
        return "critical"
    if bias_score < 60:
        return "high"
    return "moderate"

# --- Analysis Logic ---
def _run_analysis(payload: AnalyzeRequest) -> dict[str, Any]:
    logger.info("analyze:start target=%s sensitive=%s", payload.target_column, payload.sensitive_attributes)
    
    # Load and Preprocess
    raw_frame = decode_csv_base64(payload.dataset_base64)
    frame = preprocess_dataframe(raw_frame)

    prepared = prepare_dataset(
        frame=frame,
        target_column=payload.target_column,
        sensitive_attributes=payload.sensitive_attributes,
        favorable_outcome=payload.favorable_outcome,
        test_size=payload.test_size,
        random_state=payload.random_state,
    )

    logger.info("analyze:model_training_start rows=%s", len(frame))
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
    
    # Fairness Score Logic (0-100)
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
            "statistical_parity": summary_metrics["statistical_parity"],
            "equal_opportunity": summary_metrics["equal_opportunity"],
            "disparate_impact": summary_metrics["disparate_impact"],
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

# --- Routes ---
@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}

@app.post("/analyze")
def analyze(payload: AnalyzeRequest) -> dict[str, Any]:
    try:
        return _run_analysis(payload)
    except Exception as exc:
        logger.error(f"Analysis Error: {exc}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {exc}")

@app.post("/mitigate")
async def mitigate(payload: MitigateRequest):
    try:
        print(f"DEBUG: Received payload: {payload}")
        logger.info("mitigate:start method=%s", payload.method)
        
        # Load and Preprocess
        raw_frame = decode_csv_base64(payload.dataset_base64)
        frame = preprocess_dataframe(raw_frame)

        prepared = prepare_dataset(
            frame=frame,
            target_column=payload.target_column,
            sensitive_attributes=payload.sensitive_attributes,
            favorable_outcome=payload.favorable_outcome,
            test_size=payload.test_size,
            random_state=payload.random_state,
        )

        # Get Before State
        model, predictions_before = train_or_use_model(prepared, payload.model_base64)
        before_fairness = compute_fairness_metrics(
            frame=prepared.frame,
            target_binary=prepared.target_binary.rename("label"),
            predictions=predictions_before,
            sensitive_attributes=payload.sensitive_attributes,
        )

        # Apply Mitigation
        logger.info("mitigate:reweighing_start")
        _, mitigation_result = mitigate_with_reweighing(prepared, model)
        
        after_metrics = mitigation_result["metrics"]
        before_summary = before_fairness["summary"]
        after_summary = after_metrics["summary"]

        # Calculate Scores
        before_score = max(0.0, min(100.0, (1 - abs(before_summary["statistical_parity"])) * 100))
        after_score = max(0.0, min(100.0, (1 - abs(after_summary["statistical_parity"])) * 100))
        
        return {
            "method": payload.method,
            "before": {
                "summary": {
                    "bias_score": round(float(before_score), 2),
                    "bias_detected": before_summary["bias_detected"],
                    "risk_level": _risk_level(before_summary["bias_detected"], float(before_score)),
                },
                "metrics": before_summary
            },
            "after": {
                "summary": {
                    "bias_score": round(float(after_score), 2),
                    "bias_detected": after_summary["bias_detected"],
                    "risk_level": _risk_level(after_summary["bias_detected"], float(after_score)),
                },
                "metrics": after_summary
            },
            "improved": after_score > before_score,
        }

    except Exception as exc:
        logger.error(f"Mitigation Error: {exc}")
        raise HTTPException(status_code=500, detail=f"Mitigation failed: {exc}")

# --- Global Handlers ---
@app.exception_handler(HTTPException)
async def http_exception_handler(_: Request, exc: HTTPException) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content={"error": str(exc.detail)})

@app.exception_handler(ValueError)
async def value_exception_handler(_: Request, exc: ValueError) -> JSONResponse:
    return JSONResponse(status_code=400, content={"error": str(exc), "trace": "Check if target/sensitive columns exist in CSV"})