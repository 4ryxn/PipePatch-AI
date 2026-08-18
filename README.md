# PipePatch AI

Phase 1 foundation for a mobile app that will assess clean-cut Schedule-40 PVC irrigation pipes. This phase provides only backend health checking; it does not analyze images, access a database, call OpenAI, or provide repair advice.

## Repository layout

- `backend/` — FastAPI service and its tests.
- `mobile/` — Expo React Native TypeScript app.

## Prerequisites

- Python 3.11 or later
- Node.js 20 or later and npm
- Expo Go on a physical device, or an Android/iOS simulator, for mobile development

## Backend setup

```sh
cd backend
cp .env.example .env
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -e '.[dev]'
uvicorn app.main:app --reload
```

The API is then available at `http://127.0.0.1:8000`. Confirm it with:

```sh
curl http://127.0.0.1:8000/health
```

## Mobile setup

In a second terminal:

```sh
cd mobile
cp .env.example .env
npm ci
npm start
```

`EXPO_PUBLIC_API_BASE_URL` controls the health-check target. Its value is safe to expose in the app, but it must be reachable from the device:

- iOS simulator: `http://127.0.0.1:8000`
- Android emulator: `http://10.0.2.2:8000`
- Physical device: use your computer's LAN address, for example `http://192.168.1.10:8000`

Restart Expo after changing `.env`. Never put OpenAI API keys, database credentials, or other secrets in `mobile/.env` or any mobile source file.

## Validation

```sh
cd backend
source .venv/bin/activate
pytest
ruff check .
mypy app

cd ../mobile
npm run lint
npm run typecheck
```

## Safety boundary

The eventual MVP is limited to outdoor irrigation Schedule-40 PVC with clean transverse cuts in 1/2 in, 3/4 in, and 1 in sizes. Any unsupported or uncertain case must stop without producing repair guidance. See `AGENTS.md` for implementation constraints.
