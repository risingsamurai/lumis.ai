# LUMIS.AI ML Backend

FastAPI service for fairness auditing: **AIF360** metrics, **SHAP** feature impacts, **reweighing** mitigation.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| POST | `/analyze` | Full pipeline: train baseline (or use uploaded model), metrics, top features, recommendations |
| POST | `/mitigate` | Reweighing + retrain; returns before vs after |

## Request body (`/analyze`, `/mitigate`)

```json
{
  "dataset_base64": "<base64-encoded CSV>",
  "target_column": "selected",
  "sensitive_attributes": ["gender"],
  "favorable_outcome": 1,
  "model_base64": null,
  "test_size": 0.25,
  "random_state": 42,
  "top_k_features": 5
}
```

For `/mitigate`, add `"method": "reweighing"`.

## Run locally

```bash
cd ml-backend
python -m pip install -r requirements.txt
python -m uvicorn main:app --host 127.0.0.1 --port 8081
```

### Windows (when `pip` / `uvicorn` are “not recognized”)

Python’s **Scripts** folder is often missing from `PATH`. Use the **`py`** launcher instead of bare `pip` / `uvicorn`:

```powershell
cd ml-backend
py -m pip install -r requirements.txt
py -m uvicorn main:app --host 127.0.0.1 --port 8081
```

Or run the helper script (same as above, default port **8081**):

```powershell
cd ml-backend
powershell -ExecutionPolicy Bypass -File .\run.ps1
```

If you see **“address already in use”** (WinError 10048), something else is using that port—stop that process or use another port:

```powershell
py -m uvicorn main:app --host 127.0.0.1 --port 8082
```

Point the frontend at this base URL (no path suffix), e.g. `VITE_ANALYZER_BASE_URL=http://127.0.0.1:8081` (or **8082** if you switched ports).

## Quick validation

```bash
cd ml-backend
python sample_test.py
```

## Docker (Cloud Run)

```bash
cd ml-backend
docker build -t lumis-ml-backend .
docker run -p 8081:8080 lumis-ml-backend
```

(Uvicorn in Dockerfile listens on `8080` inside the container; map host `8081` as needed.)
