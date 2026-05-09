package com.tilawah.android.features.practice

import com.tilawah.android.app.AppError

/**
 * State machine for the Practice screen. Mirrors
 * `apps/ios/.../Features/Practice/PracticeState.swift` (`PracticeRecordingState`).
 * The View `when`s exhaustively against the sealed interface so a
 * future state addition (e.g. paused recording) is a compile-time
 * surface change.
 */
sealed interface PracticeState {

    data object Idle : PracticeState

    data class Recording(
        val meters: List<Float>,
        val durationMs: Long,
    ) : PracticeState

    data object Uploading : PracticeState

    data class Analysing(val step: AnalysingStep) : PracticeState

    data class Done(val score: Double?, val jobId: String) : PracticeState

    data class Error(val error: AppError) : PracticeState

    val isBusy: Boolean
        get() = this is Uploading || this is Analysing
}

/** Three-step progress shown while the worker scores a recording. */
enum class AnalysingStep {
    Transcribing,
    Comparing,
    Calculating,
}
