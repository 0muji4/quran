package com.tilawah.android.app

import com.tilawah.android.BuildConfig

/**
 * Single source of truth for backend endpoints and platform identifiers.
 * Mirrors `apps/ios/Sources/QuranRecitationApp/App/AppConfig.swift`.
 *
 * The base URL comes from `BuildConfig.BFF_BASE_URL` (set in
 * `apps/android/build.gradle.kts`), which can be overridden at build
 * time via the `BFF_BASE_URL` gradle property or env var. Debug builds
 * default to `http://10.0.2.2:4000` (the Android emulator's alias for
 * the host machine's `localhost`).
 */
object AppConfig {
    val baseUrl: String = normalize(BuildConfig.BFF_BASE_URL)

    val graphqlUrl: String = "${baseUrl}graphql"

    val restBaseUrl: String = baseUrl

    /**
     * Logger / Trace tag for cross-platform telemetry. Mirrors the iOS
     * OSLog subsystem `com.tilawah.ios`. See `docs/telemetry.md`.
     */
    const val TELEMETRY_SUBSYSTEM: String = "com.tilawah.android"

    private fun normalize(url: String): String =
        if (url.endsWith("/")) url else "$url/"
}
