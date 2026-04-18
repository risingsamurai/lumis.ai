# LUMIS.AI ML Backend

## Endpoints

- `GET /health` - service health check
- `POST /analyze` - run full fairness + explainability pipeline
- `POST /mitigate` - apply reweighing mitigation and compare before/after metrics

## Request schema (`/analyze`, `/mitigate`)

```json
{
  "dataset_base64": "<base64 csv string>",
  "target_column": "hired",
  "sensitive_attributes": ["gender"],
  "favorable_outcome": 1,
  "model_base64": null,
  "test_size": 0.25,
  "random_state": 42,
  "top_k_features": 5
}
```

## Run locally

```bash
py -m pip install -r requirements.txt
py -m uvicorn main:app --host 127.0.0.1 --port 8081
```

## Quick validation

```bash
py sample_test.py
```
