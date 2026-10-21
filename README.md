<div align="center">

# Concepcion Smart City

Smart reporting and city operations in one dashboard.

[![React](https://img.shields.io/badge/React-19-61DAFB)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF)](https://vitejs.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6)](https://www.typescriptlang.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-API-009688)](https://fastapi.tiangolo.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres-3ECF8E)](https://supabase.com/)

[**Overview**](#why-this-project) · [**Features**](#features) · [**Setup**](#quick-start) · [**Deploy**](#deployment)

</div>

<!-- <p align="center">
  <img src="https://placehold.co/1200x700/0f172a/ffffff?text=Concepcion+Smart+City+Dashboard" alt="Concepcion Smart City dashboard preview" width="920">
</p> -->

---

Concepcion Smart City is a civic technology prototype that helps residents report infrastructure and public service issues while giving local authorities a centralized, map-based operational view of the city.

The project combines a citizen issue submission flow with a municipal dashboard, enabling faster response times and more transparent communication between the public and city agencies.

## Why this project

Cities increasingly need tools that make public reporting simple, visible, and actionable. This application demonstrates a practical smart-city approach to:

- collecting location-based community issues
- improving public service responsiveness
- enabling municipal review and triage workflows
- visualizing city operations through a 3D digital-twin experience

## Architecture

The repository is split into two independently installable and deployable applications:

- `frontend/` — React, TypeScript, and Vite. It serves the web application and currently connects to Supabase for report data.
- `backend/` — FastAPI service for the citizen assistant, classification, and geocoding.

Each application owns its dependencies and environment configuration. The frontend calls the backend through `VITE_BACKEND_URL`; the backend allows configured browser origins through `BACKEND_CORS_ORIGINS`. Supabase remains the frontend's current report-data provider and can be migrated behind the API separately when needed.

![Concepcion Smart City system architecture](docs/SystemArchitecture-React-FastAPI.png)

## Quick Start

### Prerequisites

- Node.js 18+
- npm
- Python 3.10+
- Supabase project access
- Cesium ion token (recommended for photorealistic map layers)

### 1) Configure and start the frontend

```powershell
cd frontend
npm ci
if (!(Test-Path .env)) { Copy-Item .env.example .env }
npm run dev
```

Set the Supabase URL and anon key in `frontend/.env`, and add a Cesium ion token if using Cesium-backed layers. The backend URL defaults to the local FastAPI service.

If you previously used a repository-root `.env`, move its `VITE_*` values to `frontend/.env` and its `GEMINI_API_KEY` / `BACKEND_CORS_ORIGINS` values to `backend/.env`. Keep both files untracked.

### 2) Configure and start the backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
if (!(Test-Path .env)) { Copy-Item .env.example .env }
uvicorn app.main:app --reload
```

Set `GEMINI_API_KEY` in `backend/.env`. Run the frontend and backend in separate terminals.

## Features

- Citizens can submit issue reports with contact details and descriptions
- Map-based location selection for precise geospatial reporting
- Category-based classification for urban issues
- Urgent escalation option for police-sensitive incidents
- 3D city dashboard for municipal monitoring
- Admin dashboard for reviewing, updating, and deleting reports
- Supabase-powered data persistence and status tracking

## Deployment

Deploy the frontend and backend independently. Frontend commands run from `frontend/` and publish `frontend/dist`; the FastAPI application runs from `backend/`. Configure each service using its own environment variables. The frontend's `VITE_BASE_PATH` defaults to `/`; GitHub Pages sets the repository subpath in its workflow.

### Vercel

1. Push the project to GitHub.
2. Import the repository in Vercel and set the project root to `frontend`.
3. Add the following environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_CESIUM_ION_TOKEN`
   - `VITE_BACKEND_URL`
4. Deploy the app.

### Netlify

1. Connect the repository to Netlify.
2. Set the base directory to `frontend` and the build command to:

```bash
npm run build
```

3. Set the publish directory to:

```bash
dist
```

4. Add `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_CESIUM_ION_TOKEN`, and `VITE_BACKEND_URL` in Netlify project settings.

### Static hosting

The frontend can also be deployed to any static hosting provider that supports Vite builds. Configure `VITE_BASE_PATH` for the deployment path and `VITE_BACKEND_URL` for the deployed API URL.

### GitHub Pages frontend and Render backend

GitHub Pages hosts only the frontend. Deploy the FastAPI service separately to Render:

1. Create a Render Web Service connected to this repository's `main` branch.
2. Set **Root Directory** to `backend`, **Build Command** to `pip install -r requirements.txt`, and **Start Command** to `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
3. Add `GEMINI_API_KEY` to the Render service's environment variables. Set `BACKEND_CORS_ORIGINS` to `http://localhost:5173,https://peichitsai.github.io`.
4. After Render deploys, copy the service URL (for example, `https://your-service.onrender.com`).
5. In GitHub, open **Settings → Secrets and variables → Actions → Variables** and create a repository variable named `VITE_BACKEND_URL` with the Render service URL. This URL is public and should be an Actions variable, not a secret.
6. Push to `main` or manually rerun the GitHub Pages workflow. The frontend build uses `VITE_BACKEND_URL` to call the API.

## Project structure

```text
.
├── frontend/
│   ├── public/
│   ├── src/
│   ├── .env.example
│   ├── package.json
│   ├── package-lock.json
│   └── vite.config.ts
├── backend/
│   ├── app/
│   ├── data/
│   ├── .env.example
│   └── requirements.txt
├── .github/
│   └── workflows/
├── README.md
└── .gitignore
```

## Supabase setup

The app expects a `reports` table with fields such as:

- `id`
- `name`
- `phone`
- `email`
- `category`
- `is_urgent_police`
- `text`
- `lat`
- `lon`
- `status`
- `time`

Adjust the schema to suit your municipality’s operational needs and data privacy policy.

## Tech stack

- React 19
- TypeScript
- Vite
- FastAPI
- Python
- React Router
- Supabase
- Cesium / Tellux-style 3D visualization
- Three.js ecosystem

## How it works

1. A resident submits a city issue through the citizen portal.
2. The report includes the issue details and selected location.
3. The data is stored in Supabase.
4. Government staff review and update report status in the admin panel.
5. City teams can act on issues more efficiently using the 3D dashboard view.

## Notes

- The app uses browser alerts for interactive feedback during report submission.
- Missing environment variables can prevent Supabase connectivity and map features from working correctly.
- Map rendering quality depends on your Cesium token and service configuration.

## License

This project is licensed under the ISC license as defined in the package metadata.

---

<p align="center">
  <strong>Built for smarter public services and more responsive city operations.</strong>
</p>
