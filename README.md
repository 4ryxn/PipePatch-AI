# PipePatch AI

PipePatch AI is a narrowly scoped mobile app for preparing a pipe photo, uploading it once after confirmation, and displaying observation-only analysis. The backend defaults to offline mock mode and can opt into backend-only Gemini vision analysis. Live results may proceed to explicit safety confirmations; deterministic Python rules can then authorize a generic parts checklist for one narrow case. It has no database, authentication, numbered repair steps, brands, prices, or supplier features.

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
uvicorn app.main:app --reload --env-file .env
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

The app uses Expo SDK 54-compatible `expo-camera`, `expo-image-picker`, `expo-image-manipulator`, and `expo-file-system` packages. It requests camera access only to take a local pipe photo and photo-library access only to choose one. On a physical device, grant or deny each permission through its operating-system prompt; a permanently denied permission can be changed in device settings. Camera hardware is normally unavailable in iOS simulators and may be emulated or unavailable in Android simulators, so use a physical device to test capture. Library selection availability also depends on the simulator's supplied media.

Phase 2 accepts JPG, PNG, and WebP photos with a minimum dimension of 960 px. Images longer than 1600 px on either side, or known to exceed 8 MB, are locally normalized to JPEG at reasonable quality. File size may be unavailable on some devices. After the user explicitly confirms the review screen, the app uploads the active image once to `POST /api/v1/analyze`. The backend validates the declared MIME type, signature, and streamed size (8 MB maximum), processes it only in memory, and does not save the upload. The app does not request EXIF, location, or base64 data, and does not persist the photo or result. Temporary normalized copies are removed when a photo is replaced where the platform permits; an original selected library photo is never deleted.

## Backend analysis modes

`backend/.env.example` is safe to copy, but is not a source of secrets. Create your local configuration with `cp .env.example .env`.

- `ANALYSIS_MODE=mock` is the default and is used by automated tests and offline demonstrations. Results are explicitly labelled “Demo analysis”.
- To enable live vision observations, set `ANALYSIS_MODE=gemini`, choose `GEMINI_MODEL` (default: `gemini-3.5-flash-lite`), and set `GEMINI_API_KEY` only in `backend/.env` or another server-side secret manager.
- `REPAIR_MINIMUM_CONFIDENCE=0.75` is the conservative, configurable default for the deterministic generic-parts eligibility gate. Calibrate it against the project evaluation dataset before changing it.

Never paste a Gemini API key into source code, mobile configuration, Git, or chat. The mobile application receives only the typed analysis response and has no Gemini dependency or key. Live requests send validated in-memory bytes directly to Gemini and do not use the Gemini Files API, tools, grounding, search, URL context, or conversation history. API usage can incur model/image-token charges and is subject to account-specific rate limits, so consult current Gemini model and pricing documentation rather than assuming a fixed cost. Test with mock mode first and plan retries/backoff for rate limiting.

`EXPO_PUBLIC_API_BASE_URL` controls the health-check target. Its value is safe to expose in the app, but it must be reachable from the device:

- iOS simulator: `http://127.0.0.1:8000`
- Android emulator: `http://10.0.2.2:8000`
- Physical device: use your computer's LAN address, for example `http://192.168.1.10:8000`

Restart Expo after changing `.env`. Never put Gemini API keys, database credentials, or other secrets in `mobile/.env` or any mobile source file.

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
npm test
```

## Manual physical-device checklist

- Grant and deny camera permission; verify retry and Settings guidance.
- Grant and deny photo-library permission; verify retry and Settings guidance.
- Cancel camera capture and verify return to photo-source selection.
- Cancel library selection and verify return to photo-source selection.
- Capture/select a photo, then retake or replace it.
- Select an oversized image and verify local normalization/review.
- Background and foreground the app while the camera is open; verify the camera pauses and resumes safely.
- Confirm a valid photo; verify the uploading state, cancellation, retry state, and a result labelled “Demo analysis” in mock mode or “AI analysis” in Gemini mode.

## Safety boundary

The MVP is limited to outdoor irrigation Schedule-40 PVC with clean transverse cuts in 1/2 in, 3/4 in, and 1 in sizes. Gemini only observes; the backend's deterministic assessment rules require a live result with at least 0.75 confidence and every explicit safety confirmation before showing the generic parts checklist. Mock results, unknown answers, unsupported line types, active water supply, or any uncertain or failed gate stop guidance. The app does not provide numbered repair steps. See `AGENTS.md` for implementation constraints.
