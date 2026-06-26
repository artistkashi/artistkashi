#!/bin/bash

set -e

echo "=== Starting ArtistKashi Backend ==="

echo "Running database migrations..."
alembic upgrade head

echo "Checking/Creating admin user..."
python -m commands.create_admin

echo "Starting application..."
exec fastapi run app/main.py \
    --host 0.0.0.0 \
    --port ${PORT:-8000}