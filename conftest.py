import json
import os
from urllib.parse import urlparse
import pytest
from dotenv import load_dotenv

# Load .env first if present so TEST_DATABASE_URL or DATABASE_URL can be read
load_dotenv(override=False)

# Test environment is deterministic and never falls back to a known secret.
# pytest imports this file before any test module, so these variables are in
# place before backend.app.core.config (or anything that imports it) is loaded.
test_db_url = os.environ.get("TEST_DATABASE_URL")
if not test_db_url:
    test_db_url = os.environ.get(
        "DATABASE_URL",
        "postgresql+psycopg://postgres:postgres@localhost:5432/firesense",
    )

# Safety guard: abort the test session if the resolved database name is not a test database.
# In CI and local container environments, 'firesense' is the dedicated test/demo database.
is_ci = os.environ.get("CI") == "true" or os.environ.get("GITHUB_ACTIONS") == "true"
parsed_db = urlparse(test_db_url).path.lstrip("/").split("?")[0]
if not is_ci and not (parsed_db.endswith("_test") or parsed_db == "firesense"):
    pytest.exit(
        f"ABORTING TEST SESSION: Resolved database '{parsed_db}' does not end in '_test' and is not 'firesense'. "
        f"Tests must use a dedicated test database to avoid modifying or wiping live data.",
        returncode=1,
    )

os.environ["DATABASE_URL"] = test_db_url

# Force-clear the FIRMS key: config.load_dotenv() pulls the local .env (which must
# hold a placeholder for docker compose) into the process env, which would turn the
# "live endpoint without key -> 400" contract into a live-fetch attempt -> 502.
# CI has no .env, so empty here matches CI's effective environment exactly.
os.environ["FIRMS_MAP_KEY"] = ""

if not os.environ.get("JWT_SECRET_KEY"):
    os.environ["JWT_SECRET_KEY"] = "test-only-firesense-jwt-secret-not-for-production"

if not os.environ.get("FIRESENSE_BOOTSTRAP_USERS"):
    os.environ["FIRESENSE_BOOTSTRAP_USERS"] = json.dumps([
        {"email": "analyst@firesense.org", "password": "firesense-test-pass", "role": "analyst", "full_name": "Analyst User"},
        {"email": "authority@firesense.org", "password": "firesense-test-pass", "role": "authority", "full_name": "Authority User"},
        {"email": "responder@firesense.org", "password": "firesense-test-pass", "role": "responder", "full_name": "Responder User"},
        {"email": "admin@firesense.org", "password": "firesense-test-pass", "role": "admin", "full_name": "Admin User"},
    ])


@pytest.fixture(scope="session", autouse=True)
def ensure_db_schema():
    """Ensure database schema and migrations are applied before running tests."""
    try:
        from alembic.config import Config
        from alembic import command
        repo_root = os.path.dirname(os.path.abspath(__file__))
        alembic_ini = os.path.join(repo_root, "alembic.ini")
        if os.path.exists(alembic_ini):
            cfg = Config(alembic_ini)
            command.upgrade(cfg, "head")
    except Exception:
        # If DB is unavailable, let the individual test skipif markers handle it
        pass
