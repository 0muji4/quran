package tv.every.tilawah.android.features.history

/**
 * Filter chips on the History tab. `All` is the default; `Surah(id, nameEn)`
 * narrows to one surah. Mirrors `HistoryViewModel.Filter` on iOS.
 */
sealed interface HistoryFilter {
    data object All : HistoryFilter
    data class Surah(val id: String, val nameEn: String) : HistoryFilter
}
