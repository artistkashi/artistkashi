#!/usr/bin/env python3
"""
Setup script for ArtistKashi FastAPI Backend.

This script helps you set up the backend with all dependencies and configurations.
"""

import os
import subprocess
import sys
from pathlib import Path


def print_header(title):
    """Print a formatted header."""
    print(f"\n{'=' * 60}")
    print(f"  {title}")
    print(f"{'=' * 60}\n")


def print_success(msg):
    """Print success message."""
    print(f"✅ {msg}")


def print_info(msg):
    """Print info message."""
    print(f"ℹ️  {msg}")


def print_warning(msg):
    """Print warning message."""
    print(f"⚠️  {msg}")


def print_error(msg):
    """Print error message."""
    print(f"❌ {msg}")


def run_command(cmd, description):
    """Run a command and return success status."""
    print_info(f"Running: {description}")
    print(f"  Command: {' '.join(cmd)}\n")

    try:
        result = subprocess.run(cmd, check=True, cwd=Path(__file__).parent)
        print_success(f"{description}\n")
        return True
    except subprocess.CalledProcessError as e:
        print_error(f"{description} failed with exit code {e.returncode}\n")
        return False
    except FileNotFoundError as e:
        print_error(f"Command not found: {e}\n")
        return False


def check_tools():
    """Check if required tools are installed."""
    print_header("Checking Required Tools")

    tools = {
        "python": "Python",
        "pip": "pip",
    }

    missing = []
    for tool, name in tools.items():
        try:
            subprocess.run([tool, "--version"], capture_output=True, check=True)
            print_success(f"{name} is installed")
        except (subprocess.CalledProcessError, FileNotFoundError):
            print_error(f"{name} is NOT installed")
            missing.append(name)

    if missing:
        print_error(f"\nPlease install: {', '.join(missing)}")
        return False

    print_success("\nAll required tools are installed!")
    return True


def install_dependencies():
    """Install Python dependencies."""
    print_header("Installing Dependencies")

    # Check if using uv or pip
    try:
        subprocess.run(["uv", "--version"], capture_output=True, check=True)
        print_info("Using 'uv' for faster dependency resolution\n")
        return run_command(["uv", "sync"], "Installing dependencies with uv")
    except (subprocess.CalledProcessError, FileNotFoundError):
        print_warning("'uv' not found, falling back to pip\n")
        return run_command(
            ["pip", "install", "-e", ".[dev]"], "Installing dependencies with pip"
        )


def create_env_file():
    """Create .env file from .env.example if it doesn't exist."""
    print_header("Setting Up Environment Variables")

    env_file = Path(".env")
    env_example = Path(".env.example")

    if env_file.exists():
        print_warning(f"{env_file} already exists")
        response = input("Overwrite? (y/n): ").strip().lower()
        if response != "y":
            print_info("Skipping .env creation")
            return True

    if not env_example.exists():
        print_error(f"{env_example} not found!")
        return False

    with open(env_example) as f:
        content = f.read()

    with open(env_file, "w") as f:
        f.write(content)

    print_success(f"Created {env_file}")
    print_warning(f"⚠️  IMPORTANT: Edit {env_file} and set your configuration!")
    print_info("   - Set DATABASE_URL to your PostgreSQL connection string")
    print_info("   - Set REDIS_HOST/PORT if using custom Redis")
    print_info("   - Set SECRET keys to strong random values")

    return True


def run_tests():
    """Run tests to verify setup."""
    print_header("Running Tests")

    print_info("Testing imports...\n")
    try:
        import app.core.config

        print_success("✅ app.core.config imports successfully")

        import app.core.db

        print_success("✅ app.core.db imports successfully")

        import app.core.cache

        print_success("✅ app.core.cache imports successfully")

        import app.core.queue

        print_success("✅ app.core.queue imports successfully")

        import app.core.exceptions

        print_success("✅ app.core.exceptions imports successfully")

        import app.core.health

        print_success("✅ app.core.health imports successfully")

        return True
    except ImportError as e:
        print_error(f"Import failed: {e}")
        return False


def show_next_steps():
    """Show next steps."""
    print_header("Setup Complete! 🎉")

    print("\nNext steps:\n")
    print("1. CONFIGURE YOUR ENVIRONMENT")
    print("   Edit .env file with your database and Redis settings\n")

    print("2. START REQUIRED SERVICES")
    print("   PostgreSQL:")
    print("     docker run -d \\")
    print("       -e POSTGRES_PASSWORD=password \\")
    print("       -e POSTGRES_DB=mydatabase \\")
    print("       -p 5432:5432 \\")
    print("       postgres:16\n")
    print("   Redis:")
    print("     docker run -d -p 6379:6379 redis:7\n")
    print("   (Optional) Mailhog for emails:")
    print("     docker run -d -p 1025:1025 -p 8025:8025 mailhog/mailhog\n")

    print("3. RUN DATABASE MIGRATIONS")
    print("   alembic upgrade head\n")

    print("4. START THE SERVER")
    print("   uvicorn app.main:app --reload\n")

    print("5. VERIFY SETUP")
    print("   Health check: http://localhost:8000/health")
    print("   Detailed health: http://localhost:8000/health/detailed")
    print("   API docs: http://localhost:8000/docs\n")

    print("📚 READ THE UPGRADE GUIDE")
    print("   cat UPGRADE_GUIDE.md\n")

    print("✨ Your ArtistKashi FastAPI backend is ready! 🚀\n")


def main():
    """Main setup function."""
    print_header("ArtistKashi FastAPI Backend Setup")

    # Check tools
    if not check_tools():
        print_error("Setup aborted - missing required tools")
        return 1

    # Install dependencies
    if not install_dependencies():
        print_error("Setup aborted - dependency installation failed")
        return 1

    # Create .env file
    if not create_env_file():
        print_error("Setup aborted - .env creation failed")
        return 1

    # Run tests
    if not run_tests():
        print_warning("Some import tests failed")

    # Show next steps
    show_next_steps()

    return 0


if __name__ == "__main__":
    sys.exit(main())
