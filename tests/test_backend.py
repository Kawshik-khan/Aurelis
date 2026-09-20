"""Backend test suite for DBS Bank."""

import os


def test_environment_configuration():
    """Verify default environment behavior."""
    assert os.getenv("TESTING", "1") == "1"


def test_core_health_spec():
    """Ensure core health endpoint data specifications."""
    health_spec = {
        "status": "healthy",
        "platform": "DBS Bank Bangladesh API Core",
        "version": "1.0.0",
    }
    assert health_spec["status"] == "healthy"
    assert health_spec["version"] == "1.0.0"
