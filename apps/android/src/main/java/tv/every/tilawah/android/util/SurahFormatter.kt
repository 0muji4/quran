package tv.every.tilawah.android.util

import tv.every.tilawah.android.network.model.SignedUploadResponse
import tv.every.tilawah.android.network.model.SurahSummary

fun summarizeSurah(surah: SurahSummary): String {
    return "${surah.nameEn} • ${surah.revelationPlace} • ${surah.ayahCount} ayahs"
}

fun describeUploadTarget(upload: SignedUploadResponse): String {
    return "PUT ${upload.url} (expires ${upload.expiresAt})"
}
