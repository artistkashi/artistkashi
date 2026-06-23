"""App package: avoid importing application on package import to prevent side-effects.

Import the FastAPI application explicitly from app.main when needed.
"""

__all__ = []

