package com.quran.android.features.library

/**
 * Difficulty / origin filter shown as the bottom row of chips on the
 * Library tab. `All` is the default; the other cases group surahs by
 * revelation place + length so users can warm up on shorter Meccan
 * surahs before tackling longer Medinan ones. Mirrors
 * `LibraryViewModel.Filter` on iOS.
 */
enum class LibraryFilter {
    All,
    Mecca,
    Medina,
    Short,
    ;

    companion object {
        /** Surahs of "Al-Ikhlas" length or shorter. Used by `Short`. */
        const val SHORT_AYAH_CUTOFF = 20
    }
}
