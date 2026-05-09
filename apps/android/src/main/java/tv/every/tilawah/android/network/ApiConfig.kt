package com.quranproject.android.network

import com.quranproject.android.BuildConfig

object ApiConfig {
    val baseUrl: String by lazy {
        val envOverride = System.getenv("BFF_BASE_URL")?.takeIf { it.isNotBlank() }
        normalizeBaseUrl(envOverride ?: BuildConfig.BFF_BASE_URL)
    }

    private fun normalizeBaseUrl(url: String): String {
        return if (url.endsWith("/")) url else "$url/"
    }
}
