package com.tilawah.android.features.result

import androidx.annotation.StringRes
import com.tilawah.android.R

/**
 * Score band → verdict badge. Thresholds mirror the other clients so the
 * same numeric score never disagrees across platforms; computed locally
 * because the server `verdict` field is never populated.
 */
enum class VerdictBand(@StringRes val badgeRes: Int) {
    Awaiting(R.string.result_verdict_awaiting_badge),
    Mastered(R.string.result_verdict_mastered_badge),
    Great(R.string.result_verdict_great_badge),
    Midway(R.string.result_verdict_midway_badge),
    Beginner(R.string.result_verdict_beginner_badge),
}

/** `score` is the 0–100 value, or null before scoring resolves. */
fun verdictBandForScore(score: Int?): VerdictBand = when {
    score == null -> VerdictBand.Awaiting
    score >= 90 -> VerdictBand.Mastered
    score >= 70 -> VerdictBand.Great
    score >= 40 -> VerdictBand.Midway
    else -> VerdictBand.Beginner
}
