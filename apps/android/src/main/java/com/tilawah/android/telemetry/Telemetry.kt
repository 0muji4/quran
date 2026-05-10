package com.tilawah.android.telemetry

import com.tilawah.android.app.AppError

/**
 * Cross-cutting telemetry surface. Every layer can emit product-level
 * events, time-bounded measurements, and errors through this single
 * interface. Implementations are swappable: [TraceTelemetry] ships the
 * production surface (androidx.tracing + Log.d) and [NoOpTelemetry] is
 * used by tests and Compose previews.
 *
 * Mirrors `apps/ios/Sources/QuranRecitationApp/Telemetry/Telemetry.swift`.
 * See ADR 0008 for the rationale and `docs/telemetry.md` for the
 * cross-platform event catalogue.
 */
interface Telemetry {
    /**
     * Fire a discrete event. [name] must be one of [TelemetryEvent.*]
     * to keep the cross-platform taxonomy consistent.
     */
    fun event(name: String, attributes: Map<String, String> = emptyMap())

    /**
     * Time the duration of a suspending operation. On success or
     * failure, a `<name>.succeeded` / `<name>.failed` event is emitted
     * with `duration_ms`. Implementations also emit Trace sections so
     * the region appears in Perfetto / Studio Profiler timelines.
     */
    suspend fun <T> measure(name: String, block: suspend () -> T): T

    /**
     * Log a recoverable or user-visible error. Writes the stable
     * `AppError.telemetryCode` so dashboards group by failure mode.
     */
    fun error(error: AppError, context: Map<String, String> = emptyMap())
}

/**
 * Stable event names. Centralised so a typo or rename touches one
 * place and so the cross-platform telemetry catalogue can be diffed
 * against the iOS / web codebases. Keep in sync with
 * `apps/ios/Sources/QuranRecitationApp/Telemetry/Telemetry.swift` and
 * `docs/telemetry.md`.
 */
object TelemetryEvent {
    // Library
    const val LIBRARY_TAB_SELECTED = "library.tab.selected"
    const val LIBRARY_SURAH_OPENED = "library.surah.opened"
    const val LIBRARY_CONTINUE_TAPPED = "library.continue.tapped"

    // Practice
    const val PRACTICE_REFERENCE_PLAYED = "practice.reference.played"
    const val PRACTICE_RECORDING_STARTED = "practice.recording.started"
    const val PRACTICE_RECORDING_STOPPED = "practice.recording.stopped"
    const val PRACTICE_UPLOAD_COMPLETED = "practice.upload.completed"
    const val PRACTICE_SCORING_COMPLETED = "practice.scoring.completed"
    const val PRACTICE_SCORING_FAILED = "practice.scoring.failed"

    // Result
    const val RESULT_TRY_AGAIN_TAPPED = "result.try_again.tapped"
    const val RESULT_CONTINUE_TAPPED = "result.continue.tapped"
}

/** Stable attribute keys for cross-platform consistency. */
object TelemetryAttribute {
    const val SURAH_ID = "surah_id"
    const val AYAH = "ayah"
    const val AYAH_NUMBER = "ayah_number"
    const val NEXT_AYAH = "next_ayah"
    const val DURATION_MS = "duration_ms"
    const val ERROR_CODE = "error_code"
}
