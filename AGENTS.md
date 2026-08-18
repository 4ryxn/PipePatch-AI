# PipePatch AI engineering guide

## Architecture

- `web/` is the sole client: a React, TypeScript, and Vite browser application. It may call only this project's backend API.
- `backend/` is a Python FastAPI service. Gemini API calls belong here only, never in browser code.
- SQLite is for local development/testing. Optional production accounts/history use PostgreSQL through `DATABASE_URL`.
- Keep React components and Python modules small, typed, and focused.

## Security and privacy

- Never commit `.env` files, API keys, tokens, database credentials, or other secrets.
- `VITE_*` values are visible to browser users. Only `VITE_API_BASE_URL` is permitted; it must never contain Gemini credentials, JWT secrets, or database URLs.
- Keep the selected photo only in browser memory. Send it only to this backend after the user confirms. Do not log, retain, or persist image data; do not request EXIF, location, or base64 data.
- Gemini may be called only by the backend when explicitly enabled with server-only configuration. Never log or expose API keys, prompts, raw provider responses, filenames, or image data. Do not use provider file storage, tools, grounding, search, code execution, URL context, or conversation history; do not silently substitute mock data if live analysis fails.
- Browser camera/file selection is user initiated. Cancellation is normal navigation, not an error.
- CORS uses explicit configured origins only. Do not introduce a wildcard origin.

## Product safety boundary

The MVP supports only outdoor irrigation, Schedule-40 PVC, clean transverse cuts, and nominal sizes 1/2 in, 3/4 in, or 1 in. Gemini supplies observations only; deterministic Python rules, backed by explicit user confirmations, exclusively authorize or refuse generic guidance. Any unsupported, ambiguous, or low-confidence case must stop and decline guidance.

The calibration endpoint is deterministic OpenCV only. Its ArUco marker result establishes an estimated reference scale, never an automatic pipe diameter, cut-gap, nominal-size, or repair-eligibility measurement. Keep image handling in memory only and fail closed to a retake for uncertain marker detection or quality.

Assisted measurement may convert only user-selected image points with a server-re-detected marker scale. Treat the result as an estimate and advisory context; it must never preselect or authorize repair-confirmation answers. Deterministic repair guidance may be shown only after every assessment and measurement gate passes; product labels and local requirements always override app wording.

The optional supplier flow is available only after deterministic eligibility, measured in-range gap, and matching explicit/measured size gates pass. It is user-triggered and server-side, using a general city/area/postcode and public OSM data. Never send exact addresses, add client-side provider calls, autocomplete, background location, reverse-geocoding grids, scraping, tracking, or persistence. Never claim stock, price, hours, availability, or compatibility.
