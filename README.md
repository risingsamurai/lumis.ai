<div align="center">

# LUMIS.AI

### AI Fairness & Bias Audit Platform

**Detect. Explain. Mitigate. Deploy with confidence.**

[![FastAPI](https://img.shields.io/badge/FastAPI-0.110-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![Firebase](https://img.shields.io/badge/Firebase-ready-FFCA28?style=flat-square&logo=firebase&logoColor=black)](https://firebase.google.com)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

[**Live Demo**](#demo-flow) · [**Quick Start**](#setup) · [**API Docs**](#api-reference) · [**Report a Bug**](issues)

</div>

---

## Overview

Machine learning systems routinely reproduce and amplify historical bias — silently shaping decisions in hiring, lending, healthcare, and public services. Most teams discover this problem too late, if at all.

**LUMIS.AI** gives you a structured, repeatable audit workflow:

1. Upload your dataset (or use built-in demo data)
2. Run statistical fairness checks powered by IBM AIF360
3. Visualize which features drive biased outcomes via SHAP
4. Compare mitigation strategies side-by-side
5. Iterate with clear before/after metrics before deployment

All wrapped in a clean React dashboard with an optional AI Copilot powered by Google Gemini.

---

## Features

| Area | What You Get |
|------|-------------|
| **Bias Detection** | Statistical parity, equal opportunity, and disparate impact via AIF360 |
| **Bias Mitigation** | Reweighing preprocessing + retrain with instance weights |
| **Explainability** | SHAP-based top feature impact breakdown |
| **AI Copilot** | Context-aware Gemini prompts with quick-action suggestions |
| **Demo Mode** | One-click hiring demo — loads CSV → calls `/analyze` → full dashboard |
| **Firebase-Ready** | Auth, Firestore, and Storage rules scaffold included |

---

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Framer Motion, Zustand, Recharts, React Router |
| **Backend** | FastAPI, Uvicorn |
| **ML / AI** | pandas, NumPy, scikit-learn, AIF360, SHAP, Google Gemini (optional) |
| **Infrastructure** | Firebase (Auth, Firestore, Storage, Hosting), Cloud Run–ready Docker |

---

## Project Structure

```
lumis-ai/
├── frontend/                       # React + Vite + TypeScript + Tailwind
│   ├── src/
│   │   ├── services/api.ts          # FastAPI client (analyze + mitigate)
│   │   └── store/auditStore.ts      # Zustand global state
│   └── public/demo-datasets/        # Demo CSVs (hiring_biased.csv, etc.)
│
├── ml-backend/                     # FastAPI + AIF360 + scikit-learn + SHAP
│   ├── main.py                      # App entrypoint + route definitions
│   └── services/                    # Fairness, mitigation, SHAP modules
│
├── functions/                      # Firebase Cloud Functions (optional)
├── firebase.json                   # Hosting → frontend/dist
├── firestore.rules
└── storage.rules
```

---

## Demo Flow

> For judges and recruiters — get from zero to results in under 2 minutes.

1. Start the ML backend on port `8081` (see [Setup](#setup) below).
2. Start the frontend dev server.
3. Open the app and click **Try Demo** (or **Try Demo — Auto Analyze** on the New Audit screen).
4. The app loads `hiring_biased.csv`, calls `POST /analyze`, stores the results, and navigates directly to the Dashboard.
5. From the Audit Report you'll see:
   - Fairness metric charts (statistical parity, disparate impact, equal opportunity)
   - SHAP-style top features driving biased outcomes
   - A **Mitigate** button to run reweighing and compare before/after
   - The AI Copilot panel with structured context and quick actions

---

## Setup

### Prerequisites

- **Node.js** 20+ with [pnpm](https://pnpm.io) (or npm)
- **Python** 3.11+ for the ML backend

---

### 1 · ML Backend

```bash
cd ml-backend
pip install -r requirements.txt
uvicorn main:app --host 127.0.0.1 --port 8081
```

Verify it's running:

```bash
curl http://127.0.0.1:8081/health
# → {"status":"ok"}
```

Run the quick validation suite:

```bash
python sample_test.py
```

---

### 2 · Frontend

```bash
cd frontend
pnpm install
cp .env.example .env
```

Open `.env` and set at minimum:

```env
VITE_ANALYZER_BASE_URL=http://127.0.0.1:8081
# Optional — add Firebase + Gemini keys for full feature set
```

Start the dev server:

```bash
pnpm dev
```

Build for production:

```bash
pnpm run build
# Output → frontend/dist/  (consumed by Firebase Hosting)
```

---

### 3 · Firebase (Optional)

1. Create a Firebase project and enable **Auth**, **Firestore**, and **Storage**.
2. Copy the web app config values into `frontend/.env`.
3. Build the frontend, then deploy everything from the repo root:

```bash
firebase deploy
```

---

## API Reference

### `POST /analyze`

Runs full fairness analysis on an uploaded dataset.

**Returns:** `summary`, `metrics`, `top_features`, `recommendations`, `attribute_metrics`, `explanation`

---

### `POST /mitigate`

Applies reweighing mitigation and retrains the model.

**Returns:** `before` and `after` summaries + metrics for direct comparison

---

### `GET /health`

```json
{ "status": "ok" }
```

---

## Roadmap

- [ ] Support for additional AIF360 mitigation algorithms (Equalized Odds, Prejudice Remover)
- [ ] Model upload support (`.pkl`, `.joblib`) alongside datasets
- [ ] Multi-attribute intersectional bias analysis
- [ ] PDF audit report export
- [ ] Scheduled re-audit with drift detection alerts
- [ ] LLM bias detection module

---

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you'd like to change.

1. Fork the repository
2. Create your branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'feat: add your feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

---

## License

This project is licensed under the [MIT License](LICENSE).

---

<div align="center">

Built with ❤️ by **Wagner Sentinel AI**  
*Making AI fair, one audit at a time.*

</div>
