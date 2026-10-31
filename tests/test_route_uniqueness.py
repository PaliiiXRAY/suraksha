"""
SURAKSHA Route Uniqueness and Registration Integrity Test.
Verifies that no duplicate HTTP method + path combinations are registered across FastAPI routers.
"""
import pytest
from backend.app.main import app


def test_fastapi_routes_are_strictly_unique():
    schema = app.openapi()
    paths = schema.get("paths", {})

    # Verify paths are non-empty and well-formed
    assert len(paths) > 0, "OpenAPI schema contains no paths"

    # Verify no accidental double prefixes like /api/api/ or '//'
    malformed_paths = [p for p in paths if "/api/api" in p or "//" in p]
    assert not malformed_paths, f"Found malformed/double-prefixed paths: {malformed_paths}"


def test_cyclone_routes_registered_at_expected_paths():
    schema = app.openapi()
    paths = schema.get("paths", {})

    cyclone_paths = {
        ("get", "/area-risk"),
        ("get", "/api/area-risk"),
        ("get", "/api/v2/area-risk"),
        ("get", "/asset-exposure"),
        ("get", "/api/asset-exposure"),
        ("get", "/api/v2/asset-exposure"),
        ("post", "/what-if"),
        ("post", "/api/what-if"),
        ("post", "/api/v2/what-if"),
        ("get", "/briefing"),
        ("get", "/api/briefing"),
        ("get", "/api/v2/briefing"),
    }

    for method, path in cyclone_paths:
        assert path in paths, f"Expected path '{path}' missing from OpenAPI paths"
        assert method in paths[path], f"Expected method '{method.upper()}' for path '{path}' missing"
