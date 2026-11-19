import SwiftUI
import XCTest
@testable import QuranRecitationApp

/// Renders History in each state, in every `RenderVariant` (ADR 0027).
@MainActor
final class HistoryContentSnapshotTests: XCTestCase {
  func test_all() { snapshot(attempts: Self.attempts) }

  func test_filtered() {
    snapshot(attempts: Self.attempts, filter: .surah(id: "1", nameEn: "Al-Fatiha"))
  }

  func test_empty() { snapshot(attempts: []) }

  func test_signedOut() { snapshot(attempts: [], isSignedIn: false) }

  private func snapshot(
    attempts: [Attempt],
    filter: HistoryViewModel.Filter = .all,
    isSignedIn: Bool = true,
    testName: String = #function,
    line: UInt = #line
  ) {
    let visible: [Attempt]
    switch filter {
    case .all: visible = attempts
    case .surah(let id, _): visible = attempts.filter { $0.surahId == id }
    }
    let content = HistoryContent(
      attempts: attempts,
      visibleAttempts: visible,
      filter: .constant(filter),
      filterOptions: Self.options,
      isSignedIn: isSignedIn,
      now: Self.now
    )
    // In a navigation stack, as in the History tab, so the large title and the
    // filter menu button are drawn; at the height of the pinned simulator's
    // screen (iPhone 17 Pro), so the list runs to the bottom edge as on a device.
    let screen = NavigationStack { content }
      .frame(height: 874)
      .frame(maxHeight: .infinity, alignment: .top)
    for variant in RenderVariant.all {
      assertSnapshot(of: screen, in: variant, testName: testName, line: line)
    }
  }

  // A fixed clock and fixed times, so the totals and the "Today" / "Yesterday"
  // labels read the same on every run.
  private static let calendar = Calendar.current
  private static let today = calendar.date(from: DateComponents(year: 2026, month: 11, day: 19))!
  private static let now = at(daysAgo: 0, hour: 18, minute: 0)

  private static func at(daysAgo: Int, hour: Int, minute: Int) -> Date {
    let day = calendar.date(byAdding: .day, value: -daysAgo, to: today)!
    return calendar.date(bySettingHour: hour, minute: minute, second: 0, of: day)!
  }

  private static func attempt(
    _ id: String, surahId: String, surahNameEn: String, ayah: Int,
    daysAgo: Int, hour: Int, minute: Int, score: Int?
  ) -> Attempt {
    Attempt(
      id: id,
      surahId: surahId,
      surahNameEn: surahNameEn,
      ayahNumber: ayah,
      score: score,
      jobId: "job-\(id)",
      createdAt: at(daysAgo: daysAgo, hour: hour, minute: minute),
      status: .completed,
      durationMs: nil
    )
  }

  /// Newest first, as the history store returns them; one is still being scored.
  private static let attempts = [
    attempt("a1", surahId: "1", surahNameEn: "Al-Fatiha", ayah: 3, daysAgo: 0, hour: 14, minute: 2, score: 87),
    attempt("a2", surahId: "1", surahNameEn: "Al-Fatiha", ayah: 2, daysAgo: 0, hour: 13, minute: 48, score: 64),
    attempt("a3", surahId: "36", surahNameEn: "Ya-Sin", ayah: 1, daysAgo: 1, hour: 20, minute: 15, score: 92),
    attempt("a4", surahId: "2", surahNameEn: "Al-Baqarah", ayah: 255, daysAgo: 1, hour: 19, minute: 40, score: 38),
    attempt("a5", surahId: "67", surahNameEn: "Al-Mulk", ayah: 1, daysAgo: 4, hour: 8, minute: 30, score: nil),
    attempt("a6", surahId: "1", surahNameEn: "Al-Fatiha", ayah: 1, daysAgo: 4, hour: 8, minute: 10, score: 75),
    attempt("a7", surahId: "2", surahNameEn: "Al-Baqarah", ayah: 1, daysAgo: 5, hour: 21, minute: 5, score: 58),
  ]

  private static let options: [HistoryViewModel.Filter] = [
    .all,
    .surah(id: "1", nameEn: "Al-Fatiha"),
    .surah(id: "36", nameEn: "Ya-Sin"),
    .surah(id: "2", nameEn: "Al-Baqarah"),
    .surah(id: "67", nameEn: "Al-Mulk"),
  ]
}
