package com.tilawah.android.designsystem.components

/**
 * Visual style for [BrandCard]. Top-level enum so callers can pass the
 * value through helper functions without locking a generic `Content`
 * type to a specific witness. Mirrors the iOS lesson where
 * `BrandCard<AnyView>.Style` could not be used as a parameter type and
 * had to be extracted.
 */
enum class BrandCardStyle {
    /** Warm off-white card (search field, soft panels). */
    Standard,

    /** Pure-white card surface (surah list rows, result panels). */
    Paper,

    /** Dark inverse surface (Continue card, Recording panel). */
    Inverse,
}
