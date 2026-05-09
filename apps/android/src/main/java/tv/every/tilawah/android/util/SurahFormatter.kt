package com.quranproject.android.util

import com.quranproject.android.network.model.SignedUploadResponse
import com.quranproject.android.network.model.SurahSummary

fun summarizeSurah(surah: SurahSummary): String {
    return "${surah.nameEn} • ${surah.revelationPlace} • ${surah.ayahCount} ayahs"
}

fun describeUploadTarget(upload: SignedUploadResponse): String {
    return "PUT ${upload.url} (expires ${upload.expiresAt})"
}
