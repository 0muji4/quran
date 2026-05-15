import XCTest
@testable import QuranRecitationApp

@MainActor
final class AuthHTTPClientTests: XCTestCase {
  private let original = AuthTokens(accessToken: "original-access", refreshToken: "original-refresh")
  private let rotated = AuthTokens(accessToken: "rotated-access", refreshToken: "rotated-refresh")
  private let url = URL(string: "https://api.example.com/me/example")!

  func test_send_withoutStoredTokens_signsOutAndThrowsInvalidCredentials() async {
    let spy = TransportSpy(responses: [])
    var signOutCount = 0
    let client = makeClient(
      transport: spy.transport(),
      tokens: nil,
      refreshOutcome: .success(rotated),
      onSignOut: { signOutCount += 1 }
    )

    await XCTAssertThrowsErrorAsync(try await client.send(URLRequest(url: url))) { error in
      XCTAssertEqual((error as? AppError)?.telemetryCode, "invalid_credentials")
    }
    XCTAssertEqual(signOutCount, 1)
    XCTAssertEqual(spy.requests.count, 0)
  }

  func test_send_attachesBearer_andReturnsNon401Response() async throws {
    let body = Data("ok".utf8)
    let spy = TransportSpy(responses: [
      { (body, httpResponse(status: 200)) }
    ])
    var signOutCount = 0
    let client = makeClient(
      transport: spy.transport(),
      tokens: original,
      refreshOutcome: .success(rotated),
      onSignOut: { signOutCount += 1 }
    )

    let (data, response) = try await client.send(URLRequest(url: url))

    XCTAssertEqual(data, body)
    XCTAssertEqual(response.statusCode, 200)
    XCTAssertEqual(spy.authorizationHeaders, ["Bearer original-access"])
    XCTAssertEqual(signOutCount, 0)
  }

  func test_send_on401_refreshesAndRetriesOnceWithRotatedToken() async throws {
    let body = Data("after-rotation".utf8)
    let spy = TransportSpy(responses: [
      { (Data(), httpResponse(status: 401)) },
      { (body, httpResponse(status: 200)) }
    ])
    var signOutCount = 0
    let client = makeClient(
      transport: spy.transport(),
      tokens: original,
      refreshOutcome: .success(rotated),
      onSignOut: { signOutCount += 1 }
    )

    let (data, response) = try await client.send(URLRequest(url: url))

    XCTAssertEqual(data, body)
    XCTAssertEqual(response.statusCode, 200)
    XCTAssertEqual(spy.authorizationHeaders, ["Bearer original-access", "Bearer rotated-access"])
    XCTAssertEqual(signOutCount, 0, "session is intact after a successful rotation")
  }

  func test_send_on401_thenRefreshRejected_signsOutAndPropagatesInvalidCredentials() async {
    let spy = TransportSpy(responses: [
      { (Data(), httpResponse(status: 401)) }
    ])
    var signOutCount = 0
    let client = makeClient(
      transport: spy.transport(),
      tokens: original,
      refreshOutcome: .failure(.invalidCredentials),
      onSignOut: { signOutCount += 1 }
    )

    await XCTAssertThrowsErrorAsync(try await client.send(URLRequest(url: url))) { error in
      XCTAssertEqual((error as? AppError)?.telemetryCode, "invalid_credentials")
    }
    XCTAssertEqual(signOutCount, 1)
    XCTAssertEqual(spy.requests.count, 1, "no retry after refresh-token rejected")
  }

  func test_send_on401_thenTransientRefreshFailure_propagatesWithoutSignOut() async {
    // Refresh failed with a network / 5xx error — that's recoverable
    // and the caller should be able to retry. Signing the user out
    // would be over-reaction.
    let spy = TransportSpy(responses: [
      { (Data(), httpResponse(status: 401)) }
    ])
    var signOutCount = 0
    let client = makeClient(
      transport: spy.transport(),
      tokens: original,
      refreshOutcome: .failure(.backendUnavailable(operation: "auth.refresh")),
      onSignOut: { signOutCount += 1 }
    )

    await XCTAssertThrowsErrorAsync(try await client.send(URLRequest(url: url))) { error in
      XCTAssertEqual((error as? AppError)?.telemetryCode, "backend_unavailable")
    }
    XCTAssertEqual(signOutCount, 0, "transient refresh failure must not strand the session")
  }

  func test_send_on401_refreshSucceeds_butSecondAttemptAlso401_signsOut() async {
    let spy = TransportSpy(responses: [
      { (Data(), httpResponse(status: 401)) },
      { (Data(), httpResponse(status: 401)) }
    ])
    var signOutCount = 0
    let client = makeClient(
      transport: spy.transport(),
      tokens: original,
      refreshOutcome: .success(rotated),
      onSignOut: { signOutCount += 1 }
    )

    await XCTAssertThrowsErrorAsync(try await client.send(URLRequest(url: url))) { error in
      XCTAssertEqual((error as? AppError)?.telemetryCode, "invalid_credentials")
    }
    XCTAssertEqual(signOutCount, 1)
    XCTAssertEqual(spy.requests.count, 2)
  }

  func test_send_transportNetworkError_propagatesWithoutSignOut() async {
    let underlying = URLError(.notConnectedToInternet)
    let spy = TransportSpy(responses: [
      { throw AppError.network(underlying: underlying) }
    ])
    var signOutCount = 0
    let client = makeClient(
      transport: spy.transport(),
      tokens: original,
      refreshOutcome: .success(rotated),
      onSignOut: { signOutCount += 1 }
    )

    await XCTAssertThrowsErrorAsync(try await client.send(URLRequest(url: url))) { error in
      XCTAssertEqual((error as? AppError)?.telemetryCode, "network")
    }
    XCTAssertEqual(signOutCount, 0)
  }

  // MARK: - Helpers

  private func makeClient(
    transport: @escaping AuthHTTPClient.Transport,
    tokens: AuthTokens?,
    refreshOutcome: Result<AuthTokens, AppError>,
    onSignOut: @escaping @MainActor () -> Void
  ) -> AuthHTTPClient {
    let tokenStore = InMemoryTokenStore(tokens: tokens, user: nil)
    let authService = MockAuthService(refreshResult: refreshOutcome)
    let refresher = TokenRefresher(authService: authService, tokenStore: tokenStore)
    return AuthHTTPClient(
      transport: transport,
      tokenStore: tokenStore,
      refresher: refresher,
      onSignOut: onSignOut
    )
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
