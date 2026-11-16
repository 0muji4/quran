import SwiftUI
import XCTest
@testable import QuranRecitationApp

/// Renders the Library in each state, in every `RenderVariant` (ADR 0027).
@MainActor
final class LibraryContentSnapshotTests: XCTestCase {
  func test_resume() { snapshot(.loaded(Self.surahs), visible: Self.surahs, lastPracticed: Self.fatihaAyah3) }

  func test_getStarted() { snapshot(.loaded(Self.surahs), visible: Self.surahs) }

  func test_noMatch() { snapshot(.loaded(Self.surahs), query: "Yasin", lastPracticed: Self.fatihaAyah3) }

  func test_loading() { snapshot(.loading) }

  func test_failed() { snapshot(.failed(.network(underlying: URLError(.notConnectedToInternet)))) }

  private func snapshot(
    _ state: LibraryViewModel.LoadState,
    visible: [SurahSummary] = [],
    query: String = "",
    lastPracticed: LastPracticed? = nil,
    testName: String = #function,
    line: UInt = #line
  ) {
    let content = LibraryContent(
      state: state,
      visibleSurahs: visible,
      query: .constant(query),
      filter: .constant(.all),
      lastPracticed: lastPracticed,
      bestScores: ["1": 87, "2": 64],
      onResume: { _ in },
      onSurahOpened: { _ in },
      onRetry: {}
    )
    // In a navigation stack, as in the Library tab, so the large title and the
    // search field are drawn; at the height of the pinned simulator's screen
    // (iPhone 17 Pro), so the list runs to the bottom edge as on a device.
    let screen = NavigationStack { content }
      .frame(height: 874)
      .frame(maxHeight: .infinity, alignment: .top)
    for variant in RenderVariant.all {
      assertSnapshot(of: screen, in: variant, testName: testName, line: line)
    }
  }

  private static let surahs = [
    SurahSummary(id: "1", nameAr: "الفاتحة", nameEn: "Al-Fatiha", ayahCount: 7, revelationPlace: "Mecca"),
    SurahSummary(id: "2", nameAr: "البقرة", nameEn: "Al-Baqarah", ayahCount: 286, revelationPlace: "Medina"),
    SurahSummary(id: "3", nameAr: "آل عمران", nameEn: "Ali 'Imran", ayahCount: 200, revelationPlace: "Medina"),
    SurahSummary(id: "4", nameAr: "النساء", nameEn: "An-Nisa", ayahCount: 176, revelationPlace: "Medina"),
    SurahSummary(id: "5", nameAr: "المائدة", nameEn: "Al-Ma'idah", ayahCount: 120, revelationPlace: "Medina"),
    SurahSummary(id: "6", nameAr: "الأنعام", nameEn: "Al-An'am", ayahCount: 165, revelationPlace: "Mecca"),
    SurahSummary(id: "7", nameAr: "الأعراف", nameEn: "Al-A'raf", ayahCount: 206, revelationPlace: "Mecca"),
    SurahSummary(id: "8", nameAr: "الأنفال", nameEn: "Al-Anfal", ayahCount: 75, revelationPlace: "Medina"),
  ]

  /// Noon yesterday, so the card always reads "last practiced yesterday".
  private static let fatihaAyah3 = LastPracticed(
    surahId: "1",
    ayahNumber: 3,
    surahNameEn: "Al-Fatiha",
    surahNameAr: "الفاتحة",
    ayahCount: 7,
    practicedAt: Calendar.current.date(
      byAdding: .hour, value: -12, to: Calendar.current.startOfDay(for: Date()))!
  )
}
