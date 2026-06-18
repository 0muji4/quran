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
    let store = RemoteSyncedHistoryStore(cache: cache, me: MockMeClient(), telemetry: NoOpTelemetry())

    XCTAssertEqual(store.lastPracticed(), entry)
  }

  func test_bestScore_returnsCacheValue() {
    let cache = InMemoryHistoryStore(bestScores: [
      "1:1": BestScoreEntry(score: 88, achievedAt: Date(timeIntervalSince1970: 1_700_000_000))
    ])
    let store = RemoteSyncedHistoryStore(cache: cache, me: MockMeClient(), telemetry: NoOpTelemetry())

    XCTAssertEqual(store.bestScore(surahId: "1", ayahNumber: 1)?.score, 88)
    XCTAssertEqual(store.bestScore(forSurah: "1"), 88)
  }

  func test_recentAttempts_returnsCacheValue() {
    let cache = InMemoryHistoryStore(attempts: [attemptTwo, attemptOne])
    let store = RemoteSyncedHistoryStore(cache: cache, me: MockMeClient(), telemetry: NoOpTelemetry())

    XCTAssertEqual(store.recentAttempts(limit: 50), [attemptTwo, attemptOne])
  }

  // MARK: - Writes update cache synchronously and fire BFF in the background

  func test_setLastPracticed_updatesCacheAndCallsRemote() async {
    let me = MockMeClient(putLastPracticedResult: .success(entry))
    let cache = InMemoryHistoryStore()
    let store = RemoteSyncedHistoryStore(cache: cache, me: me, telemetry: NoOpTelemetry())

    store.setLastPracticed(entry)
    XCTAssertEqual(cache.lastPracticed(), entry, "cache update is synchronous")

    await store.pendingWriteTask?.value
    XCTAssertEqual(me.putLastPracticedCallCount, 1)
    XCTAssertEqual(me.lastPutLastPracticed, entry)
  }

  func test_recordBestScore_updatesCacheAndCallsRemote() async {
    let achievedAt = Date(timeIntervalSince1970: 1_700_000_000)
    let me = MockMeClient(
      putBestScoreResult: .success(BestScoreEntry(score: 88, achievedAt: achievedAt))
    )
    let cache = InMemoryHistoryStore()
    let store = RemoteSyncedHistoryStore(cache: cache, me: me, telemetry: NoOpTelemetry())

    store.recordBestScore(surahId: "1", ayahNumber: 1, score: 88, achievedAt: achievedAt)
    XCTAssertEqual(cache.bestScore(surahId: "1", ayahNumber: 1)?.score, 88)

    await store.pendingWriteTask?.value
    XCTAssertEqual(me.putBestScoreCallCount, 1)
    XCTAssertEqual(me.lastPutBestScoreKey, "1:1")
    XCTAssertEqual(me.lastPutBestScoreEntry?.score, 88)
  }

  func test_recordAttempt_updatesCacheAndCallsRemote() async {
    let me = MockMeClient(recordAttemptResult: .success(attemptOne))
    let cache = InMemoryHistoryStore()
    let store = RemoteSyncedHistoryStore(cache: cache, me: me, telemetry: NoOpTelemetry())

    store.recordAttempt(attemptOne)
    XCTAssertEqual(cache.recentAttempts(limit: 1), [attemptOne])

    await store.pendingWriteTask?.value
    XCTAssertEqual(me.recordAttemptCallCount, 1)
    XCTAssertEqual(me.lastRecordedAttempt, attemptOne)
  }

  func test_write_whenRemoteFails_leavesCacheIntact() async {
    let me = MockMeClient(putLastPracticedResult: .failure(.backendUnavailable(operation: "test")))
    let cache = InMemoryHistoryStore()
    let store = RemoteSyncedHistoryStore(cache: cache, me: me, telemetry: NoOpTelemetry())

    store.setLastPracticed(entry)
    await store.pendingWriteTask?.value

    XCTAssertEqual(cache.lastPracticed(), entry, "local cache is the user-facing record; remote failure must not roll it back")
  }

  // MARK: - Telemetry on BFF write failure

  func test_setLastPracticed_remoteFailure_reportsTelemetry() async {
    let me = MockMeClient(
      putLastPracticedResult: .failure(.network(underlying: URLError(.notConnectedToInternet)))
    )
    let telemetry = TelemetrySpy()
    let store = RemoteSyncedHistoryStore(
      cache: InMemoryHistoryStore(),
      me: me,
      telemetry: telemetry
    )

    store.setLastPracticed(entry)
    await store.pendingWriteTask?.value

    let errorRecords = telemetry.records.compactMap { record -> (String, [String: String])? in
      if case let .error(code, context) = record { return (code, context) } else { return nil }
    }
    XCTAssertEqual(errorRecords.count, 1)
    XCTAssertEqual(errorRecords.first?.0, "network")
    XCTAssertEqual(errorRecords.first?.1["operation"], "history.write")
    XCTAssertEqual(errorRecords.first?.1["kind"], "lastPracticed")
    XCTAssertEqual(errorRecords.first?.1["surah_id"], entry.surahId)
  }

  func test_recordBestScore_remoteFailure_reportsTelemetryWithSurahAndAyah() async {
    let me = MockMeClient(
      putBestScoreResult: .failure(.backendUnavailable(operation: "me.best-scores.put"))
    )
    let telemetry = TelemetrySpy()
    let store = RemoteSyncedHistoryStore(
      cache: InMemoryHistoryStore(),
      me: me,
      telemetry: telemetry
    )

    store.recordBestScore(
      surahId: "1",
      ayahNumber: 4,
      score: 88,
      achievedAt: Date(timeIntervalSince1970: 1_700_000_000)
    )
    await store.pendingWriteTask?.value

    if case let .error(code, context) = telemetry.records.first {
      XCTAssertEqual(code, "backend_unavailable")
      XCTAssertEqual(context["operation"], "history.write")
      XCTAssertEqual(context["kind"], "bestScore")
      XCTAssertEqual(context["surah_id"], "1")
      XCTAssertEqual(context["ayah_number"], "4")
    } else {
      XCTFail("expected an .error record")
    }
  }

  func test_recordAttempt_remoteFailure_reportsTelemetryWithAttemptId() async {
    let me = MockMeClient(
      recordAttemptResult: .failure(.backendUnavailable(operation: "me.attempts.post"))
    )
    let telemetry = TelemetrySpy()
    let store = RemoteSyncedHistoryStore(
      cache: InMemoryHistoryStore(),
      me: me,
      telemetry: telemetry
    )

    store.recordAttempt(attemptOne)
    await store.pendingWriteTask?.value

    if case let .error(_, context) = telemetry.records.first {
      XCTAssertEqual(context["kind"], "attempt")
      XCTAssertEqual(context["attempt_id"], attemptOne.id)
    } else {
      XCTFail("expected an .error record")
    }
  }

  func test_refreshFromRemote_remoteFailure_reportsTelemetry() async {
    let me = MockMeClient(
      lastPracticedResult: .failure(.network(underlying: URLError(.notConnectedToInternet)))
    )
    let telemetry = TelemetrySpy()
    let store = RemoteSyncedHistoryStore(
      cache: InMemoryHistoryStore(),
      me: me,
      telemetry: telemetry
    )

    await store.refreshFromRemote()

    if case let .error(code, context) = telemetry.records.first {
      XCTAssertEqual(code, "network")
      XCTAssertEqual(context["operation"], "history.refresh")
    } else {
      XCTFail("expected an .error record")
    }
  }

  func test_setLastPracticed_remoteSuccess_emitsNoTelemetry() async {
    let me = MockMeClient(putLastPracticedResult: .success(entry))
    let telemetry = TelemetrySpy()
    let store = RemoteSyncedHistoryStore(
      cache: InMemoryHistoryStore(),
      me: me,
      telemetry: telemetry
    )

    store.setLastPracticed(entry)
    await store.pendingWriteTask?.value

    XCTAssertTrue(telemetry.records.isEmpty, "success path must not generate noise on the failure dashboard")
  }

  // MARK: - clear() delegates

  func test_clear_emptiesCache() {
    let cache = InMemoryHistoryStore(
      lastPracticed: entry,
      bestScores: ["1:1": BestScoreEntry(score: 88, achievedAt: Date())],
      attempts: [attemptOne]
    )
    let store = RemoteSyncedHistoryStore(cache: cache, me: MockMeClient(), telemetry: NoOpTelemetry())

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
    let store = RemoteSyncedHistoryStore(cache: cache, me: me, telemetry: NoOpTelemetry())

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
    let store = RemoteSyncedHistoryStore(cache: cache, me: me, telemetry: NoOpTelemetry())

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
    let store = RemoteSyncedHistoryStore(cache: cache, me: me, telemetry: NoOpTelemetry())

    await store.refreshFromRemote()

    XCTAssertEqual(cache.bestScore(surahId: "1", ayahNumber: 1)?.score, 88)
    XCTAssertNil(cache.bestScore(surahId: "2", ayahNumber: 0))
  }

}
