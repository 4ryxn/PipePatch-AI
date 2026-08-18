# PipePatch AI engineering guide

## Architecture

- `mobile/` is an Expo/React Native TypeScript client. It may call only this project's backend API.
- `backend/` is a Python FastAPI service. Any future OpenAI API call belongs here, never in the mobile client.
- SQLite may be introduced later in the backend only; Phase 2 has no database functionality.
- Keep React components and Python modules small, typed, and focused.

## Security

- Never commit `.env` files, API keys, tokens, database credentials, or other secrets.
- Never put an OpenAI API key in `mobile/`, including Expo public environment variables. `EXPO_PUBLIC_*` values are visible to app users.
- Use `.env.example` files only for non-secret configuration or blank, clearly documented placeholders.
- The approved mock-upload milestone may upload the confirmed active image only to this backend. Do not log, retain, or persist image data; do not request EXIF, location, or base64 image data. Original library photos must never be deleted; remove app-created temporary normalized copies when practical.
- Camera and library access must be requested only at the user action that needs it. Cancellation is a normal navigation outcome, not an error.

## Product safety boundary

The MVP supports only outdoor irrigation, Schedule-40 PVC, clean transverse cuts, and nominal sizes 1/2 in, 3/4 in, or 1 in. Future analysis must stop and decline repair advice for any unsupported, ambiguous, or low-confidence case. Do not broaden this scope without explicit product approval.

## Current exclusions

Do not add real image analysis, OpenAI integration, database functionality, repair recommendations, authentication, cloud image storage, or data persistence in this phase.
