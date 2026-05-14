package com.tilawah.android.app

import androidx.annotation.StringRes
import com.tilawah.android.R

/**
 * Single error type that every layer (Backend, Audio, Storage) converts
 * to before throwing across protocol boundaries. Centralising error
 * vocabulary is what lets the View, telemetry, and retry policy share
 * one when() switch.
 *
 * Mirrors `apps/ios/Sources/QuranRecitationApp/App/AppError.swift`.
 * See ADR 0006 (layer boundaries) and ADR 0009 (i18n).
 */
sealed class AppError(message: String? = null, cause: Throwable? = null) :
    Throwable(message, cause) {

    data class Network(override val cause: Throwable) :
        AppError(message = "network", cause = cause)

    data class BackendUnavailable(val operation: String, override val cause: Throwable? = null) :
        AppError(message = "backend unavailable: $operation", cause = cause)

    data object AudioPermissionDenied : AppError(message = "audio permission denied")

    data class AudioRecordingFailed(override val cause: Throwable) :
        AppError(message = "audio recording failed", cause = cause)

    data class AudioPlaybackFailed(override val cause: Throwable) :
        AppError(message = "audio playback failed", cause = cause)

    data class ReferenceUnavailable(val surahId: String, val ayah: Int) :
        AppError(message = "reference audio unavailable for $surahId:$ayah")

    data object ScoringTimeout : AppError(message = "scoring timed out")

    data object StorageUnavailable : AppError(message = "storage unavailable")

    /** BFF `POST /auth/login` returned 401. */
    data object InvalidCredentials : AppError(message = "invalid email or password")

    /** BFF `POST /auth/signup` returned 409 — email already in use. */
    data object EmailInUse : AppError(message = "email already in use")

    /** BFF returned 400 — request body failed Zod validation. */
    data class ValidationFailed(val reason: String) :
        AppError(message = "validation failed: $reason")

    /**
     * Whether the action that produced this error can be retried as-is
     * (without user intervention beyond a button tap). Drives the
     * choice between "Replay" and "Record again" in the Practice
     * error panel.
     */
    val isRetriable: Boolean
        get() = when (this) {
            is Network, is BackendUnavailable, ScoringTimeout -> true
            AudioPermissionDenied, is AudioRecordingFailed, is AudioPlaybackFailed,
            is ReferenceUnavailable, StorageUnavailable,
            InvalidCredentials, EmailInUse, is ValidationFailed -> false
        }

    /**
     * Stable identifier emitted as the `error_code` attribute on
     * telemetry events such as `practice.scoring.failed`. See
     * `docs/telemetry.md` and `apps/ios/.../Telemetry/Telemetry.swift`.
     */
    val telemetryCode: String
        get() = when (this) {
            is Network -> "network"
            is BackendUnavailable -> "backend_unavailable"
            AudioPermissionDenied -> "audio_permission_denied"
            is AudioRecordingFailed -> "audio_recording_failed"
            is AudioPlaybackFailed -> "audio_playback_failed"
            is ReferenceUnavailable -> "reference_unavailable"
            ScoringTimeout -> "scoring_timeout"
            StorageUnavailable -> "storage_unavailable"
            InvalidCredentials -> "invalid_credentials"
            EmailInUse -> "email_in_use"
            is ValidationFailed -> "validation_failed"
        }

    /**
     * @StringRes for the user-facing title. Resolve via
     * `stringResource(error.titleRes)` in Composables or
     * `context.getString(error.titleRes)` elsewhere.
     */
    @get:StringRes
    val titleRes: Int
        get() = when (this) {
            is Network -> R.string.error_network_title
            is BackendUnavailable -> R.string.error_backend_unavailable_title
            AudioPermissionDenied -> R.string.error_audio_permission_denied_title
            is AudioRecordingFailed -> R.string.error_audio_recording_failed_title
            is AudioPlaybackFailed -> R.string.error_audio_playback_failed_title
            is ReferenceUnavailable -> R.string.error_reference_unavailable_title
            ScoringTimeout -> R.string.error_scoring_timeout_title
            StorageUnavailable -> R.string.error_storage_unavailable_title
            InvalidCredentials -> R.string.error_invalid_credentials_title
            EmailInUse -> R.string.error_email_in_use_title
            is ValidationFailed -> R.string.error_validation_failed_title
        }

    @get:StringRes
    val recoveryRes: Int
        get() = when (this) {
            is Network -> R.string.error_network_recovery
            is BackendUnavailable -> R.string.error_backend_unavailable_recovery
            AudioPermissionDenied -> R.string.error_audio_permission_denied_recovery
            is AudioRecordingFailed -> R.string.error_audio_recording_failed_recovery
            is AudioPlaybackFailed -> R.string.error_audio_playback_failed_recovery
            is ReferenceUnavailable -> R.string.error_reference_unavailable_recovery
            ScoringTimeout -> R.string.error_scoring_timeout_recovery
            StorageUnavailable -> R.string.error_storage_unavailable_recovery
            InvalidCredentials -> R.string.error_invalid_credentials_recovery
            EmailInUse -> R.string.error_email_in_use_recovery
            is ValidationFailed -> R.string.error_validation_failed_recovery
        }
}
