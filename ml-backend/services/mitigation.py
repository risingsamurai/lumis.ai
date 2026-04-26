from __future__ import annotations

import base64
import io
from copy import deepcopy
from typing import Any

import numpy as np
import pandas as pd
from aif360.algorithms.preprocessing import Reweighing
from aif360.datasets import BinaryLabelDataset
from sklearn.base import clone

from .bias_metrics import compute_fairness_metrics
from .model_handler import PreparedDataset


def _privileged_value(frame: pd.DataFrame, attribute: str, target_binary: pd.Series) -> Any:
    temp = pd.DataFrame({attribute: frame[attribute], "label": target_binary})
    return temp.groupby(attribute)["label"].mean().idxmax()


def _binary_dataset_for_reweighing(
    prepared: PreparedDataset, sensitive_attribute: str
) -> tuple[BinaryLabelDataset, Any]:
    privileged = _privileged_value(prepared.frame, sensitive_attribute, prepared.target_binary)
    rw_frame = prepared.features.copy()
    # Data is already pre-encoded as numerical, so compare numerically
    rw_frame[sensitive_attribute] = (
        prepared.frame[sensitive_attribute].astype(float) == float(privileged)
    ).astype(int)
    rw_frame["label"] = prepared.target_binary.to_numpy()

    # Ensure no NaNs in the dataframe before creating BinaryLabelDataset
    if rw_frame.isna().any().any():
        raise ValueError("DataFrame contains NaN values. All values must be numerical and non-NaN.")

    # Log column dtypes for debugging
    print(f"DEBUG: rw_frame dtypes for attribute '{sensitive_attribute}':")
    print(rw_frame.dtypes)
    print(f"DEBUG: rw_frame sample:")
    print(rw_frame.head())
    for col in rw_frame.columns:
        if rw_frame[col].dtype not in [np.float64, np.int64, np.int32, np.float32]:
            raise ValueError(f"Column '{col}' has non-numerical dtype: {rw_frame[col].dtype}. All columns must be numerical.")

    try:
        dataset = BinaryLabelDataset(
            favorable_label=1.0,
            unfavorable_label=0.0,
            df=rw_frame,
            label_names=["label"],
            protected_attribute_names=[sensitive_attribute],
        )
    except Exception as exc:
        raise ValueError(
            f"BinaryLabelDataset creation failed for attribute '{sensitive_attribute}'. "
            f"Column dtypes: {rw_frame.dtypes.to_dict()}. "
            f"Error: {exc}"
        ) from exc
    return dataset, privileged


def mitigate_with_reweighing(
    prepared: PreparedDataset, trained_model: Any
) -> tuple[np.ndarray, dict[str, Any]]:
    # Reweighing in AIF360 is applied per protected attribute.
    sample_weight = np.ones(len(prepared.features), dtype=float)
    privileged_map: dict[str, float] = {}

    for attribute in prepared.sensitive_attributes:
        dataset, privileged = _binary_dataset_for_reweighing(prepared, attribute)
        rw = Reweighing(
            unprivileged_groups=[{attribute: 0.0}],
            privileged_groups=[{attribute: 1.0}],
        )
        try:
            transformed = rw.fit_transform(dataset)
        except Exception as exc:
            raise ValueError(
                f"AIF360 Reweighing failed: {exc}. "
                f"This may be due to non-numerical data in the dataset. "
                f"Ensure all columns are converted to numerical values before calling this function."
            ) from exc
        sample_weight = sample_weight * transformed.instance_weights
        # Safety cap to prevent 'Out of Range' errors from extremely small subgroups
        sample_weight = np.clip(sample_weight, 0.1, 10.0)
        privileged_map[attribute] = float(privileged)

    try:
        model = clone(trained_model)
    except Exception:  # noqa: BLE001
        model = deepcopy(trained_model)
    try:
        model.fit(prepared.features, prepared.target_binary, classifier__sample_weight=sample_weight)
    except TypeError:
        model.fit(prepared.features, prepared.target_binary, sample_weight=sample_weight)
    mitigated_predictions = model.predict(prepared.features).astype(int)
    metrics_after = compute_fairness_metrics(
        frame=prepared.frame,
        target_binary=prepared.target_binary,
        predictions=mitigated_predictions,
        sensitive_attributes=prepared.sensitive_attributes,
    )
    return mitigated_predictions, {"metrics": metrics_after, "privileged_map": privileged_map}


def create_mitigated_dataset_csv(
    prepared: PreparedDataset, mitigated_predictions: np.ndarray
) -> str:
    """Create a CSV string of the original dataframe with mitigated predictions."""
    mitigated_frame = prepared.frame.copy()
    mitigated_frame["mitigated_prediction"] = mitigated_predictions
    csv_buffer = io.StringIO()
    mitigated_frame.to_csv(csv_buffer, index=False)
    # Ensure JSON compatibility by encoding/decoding UTF-8
    return csv_buffer.getvalue().encode('utf-8').decode('utf-8')
