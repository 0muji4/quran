package com.tilawah.android.features.profile

/**
 * Selectable reference reciter. A single entry today, modelled as a table
 * so a future reciters API drops in without a UI rewrite. Ids match the
 * BFF's `KNOWN_RECITER_IDS`.
 */
data class ReciterOption(val id: String, val label: String, val helper: String) {
    companion object {
        const val FallbackId = "husary-muallim"

        val All = listOf(
            ReciterOption(FallbackId, "Husary Mu'allim", "Slow teaching pace"),
        )

        /**
         * The option matching [id], or the first as a safe fallback so an
         * unknown stored id (e.g. a reciter added server-side later) still
         * renders rather than blanking the row.
         */
        fun forId(id: String): ReciterOption = All.firstOrNull { it.id == id } ?: All.first()
    }
}

/** Allowed default-playback-speed steps. Bounds match the BFF validation ([0.5, 2.0]). */
object PlaybackSpeedOption {
    val All = listOf(0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0)

    /** "1×" / "0.75×" — trailing zeros trimmed. */
    fun label(speed: Double): String {
        val whole = speed % 1.0 == 0.0
        val number = if (whole) speed.toInt().toString() else speed.toString().trimEnd('0').trimEnd('.')
        return "${number}×"
    }
}

/**
 * Bridges the wire's "HH:mm" reminder string and the hour/minute a time
 * picker works in. Pure so the round-trip (and the malformed-input
 * fallback) is unit-testable without a composable.
 */
object ReminderClock {
    /**
     * Parses "HH:mm" into 24-hour components, falling back to 08:00 (the
     * column default) for anything that doesn't match — a picker always
     * needs a concrete time to show.
     */
    fun parse(hhmm: String): Pair<Int, Int> {
        val parts = hhmm.split(":")
        val hour = parts.getOrNull(0)?.toIntOrNull()
        val minute = parts.getOrNull(1)?.toIntOrNull()
        return if (parts.size == 2 && hour != null && minute != null &&
            hour in 0..23 && minute in 0..59
        ) {
            hour to minute
        } else {
            8 to 0
        }
    }

    /** Zero-padded "HH:mm" matching the BFF regex and the TIME column. */
    fun format(hour: Int, minute: Int): String = "%02d:%02d".format(hour, minute)

    /** Human 12-hour label for display, e.g. "8:00 AM". */
    fun displayLabel(hhmm: String): String {
        val (hour, minute) = parse(hhmm)
        val period = if (hour < 12) "AM" else "PM"
        val hour12 = when {
            hour == 0 -> 12
            hour > 12 -> hour - 12
            else -> hour
        }
        return "%d:%02d %s".format(hour12, minute, period)
    }
}
