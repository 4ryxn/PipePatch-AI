# Privacy and optional accounts

Accounts are optional. The complete repair workflow remains available without signing in. If enabled, authentication uses server-side Argon2 password hashes and short-lived signed JWT access tokens; the app stores its token only in Expo SecureStore.

Repair history is opt-in. A saved entry contains only its title, supported/rejected outcome, confirmed nominal size, repair method identifier, gap-range status, generic parts names, and deterministic safety/limitation text. It never contains photos, image bytes, EXIF/location data, exact measurements, quotes, prices, supplier/location data, raw AI/provider data, or credentials.

History remains until the user deletes an entry or permanently deletes the account, which cascades deletion of its history. Email verification, password reset delivery, refresh tokens, social sign-in, analytics, administration, and cloud image storage are not included.

For local development set `AUTH_ENABLED=true`, `DATABASE_URL=sqlite:///./pipepatch.db`, and generate a secret, for example: `python -c "import secrets; print(secrets.token_urlsafe(48))"`. Deployment may use PostgreSQL through `DATABASE_URL`; use a strong private secret and TLS. Never place a secret in mobile configuration, source control, or chat.
