from __future__ import annotations

import base64
import io
import pickle
from dataclasses import dataclass
from typing import Any

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder


@dataclass
class PreparedDataset:
    frame: pd.DataFrame
    features: pd.DataFrame
    target_binary: pd.Series
    X_train: pd.DataFrame
    X_test: pd.DataFrame
    y_train: pd.Series
    y_test: pd.Series
    feature_columns: list[str]
    sensitive_attributes: list[str]


def decode_csv_base64(dataset_base64: str) -> pd.DataFrame:
    try:
        csv_bytes = base64.b64decode(dataset_base64)
    except Exception as exc:  # noqa: BLE001
        raise ValueError("Invalid base64 dataset payload.") from exc

    try:
        frame = pd.read_csv(io.BytesIO(csv_bytes))
    except Exception as exc:  # noqa: BLE001
        raise ValueError("Dataset payload is not a valid CSV file.") from exc

    if frame.empty:
        raise ValueError("Dataset is empty.")
    return frame


def _to_binary_target(target: pd.Series, favorable_outcome: Any) -> pd.Series:
    # Fairness metrics use binary labels where favorable outcome is 1.
    binary = (target.astype(str) == str(favorable_outcome)).astype(int)
    if binary.nunique() < 2:
        raise ValueError("Target became single-class after favorable_outcome mapping.")
    return binary


def validate_columns(frame: pd.DataFrame, target_column: str, sensitive_attributes: list[str]) -> None:
    if target_column not in frame.columns:
        raise ValueError(f"Target column '{target_column}' not found in dataset.")

    missing_sensitive = [attr for attr in sensitive_attributes if attr not in frame.columns]
    if missing_sensitive:
        missing = ", ".join(missing_sensitive)
        raise ValueError(f"Sensitive attribute(s) missing from dataset: {missing}")

    if len(sensitive_attributes) == 0:
        raise ValueError("At least one sensitive attribute is required.")


def prepare_dataset(
    frame: pd.DataFrame,
    target_column: str,
    sensitive_attributes: list[str],
    favorable_outcome: Any,
    test_size: float = 0.25,
    random_state: int = 42,
) -> PreparedDataset:
    validate_columns(frame, target_column, sensitive_attributes)

    target_binary = _to_binary_target(frame[target_column], favorable_outcome)
    features = frame.drop(columns=[target_column]).copy()

    X_train, X_test, y_train, y_test = train_test_split(
        features, target_binary, test_size=test_size, random_state=random_state, stratify=target_binary
    )

    return PreparedDataset(
        frame=frame.copy(),
        features=features,
        target_binary=target_binary,
        X_train=X_train,
        X_test=X_test,
        y_train=y_train,
        y_test=y_test,
        feature_columns=list(features.columns),
        sensitive_attributes=sensitive_attributes,
    )


def build_baseline_model(input_frame: pd.DataFrame) -> Pipeline:
    categorical_cols = input_frame.select_dtypes(include=["object", "category", "bool"]).columns.tolist()
    numeric_cols = [col for col in input_frame.columns if col not in categorical_cols]

    preprocessor = ColumnTransformer(
        transformers=[
            ("categorical", OneHotEncoder(handle_unknown="ignore"), categorical_cols),
            ("numeric", "passthrough", numeric_cols),
        ]
    )

    model = Pipeline(
        steps=[
            ("preprocessor", preprocessor),
            ("classifier", LogisticRegression(max_iter=1000, solver="lbfgs")),
        ]
    )
    return model


def load_pickled_model(model_base64: str) -> Any:
    try:
        model_bytes = base64.b64decode(model_base64)
        return pickle.loads(model_bytes)
    except Exception as exc:  # noqa: BLE001
        raise ValueError("Unable to decode/load uploaded model pickle.") from exc


def train_or_use_model(prepared: PreparedDataset, model_base64: str | None = None) -> tuple[Any, np.ndarray]:
    model = load_pickled_model(model_base64) if model_base64 else build_baseline_model(prepared.X_train)
    if model_base64:
        try:
            predictions = model.predict(prepared.features)
            return model, np.asarray(predictions).astype(int)
        except Exception:  # noqa: BLE001
            if not hasattr(model, "fit"):
                raise ValueError("Uploaded model is not compatible: missing predict/fit methods.")
    model.fit(prepared.X_train, prepared.y_train)
    predictions = model.predict(prepared.features)
    return model, predictions.astype(int)


def get_transformed_features(model: Any, X: pd.DataFrame) -> tuple[np.ndarray, list[str]]:
    if not isinstance(model, Pipeline):
        arr = X.to_numpy()
        return arr, list(X.columns)

    preprocessor = model.named_steps["preprocessor"]
    transformed = preprocessor.transform(X)
    if hasattr(transformed, "toarray"):
        transformed = transformed.toarray()

    try:
        feature_names = preprocessor.get_feature_names_out().tolist()
    except Exception:  # noqa: BLE001
        feature_names = [f"feature_{i}" for i in range(transformed.shape[1])]
    return np.asarray(transformed), feature_names
