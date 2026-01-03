import Foundation

struct SurahSummary: Identifiable {
  let id: Int
  let nameAr: String
  let nameEn: String
  let ayahCount: Int
  let revelationPlace: String
}

func summarizeSurah(_ surah: SurahSummary) -> String {
  "\(surah.nameEn) • \(surah.revelationPlace) • \(surah.ayahCount) ayahs"
}
