#!/usr/bin/env sh
set -eu
python -m alembic upgrade head
exec python -m uvicorn app.main:app --host 0.0.0.0 --port "${PORT:?PORT must be set}"
