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

  // MARK: - Helpers

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
