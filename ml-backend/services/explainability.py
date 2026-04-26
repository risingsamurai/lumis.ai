from __future__ import annotations

from typing import Any

import numpy as np
import shap


def compute_top_feature_impacts(
    model: Any,
    transformed_features: np.ndarray,
    feature_names: list[str],
    top_k: int = 5,
) -> list[dict[str, float | str]]:
    sample = transformed_features
    if transformed_features.shape[0] > 300:
        sample = transformed_features[:300]

    estimator = model.named_steps["classifier"] if hasattr(model, "named_steps") else model
    explainer = shap.LinearExplainer(estimator, sample)
    shap_values = explainer.shap_values(sample)

    if isinstance(shap_values, list):
        shap_array = np.asarray(shap_values[1])
    else:
        shap_array = np.asarray(shap_values)

    mean_abs = np.abs(shap_array).mean(axis=0)
    top_idx = np.argsort(mean_abs)[::-1][:top_k]
    return [
        {"feature": feature_names[idx], "impact": float(np.round(mean_abs[idx], 4))}
        for idx in top_idx
    ]


def build_human_explanation(
    top_features: list[dict[str, float | str]],
    fairness_summary: dict[str, Any],
) -> str:
    if not top_features:
        return "No dominant feature-level bias signal was found."

    top_names = ", ".join(str(item["feature"]) for item in top_features[:2])
    spd = fairness_summary["statistical_parity"]
    eod = fairness_summary["equal_opportunity"]
    di = fairness_summary["disparate_impact"]

    return (
        f"Bias signals are driven primarily by {top_names}. "
        f"Current fairness metrics show statistical parity {spd}, equal opportunity {eod}, "
        f"and disparate impact {di}. The model appears to favor the privileged groups "
        f"identified in attribute-level analysis."
    )
