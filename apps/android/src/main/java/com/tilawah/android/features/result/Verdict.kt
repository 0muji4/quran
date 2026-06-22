package com.tilawah.android.features.result

import androidx.annotation.StringRes
import com.tilawah.android.R

/**
 * Score band → verdict badge. Thresholds mirror the other clients so the
 * same numeric score never disagrees across platforms; computed locally
 * because the server `verdict` field is never populated.
 */
enum class VerdictBand(
    @StringRes val badgeRes: Int,
    @StringRes val headlineRes: Int,
    @StringRes val subheadRes: Int,
) {
    Awaiting(
        R.string.result_verdict_awaiting_badge,
        R.string.result_verdict_awaiting_headline,
        R.string.result_verdict_awaiting_subhead,
    ),
    Mastered(
        R.string.result_verdict_mastered_badge,
        R.string.result_verdict_mastered_headline,
        R.string.result_verdict_mastered_subhead,
    ),
    Great(
        R.string.result_verdict_great_badge,
        R.string.result_verdict_great_headline,
        R.string.result_verdict_great_subhead,
    ),
    Midway(
        R.string.result_verdict_midway_badge,
        R.string.result_verdict_midway_headline,
        R.string.result_verdict_midway_subhead,
    ),
    Beginner(
        R.string.result_verdict_beginner_badge,
        R.string.result_verdict_beginner_headline,
        R.string.result_verdict_beginner_subhead,
    ),
}

/** `score` is the 0–100 value, or null before scoring resolves. */
fun verdictBandForScore(score: Int?): VerdictBand = when {
    score == null -> VerdictBand.Awaiting
    score >= 90 -> VerdictBand.Mastered
    score >= 70 -> VerdictBand.Great
    score >= 40 -> VerdictBand.Midway
    else -> VerdictBand.Beginner
}
