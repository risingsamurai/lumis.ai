from __future__ import annotations

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
    rw_frame[sensitive_attribute] = (
        prepared.frame[sensitive_attribute].astype(str) == str(privileged)
    ).astype(int)
    rw_frame["label"] = prepared.target_binary.to_numpy()

    dataset = BinaryLabelDataset(
        favorable_label=1,
        unfavorable_label=0,
        df=rw_frame,
        label_names=["label"],
        protected_attribute_names=[sensitive_attribute],
    )
    return dataset, privileged


def mitigate_with_reweighing(
    prepared: PreparedDataset, trained_model: Any
) -> tuple[np.ndarray, dict[str, Any]]:
    # Reweighing in AIF360 is applied per protected attribute.
    sample_weight = np.ones(len(prepared.features), dtype=float)
    privileged_map: dict[str, str] = {}

    for attribute in prepared.sensitive_attributes:
        dataset, privileged = _binary_dataset_for_reweighing(prepared, attribute)
        rw = Reweighing(
            unprivileged_groups=[{attribute: 0}],
            privileged_groups=[{attribute: 1}],
        )
        transformed = rw.fit_transform(dataset)
        sample_weight = sample_weight * transformed.instance_weights
        privileged_map[attribute] = str(privileged)

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
