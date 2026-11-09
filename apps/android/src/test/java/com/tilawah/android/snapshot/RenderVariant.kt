package com.tilawah.android.snapshot

/** One of the 8 renderings every snapshot is taken in (ADR 0027). */
data class RenderVariant(
    val dark: Boolean,
    val largeText: Boolean,
    val rightToLeft: Boolean,
) {
    /** File-name suffix, for example `dark_large_rtl`. */
    val id: String =
        listOf(
            if (dark) "dark" else "light",
            if (largeText) "large" else "default",
            if (rightToLeft) "rtl" else "ltr",
        ).joinToString("_")

    /** Robolectric qualifiers added on top of [SNAPSHOT_DEVICE]. */
    val qualifiers: String =
        listOf(
            if (rightToLeft) "+ar" else "+en",
            if (dark) "+night" else "+notnight",
        ).joinToString(" ")

    val fontScale: Float = if (largeText) LARGE_FONT_SCALE else 1f

    override fun toString(): String = id

    companion object {
        private const val LARGE_FONT_SCALE = 1.3f

        val all: List<RenderVariant> =
            listOf(false, true).flatMap { dark ->
                listOf(false, true).flatMap { largeText ->
                    listOf(false, true).map { rtl -> RenderVariant(dark, largeText, rtl) }
                }
            }
    }
}
