import pytest
from unittest.mock import MagicMock

@pytest.fixture
def mock_minio():
    """Fixture for mocking MinIO client."""
    return MagicMock()

@pytest.fixture
def mock_redis():
    """Fixture for mocking Redis client."""
    mock = MagicMock()
    # Simulate Redis get for job data
    mock.get.return_value = '{"recording_id": "test-recording", "surah_id": 1, "ayah_id": 1}'
    mock.exists.return_value = 1
    return mock

@pytest.fixture
def mock_whisper_model():
    """Fixture for mocking faster_whisper.WhisperModel."""
    mock = MagicMock()
    # Mock the transcribe method to return sample segments and info
    segments = [
        MagicMock(start=0.0, end=1.5, text="In the name of Allah,", words=[MagicMock(word='In', start=0.0, end=0.1, probability=0.9)]),
        MagicMock(start=1.5, end=3.0, text=" the Most Gracious, the Most Merciful.", words=[MagicMock(word='the', start=1.5, end=1.6, probability=0.9)])
    ]
    info = MagicMock(language="en", language_probability=0.98)
    mock.transcribe.return_value = (segments, info)
    return mock

@pytest.fixture
def mock_db_conn():
    """Fixture for mocking database connection and cursor."""
    mock_conn = MagicMock()
    mock_cursor = MagicMock()
    mock_conn.cursor.return_value = mock_cursor
    # Prevent __enter__ and __exit__ from being called on the mock cursor
    mock_cursor.__enter__.return_value = mock_cursor
    mock_cursor.__exit__.return_value = None
    return mock_conn

# Integration test fixtures using testcontainers will be more complex
# and might require Docker to be running.
# For now, we will focus on unit tests with mocks.
# A basic placeholder for integration_setup:
@pytest.fixture
def integration_setup():
    """Placeholder for integration test setup."""
    # This would typically spin up Docker containers for Postgres, MinIO, and Redis
    # For CI/CD environments, this needs careful setup.
    pytest.skip("Integration tests require a Docker environment and are skipped.")
