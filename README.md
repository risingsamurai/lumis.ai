# LUMIS.AI — AI Fairness & Bias Audit Platform

LUMIS.AI helps teams **detect, measure, explain, and mitigate** unfairness in tabular datasets and model decisions before those systems affect real people. It combines a **React** dashboard with a **FastAPI** ML service that uses **IBM AIF360** for fairness metrics, **SHAP** for explainability, and optional **Google Gemini** for an AI copilot experience.

---

## Problem it solves

Machine learning systems can reproduce or amplify historical bias across hiring, lending, healthcare, and public services. LUMIS.AI provides a structured audit workflow: upload data (or use demo data), run statistical fairness checks, see which features drive outcomes, compare mitigation strategies, and iterate with clear before/after metrics.

---

## Features

| Area | What you get |
|------|----------------|
| **Bias detection** | Statistical parity, equal opportunity, disparate impact (AIF360) |
| **Bias mitigation** | Reweighing preprocessing + retrain with instance weights |
| **Explainability** | SHAP-based top feature impacts |
| **AI Copilot** | Context-aware prompts (Gemini) with quick actions |
| **Demo mode** | One-click hiring demo: loads CSV → calls `/analyze` → dashboard |
| **Firebase-ready** | Auth, Firestore, Storage rules scaffold (configure `.env`) |

---

## Repository layout

```
├── frontend/                 # React + Vite + TypeScript + Tailwind
│   ├── src/
│   │   ├── services/api.ts   # FastAPI client (analyze + mitigate)
│   │   └── store/auditStore.ts
│   └── public/demo-datasets/ # Demo CSVs (including hiring_biased.csv)
├── ml-backend/               # FastAPI + AIF360 + scikit-learn + SHAP
│   ├── main.py
│   └── services/
├── functions/                # Firebase Cloud Functions (optional)
├── firebase.json             # Hosting points to frontend/dist
└── firestore.rules / storage.rules
```

---

## Demo flow (recruiters / judges)

1. **Start the ML backend** (see below) on port `8081` (default in `.env.example`).
2. **Start the frontend** (`cd frontend && pnpm install && pnpm dev`).
3. Open the app → click **Try Demo** (or **Try Demo (Auto Analyze)** on New Audit).
4. The app loads `public/demo-datasets/hiring_biased.csv`, calls **`POST /analyze`**, stores results, and navigates to the **Dashboard**.
5. Open **Audit Report** for charts, SHAP-style top features, mitigation button, and **AI Copilot** with structured context.

---

## Tech stack

| Layer | Stack |
|--------|--------|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Framer Motion, Zustand, Recharts, React Router |
| **Backend** | FastAPI, Uvicorn |
| **ML** | pandas, NumPy, scikit-learn, AIF360, SHAP |
| **Infra** | Firebase (Auth, Firestore, Storage, Hosting), Cloud Run–ready Docker for `ml-backend` |

---

## Setup

### Prerequisites

- **Node.js 20+** and **pnpm** (or npm) for the frontend  
- **Python 3.11+** recommended for `ml-backend`

### 1. ML backend

```bash
cd ml-backend
python -m pip install -r requirements.txt
python -m uvicorn main:app --host 127.0.0.1 --port 8081
```

Health check: `GET http://127.0.0.1:8081/health` → `{"status":"ok"}`

**Analyze** (`POST /analyze`): returns `summary`, `metrics`, `top_features`, `recommendations`, plus `attribute_metrics` and `explanation`.

**Mitigate** (`POST /mitigate`): returns `before` / `after` summaries and metrics.

Quick validation:

```bash
cd ml-backend
python sample_test.py
```

### 2. Frontend

```bash
cd frontend
pnpm install
cp .env.example .env
# Set VITE_ANALYZER_BASE_URL=http://127.0.0.1:8081 (and optional Firebase / Gemini keys)
pnpm dev
```

Production build:

```bash
cd frontend
pnpm run build
```

Output is written to **`frontend/dist/`** (used by Firebase Hosting via `firebase.json`).

### 3. Firebase (optional)

1. Create a Firebase project and enable Auth, Firestore, Storage.  
2. Copy web app config into `frontend/.env`.  
3. Deploy: `firebase deploy` (from repo root, after `frontend` build).

---

## Screenshots

_Add screenshots here for: Landing, Dashboard with bias score, Audit report with metrics and copilot._

---

## License

See [LICENSE](./LICENSE) (MIT).

---

## Version

**v1.0.0** — First demo-ready release with full ML + frontend integration. See git tag `v1.0.0`.
