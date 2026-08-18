# PipePatch AI

PipePatch AI is a web-first final-year project for cautiously documenting a narrowly supported outdoor Schedule-40 PVC irrigation pipe case. The browser client captures a temporary photo, and the FastAPI backend performs observation-only analysis. Gemini provides visual observations only; deterministic Python rules exclusively decide whether any guarded guidance is available.

## Architecture

- `web/` — React, TypeScript, and Vite browser client.
- `backend/` — FastAPI service, Gemini adapter, deterministic safety rules, OpenCV calibration/measurement, and optional accounts/history.
- Vercel — separate frontend static-site and backend serverless projects.
- Neon PostgreSQL — production database for optional accounts and text-only repair history. SQLite is local/test only.

The web client stores the active photo only in memory and sends it only after confirmation. It never stores photos, EXIF, location, API keys, or provider payloads. The backend validates uploads in memory and does not persist them.

## Scope and safety

Only a live, confident `clean_transverse_cut` observation can enter the existing deterministic clean-cut gates. The supported repair case remains outdoor irrigation, confirmed Schedule-40 PVC, and a user-confirmed 1/2, 3/4, or 1 inch nominal size. All mock, uncertain, hazardous, or unsupported results stop safely. Product labels, local requirements, and qualified professionals always take priority.

Calibration establishes only an estimated reference scale. Assisted measurement is advisory; it never authorizes a repair by itself.

## Local setup

### Backend

```sh
cd backend
cp .env.example .env
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -e '.[dev]'
uvicorn app.main:app --reload --env-file .env
```

Confirm the API with `curl http://127.0.0.1:8000/health`.

`ANALYSIS_MODE=mock` is the safe default. For live observations, set `ANALYSIS_MODE=gemini`, `GEMINI_MODEL`, and `GEMINI_API_KEY` only in `backend/.env` or a server-side secret manager. Never put a Gemini key, database URL, or JWT secret in source code, Git, browser variables, or chat.

### Web client

```sh
cd web
cp .env.example .env
# Set VITE_API_BASE_URL=http://127.0.0.1:8000
npm ci
npm run dev
```

`VITE_API_BASE_URL` is the only public build-time variable. It must be the backend origin and can be visible to browser users; it must never contain a secret. The web client accepts JPG, PNG, and WebP images up to 8 MB in any aspect ratio.

## Validation

```sh
cd web
npm run typecheck
npm test
npm run build

cd ../backend
.venv/bin/python -m pytest
.venv/bin/python -m ruff check .
.venv/bin/python -m mypy app
```

## Deployment

Deploy `backend/` and `web/` as separate Vercel projects. Use Neon PostgreSQL only when optional auth/history is enabled. Add the exact deployed web origin to backend `ALLOWED_ORIGINS`; wildcard CORS is not permitted. Follow the full [deployment runbook](docs/deployment-runbook.md).

## Project materials

- [Product specification](docs/product-specification.md)
- [Final project report](docs/final-project-report.md)
- [Demo script](docs/demo-script.md)
- [Privacy and optional accounts](docs/privacy-and-auth.md)
- [Dataset card](docs/dataset-card.md)

Print [the ArUco marker card](docs/assets/pipepatch-aruco-marker-23-50mm.svg) at **100% / actual size**. Verify its 50 mm black marker square and verification line with a physical ruler before use.
