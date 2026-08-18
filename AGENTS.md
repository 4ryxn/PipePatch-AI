# PipePatch AI engineering guide

## Architecture

- `mobile/` is an Expo/React Native TypeScript client. It may call only this project's backend API.
- `backend/` is a Python FastAPI service. Any future Gemini API call belongs here, never in the mobile client.
- SQLite may be introduced later in the backend only; Phase 2 has no database functionality.
- Keep React components and Python modules small, typed, and focused.

## Security

- Never commit `.env` files, API keys, tokens, database credentials, or other secrets.
- Never put a Gemini API key in `mobile/`, including Expo public environment variables. `EXPO_PUBLIC_*` values are visible to app users.
- Use `.env.example` files only for non-secret configuration or blank, clearly documented placeholders.
- The confirmed active image may be uploaded only to this backend. Do not log, retain, or persist image data; do not request EXIF, location, or base64 image data in mobile code. Original library photos must never be deleted; remove app-created temporary normalized copies when practical.
- Gemini may be called only by the backend when explicitly enabled with server-only configuration. Never log or expose API keys, prompts, raw provider responses, filenames, or image data. Do not use provider file storage, tools, grounding, search, code execution, URL context, or conversation history; do not silently substitute mock data if live analysis fails.
- Camera and library access must be requested only at the user action that needs it. Cancellation is a normal navigation outcome, not an error.

## Product safety boundary

The MVP supports only outdoor irrigation, Schedule-40 PVC, clean transverse cuts, and nominal sizes 1/2 in, 3/4 in, or 1 in. Gemini supplies observations only; deterministic Python rules, backed by explicit user confirmations, exclusively authorize or refuse the generic parts checklist. Any unsupported, ambiguous, or low-confidence case must stop and decline guidance. Do not broaden this scope without explicit product approval.

The calibration endpoint is deterministic OpenCV only. Its ArUco marker result establishes an estimated reference scale, never an automatic pipe diameter, cut-gap, nominal-size, or repair-eligibility measurement. Keep its image handling in memory only and fail closed to a retake for uncertain marker detection or quality.

Assisted measurement may convert only user-selected image points with a server-re-detected marker scale. Treat the result as an estimate and advisory context; it must never preselect or authorize repair-confirmation answers. Deterministic repair guidance may be shown only after every assessment and measurement gate passes; product labels and local requirements always override app wording.

## Supplier-discovery constraints

The optional supplier flow is available only after deterministic eligibility, measured in-range gap, and matching explicit/measured size gates pass. It is a user-triggered, server-side lookup of a general city/area/postcode using public OSM data. Never send exact addresses, add client-side provider calls, autocomplete, background location, reverse-geocoding grids, scraping, tracking, or persistence. Results are approximate public POIs: never claim stock, price, hours, availability, or compatibility. Respect the configured Nominatim rate limit, descriptive User-Agent, short process-local cache, timeouts, OSM attribution, and category-search fallback.

## Current exclusions

Do not add brands, live pricing, authentication, cloud image storage, or data persistence in this phase. The narrowly authorized deterministic guidance must fail closed for uncertainty or unsupported cases.
