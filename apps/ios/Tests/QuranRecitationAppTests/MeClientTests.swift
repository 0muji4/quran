import XCTest
@testable import QuranRecitationApp

@MainActor
final class MeClientTests: XCTestCase {
  private let tokens = AuthTokens(accessToken: "access", refreshToken: "refresh")

  func test_suggestions_decodesSuggestedAndDifficulties() async throws {
    let body = Data("""
      {
        "suggested": { "surahId": "112", "reason": "short_unpracticed" },
        "difficulties": { "1": "easy", "2": "medium", "114": "hard" }
      }
      """.utf8)
    let spy = TransportSpy(responses: [
      { (body, httpResponse(status: 200)) }
    ])
    let client = makeClient(transport: spy.transport())

    let suggestion = try await client.suggestions()

    XCTAssertEqual(suggestion.surahId, "112")
    XCTAssertEqual(suggestion.reason, .shortUnpracticed)
    XCTAssertEqual(suggestion.difficulties, ["1": .easy, "2": .medium, "114": .hard])
  }

  func test_suggestions_unknownReason_decodesAsUnknown() async throws {
    // Server-side may add new reason strings later (ADR 0015 explicitly
    // calls reason "informational telemetry"). iOS must keep working
    // for the user — the recommendation still renders, only the
    // telemetry tag is bucketed as `.unknown`.
    let body = Data("""
      {
        "suggested": { "surahId": "9", "reason": "future_variant" },
        "difficulties": {}
      }
      """.utf8)
    let spy = TransportSpy(responses: [
      { (body, httpResponse(status: 200)) }
    ])
    let client = makeClient(transport: spy.transport())

    let suggestion = try await client.suggestions()

    XCTAssertEqual(suggestion.surahId, "9")
    XCTAssertEqual(suggestion.reason, .unknown)
  }

  func test_suggestions_502_throwsBackendUnavailable() async {
    let spy = TransportSpy(responses: [
      { (Data(), httpResponse(status: 502)) }
    ])
    let client = makeClient(transport: spy.transport())

    await XCTAssertThrowsErrorAsync(try await client.suggestions()) { error in
      XCTAssertEqual((error as? AppError)?.telemetryCode, "backend_unavailable")
    }
  }

  func test_suggestions_malformedBody_throwsBackendUnavailable() async {
    let body = Data("not-json".utf8)
    let spy = TransportSpy(responses: [
      { (body, httpResponse(status: 200)) }
    ])
    let client = makeClient(transport: spy.transport())

    await XCTAssertThrowsErrorAsync(try await client.suggestions()) { error in
      let code = (error as? AppError)?.telemetryCode
      XCTAssertEqual(code, "backend_unavailable")
    }
  }

  func test_suggestions_attachesAuthorizationHeader() async throws {
    let body = Data("""
      { "suggested": { "surahId": "1", "reason": "fallback" }, "difficulties": {} }
      """.utf8)
    let spy = TransportSpy(responses: [
      { (body, httpResponse(status: 200)) }
    ])
    let client = makeClient(transport: spy.transport())

    _ = try await client.suggestions()

    XCTAssertEqual(spy.authorizationHeaders, ["Bearer access"])
    XCTAssertEqual(spy.requests.first?.url?.lastPathComponent, "suggestions")
  }

  // MARK: - Last practiced

  func test_lastPracticed_decodesValidPayloadIncludingFractionalSecondsTimestamp() async throws {
    let iso = "2026-05-08T10:00:00.000Z"
    let body = Data("""
      {
        "surahId": "1",
        "ayahNumber": 3,
        "surahNameEn": "Al-Fatihah",
        "surahNameAr": "الفاتحة",
        "ayahCount": 7,
        "practicedAt": "\(iso)"
      }
      """.utf8)
    let spy = TransportSpy(responses: [
      { (body, httpResponse(status: 200)) }
    ])
    let client = makeClient(transport: spy.transport())

    let entry = try await client.lastPracticed()

    XCTAssertEqual(entry?.surahId, "1")
    XCTAssertEqual(entry?.ayahNumber, 3)
    XCTAssertEqual(entry?.practicedAt, Self.parseISO(iso))
  }

  func test_lastPracticed_nullBody_returnsNil() async throws {
    // The BFF emits literal `null` when the row is absent. JSONDecoder
    // refuses `null` for a non-Optional target, so MeClient probes the
    // bytes before decoding.
    let spy = TransportSpy(responses: [
      { (Data("null".utf8), httpResponse(status: 200)) }
    ])
    let client = makeClient(transport: spy.transport())

    let entry = try await client.lastPracticed()

    XCTAssertNil(entry)
  }

  // MARK: - Best scores

  func test_bestScores_decodesDictionary() async throws {
    let body = Data("""
      {
        "1:1": { "score": 88, "achievedAt": "2026-05-08T10:00:00.000Z" },
        "2:3": { "score": 95, "achievedAt": "2026-05-08T11:00:00.000Z" }
      }
      """.utf8)
    let spy = TransportSpy(responses: [
      { (body, httpResponse(status: 200)) }
    ])
    let client = makeClient(transport: spy.transport())

    let scores = try await client.bestScores()

    XCTAssertEqual(scores["1:1"]?.score, 88)
    XCTAssertEqual(scores["2:3"]?.score, 95)
  }

  func test_putBestScore_putsAtComposedKeyUrl() async throws {
    let body = Data("""
      { "score": 92, "achievedAt": "2026-05-08T10:00:00.000Z" }
      """.utf8)
    let spy = TransportSpy(responses: [
      { (body, httpResponse(status: 200)) }
    ])
    let client = makeClient(transport: spy.transport())

    let entry = BestScoreEntry(score: 92, achievedAt: Date(timeIntervalSince1970: 1762596000))
    _ = try await client.putBestScore(surahId: "2", ayahNumber: 3, entry: entry)

    let request = try XCTUnwrap(spy.requests.first)
    XCTAssertEqual(request.httpMethod, "PUT")
    XCTAssertEqual(request.url?.path, "/me/best-scores/2:3")
  }

  // MARK: - Attempts

  func test_attempts_unwrapsEnvelopeAndPropagatesLimitQuery() async throws {
    let body = Data("""
      {
        "attempts": [
          {
            "id": "a1",
            "surahId": "1",
            "surahNameEn": "Al-Fatihah",
            "ayahNumber": 1,
            "score": 88,
            "jobId": "job-1",
            "createdAt": "2026-05-08T10:00:00.000Z",
            "status": "COMPLETED",
            "durationMs": 4200
          }
        ]
      }
      """.utf8)
    let spy = TransportSpy(responses: [
      { (body, httpResponse(status: 200)) }
    ])
    let client = makeClient(transport: spy.transport())

    let attempts = try await client.attempts(limit: 50)

    XCTAssertEqual(attempts.count, 1)
    XCTAssertEqual(attempts.first?.id, "a1")
    XCTAssertEqual(spy.requests.first?.url?.query, "limit=50")
  }

  func test_recordAttempt_postsJsonBody() async throws {
    let body = Data("""
      {
        "id": "a1",
        "surahId": "1",
        "surahNameEn": "Al-Fatihah",
        "ayahNumber": 1,
        "score": 88,
        "jobId": "job-1",
        "createdAt": "2026-05-08T10:00:00.000Z",
        "status": "COMPLETED",
        "durationMs": 4200
      }
      """.utf8)
    let spy = TransportSpy(responses: [
      { (body, httpResponse(status: 201)) }
    ])
    let client = makeClient(transport: spy.transport())

    let attempt = Attempt(
      id: "client-uuid",
      surahId: "1",
      surahNameEn: "Al-Fatihah",
      ayahNumber: 1,
      score: 88,
      jobId: "job-1",
      createdAt: Date(timeIntervalSince1970: 1762596000),
      status: .completed,
      durationMs: 4200
    )

    let returned = try await client.recordAttempt(attempt)

    let request = try XCTUnwrap(spy.requests.first)
    XCTAssertEqual(request.httpMethod, "POST")
    XCTAssertEqual(request.url?.path, "/me/attempts")
    // The server returned a different id ("a1") than the client sent;
    // MeClient surfaces what the server stored so the caller can
    // reconcile.
    XCTAssertEqual(returned.id, "a1")
  }

  // MARK: - Preferences

  func test_preferences_unwrapsEnvelope() async throws {
    let body = Data("""
      {
        "preferences": {
          "referenceReciterId": "husary-muallim",
          "defaultPlaybackSpeed": 1.25,
          "dailyReminderEnabled": true,
          "dailyReminderTime": "07:30"
        }
      }
      """.utf8)
    let spy = TransportSpy(responses: [
      { (body, httpResponse(status: 200)) }
    ])
    let client = makeClient(transport: spy.transport())

    let preferences = try await client.preferences()

    XCTAssertEqual(preferences.referenceReciterId, "husary-muallim")
    XCTAssertEqual(preferences.defaultPlaybackSpeed, 1.25)
    XCTAssertTrue(preferences.dailyReminderEnabled)
    XCTAssertEqual(preferences.dailyReminderTime, "07:30")
    XCTAssertEqual(spy.requests.first?.httpMethod, "GET")
    XCTAssertEqual(spy.requests.first?.url?.path, "/me/preferences")
  }

  func test_updatePreferences_PATCHesOnlyPresentFields() async throws {
    let body = Data("""
      {
        "preferences": {
          "referenceReciterId": "husary-muallim",
          "defaultPlaybackSpeed": 1.5,
          "dailyReminderEnabled": false,
          "dailyReminderTime": "08:00"
        }
      }
      """.utf8)
    let spy = TransportSpy(responses: [
      { (body, httpResponse(status: 200)) }
    ])
    let client = makeClient(transport: spy.transport())

    let returned = try await client.updatePreferences(
      PracticePreferencesPatch(defaultPlaybackSpeed: 1.5)
    )

    let request = try XCTUnwrap(spy.requests.first)
    XCTAssertEqual(request.httpMethod, "PATCH")
    XCTAssertEqual(request.url?.path, "/me/preferences")
    // The encoder must omit the unset fields so a single-field edit
    // never clobbers a sibling column on the server.
    let sentBody = try XCTUnwrap(request.httpBody)
    let sentJSON = try XCTUnwrap(
      JSONSerialization.jsonObject(with: sentBody) as? [String: Any]
    )
    XCTAssertEqual(Array(sentJSON.keys), ["defaultPlaybackSpeed"])
    XCTAssertEqual(sentJSON["defaultPlaybackSpeed"] as? Double, 1.5)
    // The merged server echo (not the local guess) is returned.
    XCTAssertEqual(returned.defaultPlaybackSpeed, 1.5)
  }

  func test_preferences_502_throwsBackendUnavailable() async {
    let spy = TransportSpy(responses: [
      { (Data(), httpResponse(status: 502)) }
    ])
    let client = makeClient(transport: spy.transport())

    await XCTAssertThrowsErrorAsync(try await client.preferences()) { error in
      XCTAssertEqual((error as? AppError)?.telemetryCode, "backend_unavailable")
    }
  }

  // MARK: - Helpers

  private static func parseISO(_ value: String) -> Date {
    let f = ISO8601DateFormatter()
    f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    return f.date(from: value) ?? Date(timeIntervalSince1970: 0)
  }

  private func makeClient(transport: @escaping AuthHTTPClient.Transport) -> HTTPMeClient {
    let tokenStore = InMemoryTokenStore(tokens: tokens, user: nil)
    let authService = MockAuthService(refreshResult: .success(tokens))
    let refresher = TokenRefresher(authService: authService, tokenStore: tokenStore)
    let http = AuthHTTPClient(
      transport: transport,
      tokenStore: tokenStore,
      refresher: refresher,
      onSignOut: { /* unused in MeClient tests; AuthHTTPClient tests cover sign-out wiring */ }
    )
    return HTTPMeClient(baseURL: URL(string: "https://api.example.com")!, http: http)
  }
}

// MARK: - Async assertion helper

private func XCTAssertThrowsErrorAsync<T>(
  _ expression: @autoclosure () async throws -> T,
  file: StaticString = #filePath,
  line: UInt = #line,
  _ assert: (Error) -> Void = { _ in }
) async {
  do {
    _ = try await expression()
    XCTFail("expected expression to throw", file: file, line: line)
  } catch {
    assert(error)
  }
}
