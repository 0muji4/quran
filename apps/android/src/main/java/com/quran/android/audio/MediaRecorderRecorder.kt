package com.quran.android.audio

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.media.MediaRecorder
import android.os.Build
import androidx.core.content.ContextCompat
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import com.quran.android.app.AppError
import java.io.File

/**
 * [Recorder] backed by [android.media.MediaRecorder]. Polls
 * `getMaxAmplitude()` every [METER_INTERVAL_MS] ms and decays older
 * samples by [METER_DECAY] so the waveform animates smoothly. Mirrors
 * the iOS `AudioRecorder.startMeterTimer()` behaviour.
 *
 * Some Android vendors return 0 amplitude unconditionally; the
 * waveform falls back to a flat low-amplitude render in that case.
 */
class MediaRecorderRecorder(
    private val context: Context,
    private val focus: AudioFocusCoordinator,
    private val scope: CoroutineScope = CoroutineScope(SupervisorJob() + Dispatchers.Default),
) : Recorder {

    private val _state = MutableStateFlow(RecorderState())
    override val state: StateFlow<RecorderState> = _state.asStateFlow()

    private var recorder: MediaRecorder? = null
    private var outputFile: File? = null
    private var meterJob: Job? = null
    private var startedAtMs: Long = 0L

    override suspend fun start() {
        if (recorder != null) {
            throw AppError.AudioRecordingFailed(IllegalStateException("already recording"))
        }
        ensurePermission()
        focus.ensureMode(AudioFocusCoordinator.Mode.Record, onLoss = { cancel() })
        val file = File(context.cacheDir, "recording-${System.currentTimeMillis()}.m4a")
        try {
            @Suppress("DEPRECATION")
            val mr = (
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    MediaRecorder(context)
                } else {
                    MediaRecorder()
                }
            ).apply {
                setAudioSource(MediaRecorder.AudioSource.MIC)
                setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
                setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
                setAudioEncodingBitRate(128_000)
                setAudioSamplingRate(44_100)
                setOutputFile(file.absolutePath)
                prepare()
                start()
            }
            recorder = mr
            outputFile = file
            startedAtMs = System.currentTimeMillis()
            _state.value = RecorderState(isRecording = true, meters = emptyList(), durationMs = 0L)
            meterJob = scope.launch { meterLoop(mr) }
        } catch (cause: Throwable) {
            file.delete()
            focus.release()
            throw AppError.AudioRecordingFailed(cause)
        }
    }

    override suspend fun stop(): RecordingResult {
        val mr = recorder ?: throw AppError.AudioRecordingFailed(
            IllegalStateException("no active recording"),
        )
        val file = outputFile ?: throw AppError.AudioRecordingFailed(
            IllegalStateException("missing output file"),
        )
        meterJob?.cancel()
        meterJob = null
        val durationMs = System.currentTimeMillis() - startedAtMs
        return try {
            mr.stop()
            mr.release()
            recorder = null
            outputFile = null
            _state.value = RecorderState(isRecording = false, meters = emptyList(), durationMs = durationMs)
            RecordingResult(file = file, durationMs = durationMs)
        } catch (cause: RuntimeException) {
            file.delete()
            recorder = null
            outputFile = null
            throw AppError.AudioRecordingFailed(cause)
        } finally {
            focus.release()
        }
    }

    override fun cancel() {
        meterJob?.cancel()
        meterJob = null
        recorder?.let { mr ->
            runCatching { mr.stop() }
            mr.release()
        }
        recorder = null
        outputFile?.delete()
        outputFile = null
        focus.release()
        _state.value = RecorderState()
    }

    private suspend fun meterLoop(mr: MediaRecorder) {
        val samples = ArrayDeque<Float>(WAVEFORM_SAMPLE_COUNT)
        repeat(WAVEFORM_SAMPLE_COUNT) { samples.addLast(0f) }
        while (true) {
            delay(METER_INTERVAL_MS)
            val raw = runCatching { mr.maxAmplitude }.getOrDefault(0)
            val normalized = (raw.coerceIn(0, MAX_AMPLITUDE).toFloat() / MAX_AMPLITUDE)
                .coerceIn(0f, 1f)
            samples.removeFirst()
            samples.addLast(normalized)
            _state.update {
                it.copy(
                    meters = samples.toList(),
                    durationMs = System.currentTimeMillis() - startedAtMs,
                )
            }
        }
    }

    private fun ensurePermission() {
        val granted = ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.RECORD_AUDIO,
        ) == PackageManager.PERMISSION_GRANTED
        if (!granted) throw AppError.AudioPermissionDenied
    }

    private companion object {
        const val METER_INTERVAL_MS = 50L
        const val MAX_AMPLITUDE = 32_767
        const val METER_DECAY = 0.85f
    }
}
