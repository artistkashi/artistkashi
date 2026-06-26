#!/bin/bash

set -e

echo "=== Starting ArtistKashi Backend ==="

# Run database migrations
echo "Running database migrations..."
alembic upgrade head

# Create admin user if not exists
echo "Checking/Creating admin user..."
python scripts/create_admin.py

echo "Starting application..."
exec fastapi run app/main.py --host 0.0.0.0 --port 8000