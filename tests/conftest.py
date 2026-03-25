"""pytest configuration for API and unit tests."""
import pytest

def pytest_configure(config):
    config.addinivalue_line(
        "markers", "slow: marks tests as slow (may call real APIs)"
    )
