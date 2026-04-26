from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import numpy as np
import pandas as pd
from aif360.datasets import BinaryLabelDataset
from aif360.metrics import BinaryLabelDatasetMetric, ClassificationMetric


@dataclass
class AttributeFairnessResult:
    attribute: str
    statistical_parity: float
    equal_opportunity: float
    disparate_impact: float
    bias_detected: bool
    privileged_group: Any


def _pick_privileged_group(
    frame: pd.DataFrame, attribute: str, target_binary: pd.Series
) -> Any:
    grouped = frame.groupby(attribute)["label"].mean()
    return grouped.idxmax()


def _binary_sensitive(frame: pd.DataFrame, attribute: str, privileged_value: Any) -> pd.Series:
    # Data is already pre-encoded as numerical, so compare numerically
    return (frame[attribute].astype(float) == float(privileged_value)).astype(int)


def _attribute_metrics(
    frame: pd.DataFrame,
    target_binary: pd.Series,
    predictions: np.ndarray,
    attribute: str,
) -> AttributeFairnessResult:
    work = frame.copy()
    work["label"] = target_binary.to_numpy()
    work["prediction"] = predictions

    privileged_value = _pick_privileged_group(work, attribute, target_binary)
    work["sensitive_binary"] = _binary_sensitive(work, attribute, privileged_value)

    # Log column dtypes for debugging
    df_cols = work[["sensitive_binary", "label"]]
    for col in df_cols.columns:
        if df_cols[col].dtype not in [np.float64, np.int64, np.int32, np.float32]:
            raise ValueError(f"Column '{col}' has non-numerical dtype: {df_cols[col].dtype}. All columns must be numerical.")

    try:
        true_dataset = BinaryLabelDataset(
            favorable_label=1.0,
            unfavorable_label=0.0,
            df=df_cols,
            label_names=["label"],
            protected_attribute_names=["sensitive_binary"],
        )
    except Exception as exc:
        raise ValueError(
            f"BinaryLabelDataset creation failed for attribute '{attribute}'. "
            f"Column dtypes: {df_cols.dtypes.to_dict()}. "
            f"Error: {exc}"
        ) from exc

    pred_df = work[["sensitive_binary", "prediction"]].rename(columns={"prediction": "label"})
    for col in pred_df.columns:
        if pred_df[col].dtype not in [np.float64, np.int64, np.int32, np.float32]:
            raise ValueError(f"Column '{col}' has non-numerical dtype: {pred_df[col].dtype}. All columns must be numerical.")

    try:
        pred_dataset = BinaryLabelDataset(
            favorable_label=1.0,
            unfavorable_label=0.0,
            df=pred_df,
            label_names=["label"],
            protected_attribute_names=["sensitive_binary"],
        )
    except Exception as exc:
        raise ValueError(
            f"BinaryLabelDataset creation failed for predictions (attribute '{attribute}'). "
            f"Column dtypes: {pred_df.dtypes.to_dict()}. "
            f"Error: {exc}"
        ) from exc

    metric_pred = BinaryLabelDatasetMetric(
        pred_dataset,
        unprivileged_groups=[{"sensitive_binary": 0}],
        privileged_groups=[{"sensitive_binary": 1}],
    )
    metric_cls = ClassificationMetric(
        true_dataset,
        pred_dataset,
        unprivileged_groups=[{"sensitive_binary": 0}],
        privileged_groups=[{"sensitive_binary": 1}],
    )

    statistical_parity = float(metric_pred.statistical_parity_difference())
    equal_opportunity = float(metric_cls.equal_opportunity_difference())
    disparate_impact = float(metric_pred.disparate_impact())
    bias_detected = (
        abs(statistical_parity) > 0.1 or abs(equal_opportunity) > 0.1 or disparate_impact < 0.8
    )

    return AttributeFairnessResult(
        attribute=attribute,
        statistical_parity=statistical_parity,
        equal_opportunity=equal_opportunity,
        disparate_impact=disparate_impact,
        bias_detected=bias_detected,
        privileged_group=privileged_value,
    )


def compute_fairness_metrics(
    frame: pd.DataFrame,
    target_binary: pd.Series,
    predictions: np.ndarray,
    sensitive_attributes: list[str],
) -> dict[str, Any]:
    per_attribute = []
    for attribute in sensitive_attributes:
        result = _attribute_metrics(frame, target_binary, predictions, attribute)
        per_attribute.append(
            {
                "attribute": result.attribute,
                "statistical_parity": round(result.statistical_parity, 4),
                "equal_opportunity": round(result.equal_opportunity, 4),
                "disparate_impact": round(result.disparate_impact, 4),
                "bias_detected": result.bias_detected,
                "privileged_group": str(result.privileged_group),
            }
        )

    if not per_attribute:
        raise ValueError("Unable to compute fairness metrics for provided sensitive attributes.")

    summary = {
        "statistical_parity": round(float(np.mean([x["statistical_parity"] for x in per_attribute])), 4),
        "equal_opportunity": round(float(np.mean([x["equal_opportunity"] for x in per_attribute])), 4),
        "disparate_impact": round(float(np.mean([x["disparate_impact"] for x in per_attribute])), 4),
        "bias_detected": any(x["bias_detected"] for x in per_attribute),
    }
    return {"summary": summary, "by_attribute": per_attribute}
