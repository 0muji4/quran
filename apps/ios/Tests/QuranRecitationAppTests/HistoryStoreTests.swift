import Combine
import XCTest
@testable import QuranRecitationApp

final class HistoryStoreTests: XCTestCase {
  private var store: UserDefaultsHistoryStore!
  private var defaults: UserDefaults!
  private let suiteName = "tests.tilawah.history"

  override func setUp() {
    super.setUp()
    defaults = UserDefaults(suiteName: suiteName)!
    defaults.removePersistentDomain(forName: suiteName)
    store = UserDefaultsHistoryStore(defaults: defaults)
  }

  override func tearDown() {
    defaults.removePersistentDomain(forName: suiteName)
    store = nil
    defaults = nil
    super.tearDown()
  }

  func test_lastPracticed_roundTripsThroughUserDefaults() {
    let entry = LastPracticed(
      surahId: "1",
      ayahNumber: 4,
      surahNameEn: "Al-Fatihah",
      surahNameAr: "الفاتحة",
      ayahCount: 7,
      practicedAt: Date(timeIntervalSince1970: 1_700_000_000)
    )
    store.setLastPracticed(entry)
    XCTAssertEqual(store.lastPracticed(), entry)
  }

  func test_recordBestScore_keepsHighestScore() {
    let date = Date(timeIntervalSince1970: 1_700_000_000)
    store.recordBestScore(surahId: "1", ayahNumber: 1, score: 80, achievedAt: date)
    store.recordBestScore(surahId: "1", ayahNumber: 1, score: 70, achievedAt: date)
    store.recordBestScore(surahId: "1", ayahNumber: 1, score: 92, achievedAt: date)

    XCTAssertEqual(store.bestScore(surahId: "1", ayahNumber: 1)?.score, 92)
    XCTAssertEqual(store.bestScoresBySurah()["1"], 92)
  }

  func test_bestScoresBySurah_aggregatesAcrossAyat() {
    let date = Date()
    store.recordBestScore(surahId: "1", ayahNumber: 1, score: 80, achievedAt: date)
    store.recordBestScore(surahId: "1", ayahNumber: 2, score: 92, achievedAt: date)
    store.recordBestScore(surahId: "2", ayahNumber: 1, score: 100, achievedAt: date)

    XCTAssertEqual(store.bestScoresBySurah(), ["1": 92, "2": 100])
  }

  func test_changes_firesOnEveryWriteThatChangesTheCache() {
    var count = 0
    let subscription = store.changes.sink { count += 1 }
    defer { subscription.cancel() }
    let date = Date(timeIntervalSince1970: 1_700_000_000)

    store.setLastPracticed(LastPracticed(
      surahId: "1", ayahNumber: 1, surahNameEn: "Al-Fatihah", surahNameAr: "الفاتحة",
      ayahCount: 7, practicedAt: date
    ))
    store.recordBestScore(surahId: "1", ayahNumber: 1, score: 80, achievedAt: date)
    store.recordBestScore(surahId: "1", ayahNumber: 1, score: 70, achievedAt: date)
    store.recordAttempt(Attempt(
      id: "a1", surahId: "1", surahNameEn: "Al-Fatihah", ayahNumber: 1, score: 80,
      jobId: "j1", createdAt: date, status: .completed, durationMs: nil
    ))
    store.clear()

    XCTAssertEqual(count, 4, "the lower best score is not a write")
  }

  func test_recordAttempt_prependsAndCapsAtHistoryLimit() {
    for i in 0..<60 {
      store.recordAttempt(makeAttempt(id: "a\(i)"))
    }
    let recent = store.recentAttempts()
    XCTAssertEqual(recent.count, HistoryStoreConstants.historyLimit)
    XCTAssertEqual(recent.first?.id, "a59")
    XCTAssertEqual(recent.last?.id, "a10")
  }

  func test_recentAttempts_respectsLimit() {
    for i in 0..<10 {
      store.recordAttempt(makeAttempt(id: "a\(i)"))
    }
    XCTAssertEqual(store.recentAttempts(limit: 3).count, 3)
    XCTAssertEqual(store.recentAttempts(limit: 100).count, 10)
  }

  func test_clear_dropsAllPersistedRecords() {
    store.setLastPracticed(LastPracticed(
      surahId: "1", ayahNumber: 1,
      surahNameEn: "Al-Fatihah", surahNameAr: "الفاتحة",
      ayahCount: 7, practicedAt: Date()
    ))
    store.recordBestScore(surahId: "1", ayahNumber: 1, score: 88, achievedAt: Date())
    store.recordAttempt(makeAttempt(id: "a1"))

    store.clear()

    XCTAssertNil(store.lastPracticed())
    XCTAssertNil(store.bestScore(surahId: "1", ayahNumber: 1))
    XCTAssertEqual(store.recentAttempts(limit: 50), [])
  }

  // MARK: - Helpers

  private func makeAttempt(id: String) -> Attempt {
    Attempt(
      id: id,
      surahId: "1",
      surahNameEn: "Al-Fatihah",
      ayahNumber: 1,
      score: 88,
      jobId: "job-\(id)",
      createdAt: Date(),
      status: .completed,
      durationMs: 9000
    )
  }
}
