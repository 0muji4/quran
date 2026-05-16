import XCTest
@testable import QuranRecitationApp

@MainActor
final class RemoteSyncedHistoryStoreTests: XCTestCase {
  private let entry = LastPracticed(
    surahId: "1",
    ayahNumber: 3,
    surahNameEn: "Al-Fatihah",
    surahNameAr: "الفاتحة",
    ayahCount: 7,
    practicedAt: Date(timeIntervalSince1970: 1_700_000_000)
  )

  private let attemptOne = Attempt(
    id: "att-1",
    surahId: "1",
    surahNameEn: "Al-Fatihah",
    ayahNumber: 1,
    score: 88,
    jobId: "job-1",
    createdAt: Date(timeIntervalSince1970: 1_700_000_000),
    status: .completed,
    durationMs: 4200
  )

  private let attemptTwo = Attempt(
    id: "att-2",
    surahId: "1",
    surahNameEn: "Al-Fatihah",
    ayahNumber: 2,
    score: 92,
    jobId: "job-2",
    createdAt: Date(timeIntervalSince1970: 1_700_001_000),
    status: .completed,
    durationMs: 5100
  )

  // MARK: - Reads pass through to the cache

  func test_lastPracticed_returnsCacheValue() {
    let cache = InMemoryHistoryStore(lastPracticed: entry)
    let store = RemoteSyncedHistoryStore(cache: cache, me: MockMeClient())

    XCTAssertEqual(store.lastPracticed(), entry)
  }

  func test_bestScore_returnsCacheValue() {
    let cache = InMemoryHistoryStore(bestScores: [
      "1:1": BestScoreEntry(score: 88, achievedAt: Date(timeIntervalSince1970: 1_700_000_000))
    ])
    let store = RemoteSyncedHistoryStore(cache: cache, me: MockMeClient())

    XCTAssertEqual(store.bestScore(surahId: "1", ayahNumber: 1)?.score, 88)
    XCTAssertEqual(store.bestScore(forSurah: "1"), 88)
  }

  func test_recentAttempts_returnsCacheValue() {
    let cache = InMemoryHistoryStore(attempts: [attemptTwo, attemptOne])
    let store = RemoteSyncedHistoryStore(cache: cache, me: MockMeClient())

    XCTAssertEqual(store.recentAttempts(limit: 50), [attemptTwo, attemptOne])
  }

  // MARK: - Writes update cache synchronously and fire BFF in the background

  func test_setLastPracticed_updatesCacheAndCallsRemote() async {
    let me = MockMeClient(putLastPracticedResult: .success(entry))
    let cache = InMemoryHistoryStore()
    let store = RemoteSyncedHistoryStore(cache: cache, me: me)

    store.setLastPracticed(entry)
    XCTAssertEqual(cache.lastPracticed(), entry, "cache update is synchronous")

    await Self.drainBackgroundTasks()
    XCTAssertEqual(me.putLastPracticedCallCount, 1)
    XCTAssertEqual(me.lastPutLastPracticed, entry)
  }

  func test_recordBestScore_updatesCacheAndCallsRemote() async {
    let achievedAt = Date(timeIntervalSince1970: 1_700_000_000)
    let me = MockMeClient(
      putBestScoreResult: .success(BestScoreEntry(score: 88, achievedAt: achievedAt))
    )
    let cache = InMemoryHistoryStore()
    let store = RemoteSyncedHistoryStore(cache: cache, me: me)

    store.recordBestScore(surahId: "1", ayahNumber: 1, score: 88, achievedAt: achievedAt)
    XCTAssertEqual(cache.bestScore(surahId: "1", ayahNumber: 1)?.score, 88)

    await Self.drainBackgroundTasks()
    XCTAssertEqual(me.putBestScoreCallCount, 1)
    XCTAssertEqual(me.lastPutBestScoreKey, "1:1")
    XCTAssertEqual(me.lastPutBestScoreEntry?.score, 88)
  }

  func test_recordAttempt_updatesCacheAndCallsRemote() async {
    let me = MockMeClient(recordAttemptResult: .success(attemptOne))
    let cache = InMemoryHistoryStore()
    let store = RemoteSyncedHistoryStore(cache: cache, me: me)

    store.recordAttempt(attemptOne)
    XCTAssertEqual(cache.recentAttempts(limit: 1), [attemptOne])

    await Self.drainBackgroundTasks()
    XCTAssertEqual(me.recordAttemptCallCount, 1)
    XCTAssertEqual(me.lastRecordedAttempt, attemptOne)
  }

  func test_write_whenRemoteFails_leavesCacheIntact() async {
    let me = MockMeClient(putLastPracticedResult: .failure(.backendUnavailable(operation: "test")))
    let cache = InMemoryHistoryStore()
    let store = RemoteSyncedHistoryStore(cache: cache, me: me)

    store.setLastPracticed(entry)
    await Self.drainBackgroundTasks()

    XCTAssertEqual(cache.lastPracticed(), entry, "local cache is the user-facing record; remote failure must not roll it back")
  }

  // MARK: - clear() delegates

  func test_clear_emptiesCache() {
    let cache = InMemoryHistoryStore(
      lastPracticed: entry,
      bestScores: ["1:1": BestScoreEntry(score: 88, achievedAt: Date())],
      attempts: [attemptOne]
    )
    let store = RemoteSyncedHistoryStore(cache: cache, me: MockMeClient())

    store.clear()

    XCTAssertNil(cache.lastPracticed())
    XCTAssertNil(cache.bestScore(surahId: "1", ayahNumber: 1))
    XCTAssertEqual(cache.recentAttempts(limit: 50), [])
  }

  // MARK: - refreshFromRemote

  func test_refreshFromRemote_replacesCacheWithRemoteSnapshot() async {
    let achievedAt = Date(timeIntervalSince1970: 1_700_000_000)
    let me = MockMeClient(
      lastPracticedResult: .success(entry),
      bestScoresResult: .success([
        "1:1": BestScoreEntry(score: 88, achievedAt: achievedAt),
        "2:3": BestScoreEntry(score: 95, achievedAt: achievedAt)
      ]),
      attemptsResult: .success([attemptTwo, attemptOne])
    )
    // Seed the cache with stale data that must be wiped before the
    // refresh writes its results.
    let stale = LastPracticed(
      surahId: "9",
      ayahNumber: 9,
      surahNameEn: "Stale",
      surahNameAr: "قديم",
      ayahCount: 9,
      practicedAt: Date(timeIntervalSince1970: 1_600_000_000)
    )
    let cache = InMemoryHistoryStore(lastPracticed: stale)
    let store = RemoteSyncedHistoryStore(cache: cache, me: me)

    await store.refreshFromRemote()

    XCTAssertEqual(cache.lastPracticed(), entry)
    XCTAssertEqual(cache.bestScore(surahId: "1", ayahNumber: 1)?.score, 88)
    XCTAssertEqual(cache.bestScore(surahId: "2", ayahNumber: 3)?.score, 95)
    // Server returns attempts newest-first; the cache surface
    // (prepend) yields the same ordering after replay.
    XCTAssertEqual(cache.recentAttempts(limit: 50), [attemptTwo, attemptOne])
  }

  func test_refreshFromRemote_whenRemoteFails_keepsExistingCache() async {
    // A network blip during refresh must not wipe data the user can
    // already see — the cache stays as-is and the next refresh
    // attempt converges.
    let me = MockMeClient(
      lastPracticedResult: .failure(.network(underlying: URLError(.notConnectedToInternet)))
    )
    let cache = InMemoryHistoryStore(lastPracticed: entry)
    let store = RemoteSyncedHistoryStore(cache: cache, me: me)

    await store.refreshFromRemote()

    XCTAssertEqual(cache.lastPracticed(), entry)
  }

  func test_refreshFromRemote_skipsMalformedBestScoreKeys() async {
    let achievedAt = Date(timeIntervalSince1970: 1_700_000_000)
    let me = MockMeClient(
      lastPracticedResult: .success(nil),
      bestScoresResult: .success([
        "1:1": BestScoreEntry(score: 88, achievedAt: achievedAt),
        "garbage": BestScoreEntry(score: 50, achievedAt: achievedAt),
        ":3": BestScoreEntry(score: 70, achievedAt: achievedAt),
        "2:abc": BestScoreEntry(score: 60, achievedAt: achievedAt)
      ]),
      attemptsResult: .success([])
    )
    let cache = InMemoryHistoryStore()
    let store = RemoteSyncedHistoryStore(cache: cache, me: me)

    await store.refreshFromRemote()

    XCTAssertEqual(cache.bestScore(surahId: "1", ayahNumber: 1)?.score, 88)
    XCTAssertNil(cache.bestScore(surahId: "2", ayahNumber: 0))
  }

  // MARK: - Helpers

  /// Yield the main actor several times so any fire-and-forget
  /// `Task { … }` the store kicks off has a chance to settle before
  /// the assertion fires. Ten yields is empirically plenty for the
  /// "one await on a mock" path the writes follow.
  private static func drainBackgroundTasks() async {
    for _ in 0..<10 { await Task.yield() }
  }
}
