from __future__ import annotations

import base64
from io import StringIO

import numpy as np
import pandas as pd
from fastapi.testclient import TestClient

from main import app


def _generate_biased_dataset(rows: int = 500) -> pd.DataFrame:
    rng = np.random.default_rng(42)
    gender = rng.choice(["male", "female"], size=rows, p=[0.52, 0.48])
    income = rng.normal(60000, 15000, size=rows).clip(10000, 150000)
    experience = rng.integers(0, 20, size=rows)
    noise = rng.normal(0, 0.1, size=rows)

    # Inject bias: male receives bonus in score.
    raw_score = (income / 100000) + (experience / 20) + (gender == "male") * 0.18 + noise
    hired = (raw_score > 0.95).astype(int)
    return pd.DataFrame(
        {
            "gender": gender,
            "income": income.round(2),
            "experience": experience,
            "hired": hired,
        }
    )


def run_sample() -> None:
    frame = _generate_biased_dataset()
    csv_buf = StringIO()
    frame.to_csv(csv_buf, index=False)
    payload = {
        "dataset_base64": base64.b64encode(csv_buf.getvalue().encode("utf-8")).decode("utf-8"),
        "target_column": "hired",
        "sensitive_attributes": ["gender"],
        "favorable_outcome": 1,
        "top_k_features": 5,
    }

    client = TestClient(app)
    analyze_res = client.post("/analyze", json=payload)
    mitigate_res = client.post("/mitigate", json=payload)

    print("Analyze status:", analyze_res.status_code)
    print(analyze_res.json()["metrics"]["summary"])
    print("Mitigate status:", mitigate_res.status_code)
    print("Before:", mitigate_res.json()["before"]["summary"])
    print("After:", mitigate_res.json()["after"]["summary"])


if __name__ == "__main__":
    run_sample()
