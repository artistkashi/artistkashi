#!/bin/bash

# Staging startup script - runs migrations then starts the app

echo "Running in Docker (staging)"

# Run database migrations
echo "Running database migrations..."
alembic upgrade head

# Start the application
echo "Starting application..."
fastapi run app/main.py --host 0.0.0.0 --port 8000