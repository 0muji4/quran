package com.tilawah.android.features.auth

/**
 * Identifies which auth flow a screen / ViewModel is rendering. Mirrors
 * `AuthMode` in `apps/web/app/(auth)/copy.ts` so the two platforms keep
 * the same vocabulary at the seams (telemetry events, screen names).
 */
enum class AuthMode {
    SignIn,
    SignUp,
}
