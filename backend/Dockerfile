FROM ghcr.io/astral-sh/uv:python3.11-bookworm-slim

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    PYTHONUNBUFFERED=1 \
    UV_PROJECT_ENVIRONMENT=/opt/venv

WORKDIR /app

COPY pyproject.toml uv.lock ./

RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

RUN python -m pip install --upgrade pip

RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen

COPY . .

ENV PATH="/opt/venv/bin:$PATH"

EXPOSE 8000

CMD ["bash", "./start.sh"]