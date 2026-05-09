package tv.every.tilawah.android.audio

import kotlinx.coroutines.flow.StateFlow

/**
 * Audio playback surface used by the Practice (teacher reference) and
 * Result (listen-back) screens. Mirrors iOS `AudioPlayer`.
 *
 * Implementations throw
 * [tv.every.tilawah.android.app.AppError.AudioPlaybackFailed] when
 * the source fails to load or playback is denied audio focus.
 */
interface Player {
    val state: StateFlow<PlayerState>

    /** Load a remote URL or local file path; resets the player. */
    suspend fun load(source: String)

    fun play()
    fun pause()
    fun stop()
    fun seekTo(positionMs: Long)
    fun setRate(rate: Float)
    fun release()
}

data class PlayerState(
    val isLoading: Boolean = false,
    val isPlaying: Boolean = false,
    val currentMs: Long = 0L,
    val durationMs: Long = 0L,
    val rate: Float = 1.0f,
)
