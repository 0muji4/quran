package tv.every.tilawah.android.audio

import kotlinx.coroutines.flow.StateFlow
import java.io.File

/**
 * Microphone capture surface used by the Practice screen. Mirrors iOS
 * `AudioRecorder` so the same state-machine flows on both platforms.
 *
 * Implementations throw [tv.every.tilawah.android.app.AppError.AudioPermissionDenied]
 * when `RECORD_AUDIO` is not granted and
 * [tv.every.tilawah.android.app.AppError.AudioRecordingFailed] for
 * codec / focus / IO issues.
 */
interface Recorder {
    val state: StateFlow<RecorderState>

    /** Begin capture. Suspends only briefly; metering starts immediately. */
    suspend fun start()

    /** Stop capture and return the produced recording. */
    suspend fun stop(): RecordingResult

    /** Abandon an in-flight recording without producing output. */
    fun cancel()
}

/**
 * Snapshot consumed by Compose. [meters] is the rolling waveform
 * sample buffer (0.0..1.0); [durationMs] is the elapsed capture time.
 */
data class RecorderState(
    val isRecording: Boolean = false,
    val meters: List<Float> = emptyList(),
    val durationMs: Long = 0L,
)

data class RecordingResult(
    val file: File,
    val durationMs: Long,
)

/** Number of waveform samples kept in the rolling buffer (matches iOS). */
const val WAVEFORM_SAMPLE_COUNT: Int = 64
