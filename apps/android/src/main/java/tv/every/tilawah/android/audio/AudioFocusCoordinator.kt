package tv.every.tilawah.android.audio

import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import tv.every.tilawah.android.app.AppError

/**
 * Centralises `AudioFocus` requests so the recorder and the player do
 * not race for the route. Mirrors the iOS
 * `AudioSessionCoordinator.ensureMode(.playback | .record | .idle)`
 * pattern.
 *
 * Loss callbacks are routed to [onFocusLoss], which the active client
 * is expected to wire when it acquires the focus (so it can pause /
 * stop and surface an [AppError]).
 */
class AudioFocusCoordinator(private val audioManager: AudioManager) {

    enum class Mode { Idle, Playback, Record }

    @Volatile private var currentMode: Mode = Mode.Idle
    @Volatile private var currentRequest: AudioFocusRequest? = null
    @Volatile private var onFocusLoss: (() -> Unit)? = null

    private val listener = AudioManager.OnAudioFocusChangeListener { change ->
        if (change == AudioManager.AUDIOFOCUS_LOSS ||
            change == AudioManager.AUDIOFOCUS_LOSS_TRANSIENT
        ) {
            onFocusLoss?.invoke()
        }
    }

    /**
     * Ensure the requested [mode] holds audio focus. No-op if the same
     * mode is already active. Throws [AppError.AudioPlaybackFailed] /
     * [AppError.AudioRecordingFailed] when the system denies focus.
     */
    @Synchronized
    fun ensureMode(mode: Mode, onLoss: () -> Unit = {}) {
        if (mode == currentMode && currentRequest != null) {
            onFocusLoss = onLoss
            return
        }
        releaseCurrent()
        if (mode == Mode.Idle) {
            currentMode = Mode.Idle
            return
        }
        val usage = when (mode) {
            Mode.Playback -> AudioAttributes.USAGE_MEDIA
            Mode.Record -> AudioAttributes.USAGE_VOICE_COMMUNICATION
            Mode.Idle -> error("unreachable")
        }
        val attrs = AudioAttributes.Builder()
            .setUsage(usage)
            .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
            .build()
        val request = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
            .setAudioAttributes(attrs)
            .setOnAudioFocusChangeListener(listener)
            .setAcceptsDelayedFocusGain(false)
            .build()
        val outcome = audioManager.requestAudioFocus(request)
        if (outcome != AudioManager.AUDIOFOCUS_REQUEST_GRANTED) {
            currentRequest = null
            currentMode = Mode.Idle
            throw when (mode) {
                Mode.Playback -> AppError.AudioPlaybackFailed(
                    IllegalStateException("audio focus denied")
                )
                Mode.Record -> AppError.AudioRecordingFailed(
                    IllegalStateException("audio focus denied")
                )
                Mode.Idle -> error("unreachable")
            }
        }
        currentRequest = request
        currentMode = mode
        onFocusLoss = onLoss
    }

    @Synchronized
    fun release() {
        releaseCurrent()
        currentMode = Mode.Idle
    }

    private fun releaseCurrent() {
        currentRequest?.let { audioManager.abandonAudioFocusRequest(it) }
        currentRequest = null
        onFocusLoss = null
    }
}
