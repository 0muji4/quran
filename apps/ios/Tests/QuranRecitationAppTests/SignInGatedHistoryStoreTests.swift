import XCTest
@testable import QuranRecitationApp

final class SignInGatedHistoryStoreTests: XCTestCase {
  private var signedIn = false

  private func makeStore(base: HistoryStore) -> SignInGatedHistoryStore {
    SignInGatedHistoryStore(base: base) { [weak self] in
      self?.signedIn ?? false
    }
  }

  // MARK: - Reads return empty when signed out (even if base has data)

  func test_lastPracticed_anonymous_returnsNilDespiteBaseData() {
    let base = InMemoryHistoryStore(lastPracticed: Self.lastPracticedFixture)
    let store = makeStore(base: base)
    signedIn = false

    XCTAssertNil(store.lastPracticed())
  }

  func test_lastPracticed_signedIn_delegatesToBase() {
    let base = InMemoryHistoryStore(lastPracticed: Self.lastPracticedFixture)
    let store = makeStore(base: base)
    signedIn = true

    XCTAssertEqual(store.lastPracticed(), Self.lastPracticedFixture)
  }

  func test_recentAttempts_anonymous_returnsEmptyDespiteBaseData() {
    let base = InMemoryHistoryStore(attempts: [Self.attemptFixture])
    let store = makeStore(base: base)
    signedIn = false

    XCTAssertEqual(store.recentAttempts(limit: 50), [])
  }

  func test_bestScore_anonymous_returnsNilDespiteBaseData() {
    let base = InMemoryHistoryStore(bestScores: [
      "1:1": BestScoreEntry(score: 90, achievedAt: Date())
    ])
    let store = makeStore(base: base)
    signedIn = false

    XCTAssertNil(store.bestScore(surahId: "1", ayahNumber: 1))
    XCTAssertNil(store.bestScore(forSurah: "1"))
  }

  // MARK: - Writes drop on the floor when signed out

  func test_setLastPracticed_anonymous_doesNotReachBase() {
    let base = InMemoryHistoryStore()
    let store = makeStore(base: base)
    signedIn = false

    store.setLastPracticed(Self.lastPracticedFixture)

    XCTAssertNil(base.lastPracticed(), "anonymous write must not leak into the base store")
  }

  func test_recordAttempt_anonymous_doesNotReachBase() {
    let base = InMemoryHistoryStore()
    let store = makeStore(base: base)
    signedIn = false

    store.recordAttempt(Self.attemptFixture)

    XCTAssertEqual(base.recentAttempts(limit: 50), [])
  }

  func test_recordBestScore_anonymous_doesNotReachBase() {
    let base = InMemoryHistoryStore()
    let store = makeStore(base: base)
    signedIn = false

    store.recordBestScore(surahId: "1", ayahNumber: 1, score: 90, achievedAt: Date())

    XCTAssertNil(base.bestScore(surahId: "1", ayahNumber: 1))
  }

  // MARK: - Writes delegate when signed in

  func test_recordAttempt_signedIn_reachesBase() {
    let base = InMemoryHistoryStore()
    let store = makeStore(base: base)
    signedIn = true

    store.recordAttempt(Self.attemptFixture)

    XCTAssertEqual(base.recentAttempts(limit: 50), [Self.attemptFixture])
  }

  // MARK: - Sign-in flip preserves base data through the flip

  func test_signInFlip_dataInBaseSurvivesAcrossFlip() {
    // Recorded while signed in, then signed-out reads return empty,
    // then signed-in reads return the original data. Demonstrates
    // the gate is a presentation filter, not a destructive op.
    let base = InMemoryHistoryStore()
    let store = makeStore(base: base)
    signedIn = true
    store.recordAttempt(Self.attemptFixture)

    signedIn = false
    XCTAssertEqual(store.recentAttempts(limit: 50), [])

    signedIn = true
    XCTAssertEqual(store.recentAttempts(limit: 50), [Self.attemptFixture])
  }

  // MARK: - Clear always delegates

  func test_clear_anonymous_stillWipesBase() {
    // ADR 0021: SessionStore.signOut() clears the cache regardless of
    // current session state. If `clear()` honoured the gate it would
    // be a no-op precisely when we need it most.
    let base = InMemoryHistoryStore(
      lastPracticed: Self.lastPracticedFixture,
      bestScores: ["1:1": BestScoreEntry(score: 90, achievedAt: Date())],
      attempts: [Self.attemptFixture]
    )
    let store = makeStore(base: base)
    signedIn = false

    store.clear()

    XCTAssertNil(base.lastPracticed())
    XCTAssertNil(base.bestScore(surahId: "1", ayahNumber: 1))
    XCTAssertEqual(base.recentAttempts(limit: 50), [])
  }

  // MARK: - Fixtures

  private static let lastPracticedFixture = LastPracticed(
    surahId: "1",
    ayahNumber: 3,
    surahNameEn: "Al-Fatihah",
    surahNameAr: "الفاتحة",
    ayahCount: 7,
    practicedAt: Date(timeIntervalSince1970: 1_700_000_000)
  )

  private static let attemptFixture = Attempt(
    id: "attempt-1",
    surahId: "1",
    surahNameEn: "Al-Fatihah",
    ayahNumber: 3,
    score: 87,
    jobId: "job-1",
    createdAt: Date(timeIntervalSince1970: 1_700_000_000),
    status: .completed,
    durationMs: 4200
  )
}
