import Foundation

/// Returns a one-line metadata string for a surah row
/// ("Al-Fatihah • Mecca • 7 ayahs").
func summarizeSurah(_ surah: SurahSummary) -> String {
  "\(surah.nameEn) • \(surah.revelationPlace) • \(surah.ayahCount) ayahs"
}
