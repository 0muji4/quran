package tv.every.tilawah.android.audio

import android.media.MediaPlayer
import android.media.PlaybackParams
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
import kotlinx.coroutines.suspendCancellableCoroutine
import tv.every.tilawah.android.app.AppError
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

/**
 * [Player] backed by [android.media.MediaPlayer]. Sufficient for the
 * teacher-reference and listen-back use cases (single signed URL,
 * pause / resume, rate change). Future swap to ExoPlayer is a single
 * implementation change at the [Player] interface.
 */
class MediaPlayerPlayer(
    private val focus: AudioFocusCoordinator,
    private val scope: CoroutineScope = CoroutineScope(SupervisorJob() + Dispatchers.Main),
) : Player {

    private val _state = MutableStateFlow(PlayerState())
    override val state: StateFlow<PlayerState> = _state.asStateFlow()

    private var player: MediaPlayer? = null
    private var positionJob: Job? = null

    override suspend fun load(source: String) {
        _state.update { it.copy(isLoading = true, isPlaying = false, currentMs = 0L) }
        releasePlayer()
        try {
            val mp = MediaPlayer()
            mp.setDataSource(source)
            suspendCancellableCoroutine<Unit> { cont ->
                mp.setOnPreparedListener { cont.resume(Unit) }
                mp.setOnErrorListener { _, what, extra ->
                    cont.resumeWithException(
                        AppError.AudioPlaybackFailed(
                            IllegalStateException("MediaPlayer error what=$what extra=$extra")
                        )
                    )
                    true
                }
                mp.prepareAsync()
            }
            mp.setOnCompletionListener {
                positionJob?.cancel()
                _state.update { it.copy(isPlaying = false, currentMs = it.durationMs) }
            }
            player = mp
            _state.update {
                it.copy(
                    isLoading = false,
                    durationMs = mp.duration.coerceAtLeast(0).toLong(),
                )
            }
        } catch (cause: AppError) {
            _state.update { PlayerState() }
            throw cause
        } catch (cause: Throwable) {
            _state.update { PlayerState() }
            throw AppError.AudioPlaybackFailed(cause)
        }
    }

    override fun play() {
        val mp = player ?: return
        focus.ensureMode(AudioFocusCoordinator.Mode.Playback, onLoss = ::pause)
        mp.start()
        _state.update { it.copy(isPlaying = true) }
        startPositionLoop()
    }

    override fun pause() {
        player?.takeIf { it.isPlaying }?.pause()
        positionJob?.cancel()
        _state.update { it.copy(isPlaying = false) }
    }

    override fun stop() {
        positionJob?.cancel()
        player?.let {
            runCatching { it.stop() }
            it.seekTo(0)
        }
        focus.release()
        _state.update { it.copy(isPlaying = false, currentMs = 0L) }
    }

    override fun seekTo(positionMs: Long) {
        player?.seekTo(positionMs.toInt())
        _state.update { it.copy(currentMs = positionMs) }
    }

    override fun setRate(rate: Float) {
        val mp = player ?: return
        runCatching {
            mp.playbackParams = PlaybackParams().setSpeed(rate)
        }
        _state.update { it.copy(rate = rate) }
    }

    override fun release() {
        positionJob?.cancel()
        releasePlayer()
        focus.release()
        _state.value = PlayerState()
    }

    private fun startPositionLoop() {
        positionJob?.cancel()
        positionJob = scope.launch {
            while (true) {
                delay(POSITION_POLL_MS)
                val mp = player ?: break
                if (!mp.isPlaying) break
                _state.update { it.copy(currentMs = mp.currentPosition.toLong()) }
            }
        }
    }

    private fun releasePlayer() {
        player?.let { runCatching { it.release() } }
        player = null
    }

    private companion object {
        const val POSITION_POLL_MS = 200L
    }
}
