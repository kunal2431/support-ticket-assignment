#!/bin/sh
set -e

echo "=== Backend entrypoint starting ==="

echo "Waiting for Postgres at db:5432..."
while ! nc -z db 5432; do
  sleep 1
done
echo "Postgres is up!"

echo "Starting FastAPI (uvicorn)..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
