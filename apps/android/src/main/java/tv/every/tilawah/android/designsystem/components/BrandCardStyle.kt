package tv.every.tilawah.android.designsystem.components

/**
 * Visual style for [BrandCard]. Top-level enum so callers can pass the
 * value through helper functions without locking a generic `Content`
 * type to a specific witness. Mirrors the iOS lesson where
 * `BrandCard<AnyView>.Style` could not be used as a parameter type and
 * had to be extracted.
 */
enum class BrandCardStyle {
    Standard,
    Inverse,
}
