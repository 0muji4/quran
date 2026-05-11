import json
import os
import socket
import urllib.request
from unittest.mock import MagicMock, patch, ANY

import pytest
from main import (
    AsrWorker,
    FasterWhisperLocalTranscriber,
    HealthzHandler,
    ResultWriter,
    TranscriptionResult,
    WorkerConfig,
    align_words,
    build_transcriber,
    compute_pronunciation_score,
    compute_wer,
    normalize_arabic,
    start_healthz_server,
)

# --- Test Helper Functions ---

def test_normalize_arabic():
    assert normalize_arabic("بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ") == "بسم الله الرحمن الرحيم"
    assert normalize_arabic("الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ") == "الحمد لله رب العالمين"

def test_compute_wer():
    ref = "بسم الله الرحمن الرحيم"
    hyp = "بسم الله الرحمن الرحيم"
    assert compute_wer(ref, hyp) == 0.0

    hyp_del = "بسم الرحمن الرحيم"
    assert pytest.approx(compute_wer(ref, hyp_del)) == 1/4

    hyp_ins = "بسم الله العظيم الرحمن الرحيم"
    assert pytest.approx(compute_wer(ref, hyp_ins)) == 1/4

    hyp_sub = "بسم الله الرحمن الكريم"
    assert pytest.approx(compute_wer(ref, hyp_sub)) == 1/4

def test_align_words():
    ref = "واحد اثنين ثلاثة"
    hyp = "واحد اثنان ثلاثة"
    alignment = align_words(ref, hyp)
    assert alignment == [
        {"ref_word": "واحد", "hyp_word": "واحد", "op": "match"},
        {"ref_word": "اثنين", "hyp_word": "اثنان", "op": "substitute"},
        {"ref_word": "ثلاثة", "hyp_word": "ثلاثة", "op": "match"},
    ]

def test_compute_pronunciation_score():
    word_alignments = [
        {"ref_word": "a", "hyp_word": "a", "op": "match"},
        {"ref_word": "b", "hyp_word": "c", "op": "substitute"},
        {"ref_word": "d", "hyp_word": None, "op": "delete"},
        {"ref_word": None, "hyp_word": "e", "op": "insert"},
    ]
    word_timestamps = [
        {"word": "a", "probability": 0.9},
        {"word": "c", "probability": 0.7},
        {"word": "e", "probability": 0.8},
    ]
    wer = 0.5
    score = compute_pronunciation_score(word_alignments, word_timestamps, wer)
    
    assert score["accuracy"] == 0.5 # 1 - wer
    assert pytest.approx(score["completeness"]) == (3-1)/3 # (ref_count - delete_count) / ref_count
    assert pytest.approx(score["fluency"]) == (0.9 + 0.7 + 0.8) / 3

# --- Test AsrWorker ---

@pytest.fixture
def worker_config():
    """Provides a default WorkerConfig for tests."""
    return WorkerConfig(
        redis_url="redis://localhost:6379/0",
        queue_name="test_queue",
        postgres_dsn="postgresql://user:pass@localhost:5432/testdb",
        minio_endpoint="localhost:9000",
        minio_access_key="minio",
        minio_secret_key="minio123",
        minio_bucket="test-bucket",
    )

class TestAsrWorker:

    @patch("main.ResultWriter")
    @patch("main.redis")
    @patch("main.WhisperModel")
    def test_download_audio_from_minio(self, mock_whisper, mock_redis, mock_writer, worker_config, tmp_path):
        # Setup
        worker = AsrWorker(worker_config)
        mock_minio_client = mock_writer.return_value.minio

        audio_key = "path/to/audio.opus"
        temp_file_path = os.path.join(tmp_path, "audio.opus")

        # fget_object writes to disk in production; emulate that so the
        # post-download `os.path.getsize` succeeds.
        def fake_fget(bucket, key, dest_path):  # noqa: ARG001
            open(dest_path, "wb").close()
        mock_minio_client.fget_object.side_effect = fake_fget

        # Action
        with patch("tempfile.mkstemp", return_value=(None, temp_file_path)):
             downloaded_path = worker._download_audio(audio_key)

        # Assert
        mock_minio_client.fget_object.assert_called_once_with(
            worker_config.minio_bucket, audio_key, temp_file_path
        )
        assert downloaded_path == temp_file_path


    @patch("main.ResultWriter")
    @patch("main.redis")
    @patch("main.WhisperModel")
    def test_transcribe_with_whisper(self, mock_whisper, mock_redis, mock_writer, worker_config):
        # Setup
        worker = AsrWorker(worker_config)
        mock_model_instance = mock_whisper.return_value
        
        # Mock WhisperModel's transcribe method
        mock_segment = MagicMock()
        mock_segment.text = " transcribed text"
        mock_word = MagicMock(word="transcribed", start=0.1, end=0.5, probability=0.95)
        mock_segment.words = [mock_word]
        mock_model_instance.transcribe.return_value = ([mock_segment], MagicMock())

        audio_path = "/path/to/audio.opus"
        expected_text = "some arabic text"
        
        # Action
        transcript, words = worker._transcribe(audio_path, expected_text)

        # Assert
        mock_model_instance.transcribe.assert_called_once_with(
            audio_path,
            language="ar",
            beam_size=5,
            word_timestamps=True,
            initial_prompt=ANY
        )
        assert transcript == "transcribed text"
        assert len(words) == 1
        assert words[0]["word"] == "transcribed"


    @patch("main.AsrWorker._download_audio")
    @patch("main.AsrWorker._transcribe")
    @patch("main.ResultWriter")
    @patch("main.redis")
    @patch("main.WhisperModel")
    def test_process_job_end_to_end(
        self, mock_whisper, mock_redis, mock_writer, mock_transcribe, mock_download, worker_config, tmp_path
    ):
        # Setup
        worker = AsrWorker(worker_config)

        # process_job calls os.path.getsize on the downloaded file to record
        # an upload-size metric. Use a real (empty) temp file so that succeeds.
        fake_audio_path = os.path.join(tmp_path, "fake_audio.opus")
        open(fake_audio_path, "wb").close()
        mock_download.return_value = fake_audio_path
        mock_transcribe.return_value = ("transcript text", [{"word": "transcript", "start": 0, "end": 1, "probability": 0.9}])
        
        mock_writer_instance = mock_writer.return_value
        mock_writer_instance.save_alignment.return_value = "alignments/session123.json"

        job = {
            "session_id": "session123",
            "audio_key": "audio/session123.opus",
            "ayah_id": 1,
            "expected_text_ar": "بسم الله",
            "enqueued_at": "2023-01-01T12:00:00Z"
        }

        # Action
        worker.process_job(job)

        # Assert
        mock_download.assert_called_once_with(job["audio_key"])
        mock_transcribe.assert_called_once_with(fake_audio_path, job["expected_text_ar"])
        
        mock_writer_instance.save_alignment.assert_called_once()
        mock_writer_instance.upsert_result.assert_called_once()
        mock_writer_instance.update_alignment_reference.assert_called_once()
        mock_writer_instance.update_scoring_job_score.assert_called_once()

        # Check if score was updated with the 'overall' score from compute_pronunciation_score
        call_args, _ = mock_writer_instance.update_scoring_job_score.call_args
        assert call_args[0] == "session123"
        assert "overall" in compute_pronunciation_score([], [{"word": "transcript", "start": 0, "end": 1, "probability": 0.9}], 0.5)


class TestResultWriter:

    @patch("main.psycopg")
    @patch("main.Minio")
    def test_save_alignment(self, mock_minio, mock_psycopg, worker_config):
        # Setup
        writer = ResultWriter(worker_config)
        mock_minio_client = mock_minio.return_value
        mock_minio_client.bucket_exists.return_value = True

        session_id = "test-session"
        payload = {"data": "test"}

        # Action
        object_key = writer.save_alignment(session_id, payload)

        # Assert
        expected_key = f"{worker_config.alignment_prefix}{session_id}.json"
        assert object_key == expected_key
        mock_minio_client.put_object.assert_called_once_with(
            worker_config.minio_bucket,
            expected_key,
            ANY, # Check BytesIO data
            length=len(json.dumps(payload, ensure_ascii=False, indent=2).encode("utf-8")),
            content_type="application/json",
        )

    @patch("main.psycopg")
    @patch("main.Minio")
    def test_upsert_result(self, mock_minio, mock_psycopg, worker_config):
        # Setup
        writer = ResultWriter(worker_config)
        mock_conn = mock_psycopg.connect.return_value
        mock_cursor = mock_conn.cursor.return_value.__enter__.return_value

        # Action
        writer.upsert_result("sid", 1, "akey", "ref", "hyp", [], [], 0.1, "alignkey")

        # Assert
        mock_cursor.execute.assert_called_once()
        assert "INSERT INTO asr_results" in mock_cursor.execute.call_args[0][0]
        assert "ON CONFLICT (session_id) DO UPDATE" in mock_cursor.execute.call_args[0][0]
        
    @patch("main.psycopg")
    @patch("main.Minio")
    def test_update_alignment_reference(self, mock_minio, mock_psycopg, worker_config):
         # Setup
        writer = ResultWriter(worker_config)
        mock_conn = mock_psycopg.connect.return_value
        mock_cursor = mock_conn.cursor.return_value.__enter__.return_value

        # Action
        writer.update_alignment_reference("sid", "alignkey")

        # Assert
        mock_cursor.execute.assert_called_once()
        assert "UPDATE user_data_objects" in mock_cursor.execute.call_args[0][0]

    @patch("main.psycopg")
    @patch("main.Minio")
    def test_update_scoring_job_score(self, mock_minio, mock_psycopg, worker_config):
         # Setup
        writer = ResultWriter(worker_config)
        mock_conn = mock_psycopg.connect.return_value
        mock_cursor = mock_conn.cursor.return_value.__enter__.return_value

        # Action
        writer.update_scoring_job_score("sid", 0.95)

        # Assert
        mock_cursor.execute.assert_called_once()
        assert "UPDATE scoring_jobs" in mock_cursor.execute.call_args[0][0]
        assert mock_cursor.execute.call_args[0][1]["score"] == 0.95


# --- Test ASR backend abstraction (ADR 0013) ---

class TestTranscriberFactory:

    @patch("main.WhisperModel")
    def test_default_backend_is_faster_whisper_local(self, mock_whisper, worker_config):
        transcriber = build_transcriber(worker_config)
        assert isinstance(transcriber, FasterWhisperLocalTranscriber)
        assert transcriber.name == "faster-whisper-local"

    @patch("main.WhisperModel")
    def test_explicit_faster_whisper_local(self, mock_whisper, worker_config):
        worker_config.asr_backend = "faster-whisper-local"
        transcriber = build_transcriber(worker_config)
        assert isinstance(transcriber, FasterWhisperLocalTranscriber)

    def test_unknown_backend_raises(self, worker_config):
        worker_config.asr_backend = "no-such-backend"
        with pytest.raises(ValueError, match="no-such-backend"):
            build_transcriber(worker_config)

    @patch("main.WhisperModel")
    def test_transcribe_returns_transcription_result(self, mock_whisper, worker_config):
        # Mock Whisper to return one segment with one word
        mock_word = MagicMock(word="hello", start=0.0, end=0.5, probability=0.9)
        mock_segment = MagicMock(text="hello", words=[mock_word])
        mock_whisper.return_value.transcribe.return_value = ([mock_segment], MagicMock())

        transcriber = FasterWhisperLocalTranscriber(worker_config)
        result = transcriber.transcribe("/tmp/audio.opus", "")

        assert isinstance(result, TranscriptionResult)
        assert result.transcript == "hello"
        assert len(result.words) == 1
        assert result.words[0]["word"] == "hello"


# --- Test /healthz endpoint (ADR 0010, ADR 0013) ---

def _free_port() -> int:
    """Return an OS-assigned free TCP port."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


class TestHealthz:

    def test_healthz_returns_200_and_backend_name(self):
        port = _free_port()
        server = start_healthz_server(port, "faster-whisper-local")
        try:
            with urllib.request.urlopen(f"http://127.0.0.1:{port}/healthz", timeout=2) as resp:
                assert resp.status == 200
                body = json.loads(resp.read().decode("utf-8"))
                assert body == {"status": "ok", "asr_backend": "faster-whisper-local"}
        finally:
            server.shutdown()
            server.server_close()

    def test_unknown_path_returns_404(self):
        port = _free_port()
        server = start_healthz_server(port, "faster-whisper-local")
        try:
            with pytest.raises(urllib.error.HTTPError) as err:
                urllib.request.urlopen(f"http://127.0.0.1:{port}/nope", timeout=2)
            assert err.value.code == 404
        finally:
            server.shutdown()
            server.server_close()

    def test_healthz_reports_configured_backend(self):
        # Reset class attribute to avoid cross-test contamination via HealthzHandler
        # (it carries asr_backend on the class itself).
        port = _free_port()
        server = start_healthz_server(port, "future-gpu-backend")
        try:
            with urllib.request.urlopen(f"http://127.0.0.1:{port}/healthz", timeout=2) as resp:
                body = json.loads(resp.read().decode("utf-8"))
                assert body["asr_backend"] == "future-gpu-backend"
        finally:
            HealthzHandler.asr_backend = "unknown"  # restore default
            server.shutdown()
            server.server_close()
