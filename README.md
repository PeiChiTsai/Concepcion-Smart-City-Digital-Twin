<div align="center">

# Concepcion Smart City

Smart reporting and city operations in one dashboard.

[![React](https://img.shields.io/badge/React-19-61DAFB)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF)](https://vitejs.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6)](https://www.typescriptlang.org/)
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

## Quick Start

### Prerequisites

- Node.js 18+
- npm
- Supabase project access
- Cesium ion token (recommended for photorealistic map layers)

### 1) Install dependencies

```bash
npm install
```

### 2) Configure environment variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_CESIUM_ION_TOKEN=your-cesium-ion-token
```

You can also use the provided template:

```bash
cp .env.example .env
```

### 3) Run locally

```bash
npm run dev
```

### 4) Build for production

```bash
npm run build
```

### 5) Preview the production build

```bash
npm run preview
```

## Features

- Citizens can submit issue reports with contact details and descriptions
- Map-based location selection for precise geospatial reporting
- Category-based classification for urban issues
- Urgent escalation option for police-sensitive incidents
- 3D city dashboard for municipal monitoring
- Admin dashboard for reviewing, updating, and deleting reports
- Supabase-powered data persistence and status tracking

## Deployment

This is a Vite-based frontend application and can be deployed to static hosting platforms or app platforms that support React builds.

### Vercel

1. Push the project to GitHub.
2. Import the repository in Vercel.
3. Add the following environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_CESIUM_ION_TOKEN`
4. Deploy the app.

### Netlify

1. Connect the repository to Netlify.
2. Set the build command to:

```bash
npm run build
```

3. Set the publish directory to:

```bash
dist
```

4. Add the required environment variables in Netlify project settings.

### Static hosting

The project can also be deployed to any static hosting provider that supports a Vite build, as long as the required environment variables are configured.

## Project structure

```text
.
├── public/
│   └── 404.html
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── supabaseClient.ts
│   ├── TelluxMap.tsx
│   └── pages/
│       ├── AdminDashboard.tsx
│       ├── CitizenReport.tsx
│       └── GovDashboard.tsx
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── README.md
├── .env.example
└── public/
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
