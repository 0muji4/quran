import Apollo
import ApolloAPI
import XCTest
@testable import QuranRecitationApp

/// Verifies that `AuthInterceptorProvider` wires `BearerAuthInterceptor`
/// and `RefreshOn401Interceptor` into the GraphQL request chain at the
/// expected positions, and that the resulting `ApolloClient` actually
/// stamps `Authorization: Bearer <token>` on outbound requests.
///
/// Mirrors Android PR #435's interceptor tests. Tests use a
/// `URLProtocol`-based stub for the wire so they exercise the real
/// `RequestChainNetworkTransport` end-to-end without touching the
/// network, including the refresh-on-401 retry and sign-out paths.
@MainActor
final class ApolloAuthInterceptorsTests: XCTestCase {

  override func setUp() {
    super.setUp()
    FakeURLProtocol.reset()
  }

  override func tearDown() {
    FakeURLProtocol.reset()
    super.tearDown()
  }

  // MARK: - Provider wiring

  func test_provider_inserts_BearerAuthInterceptor_at_position_0() {
    let provider = makeProvider()

    let interceptors = provider.graphQLInterceptors(for: GetSurahsQuery(limit: nil, offset: nil))

    XCTAssertTrue(
      interceptors.first is BearerAuthInterceptor,
      "BearerAuthInterceptor must run first so every request carries Authorization before Apollo's default chain touches it"
    )
  }

  func test_provider_keeps_default_interceptors_behind_the_auth_pair() {
    let provider = makeProvider()

    let interceptors = provider.graphQLInterceptors(for: GetSurahsQuery(limit: nil, offset: nil))

    XCTAssertTrue(interceptors[1] is RefreshOn401Interceptor)
    XCTAssertTrue(
      interceptors.contains { $0 is MaxRetryInterceptor },
      "MaxRetryInterceptor must stay in the chain as the backstop for RefreshOn401Interceptor's retry"
    )
  }

  func test_provider_keeps_ResponseCodeInterceptor() {
    let provider = makeProvider()

    let interceptors = provider.httpInterceptors(for: GetSurahsQuery(limit: nil, offset: nil))

    XCTAssertTrue(
      interceptors.contains { $0 is ResponseCodeInterceptor },
      "RefreshOn401Interceptor only sees a 401 as the ResponseCodeError this interceptor throws"
    )
  }

  // MARK: - Bearer header injection (smoke test via URLProtocol stub)

  func test_request_carries_Authorization_header_when_token_present() async throws {
    let accessToken = "test-access-\(UUID().uuidString)"
    let tokenStore = InMemoryTokenStore(
      tokens: AuthTokens(accessToken: accessToken, refreshToken: "rt"),
      user: nil
    )
    let refresher = TokenRefresher(
      authService: MockAuthService(),
      tokenStore: tokenStore
    )

    let captured = AuthCaptureBox()
    FakeURLProtocol.handler = { request in
      captured.value = request.value(forHTTPHeaderField: "Authorization")
      return Self.emptySurahsResponse(for: request)
    }

    let apollo = makeApolloClient(tokenStore: tokenStore, refresher: refresher)
    _ = try await Self.fetch(client: apollo, query: GetSurahsQuery(limit: nil, offset: nil))

    XCTAssertEqual(captured.value, "Bearer \(accessToken)")
  }

  func test_request_omits_Authorization_header_when_no_token() async throws {
    let tokenStore = InMemoryTokenStore() // no tokens
    let refresher = TokenRefresher(
      authService: MockAuthService(),
      tokenStore: tokenStore
    )

    let captured = AuthCaptureBox()
    FakeURLProtocol.handler = { request in
      captured.value = request.value(forHTTPHeaderField: "Authorization")
      return Self.emptySurahsResponse(for: request)
    }

    let apollo = makeApolloClient(tokenStore: tokenStore, refresher: refresher)
    _ = try await Self.fetch(client: apollo, query: GetSurahsQuery(limit: nil, offset: nil))

    XCTAssertNil(
      captured.value,
      "Without a stored access token the request must not stamp a Bearer header — sending an empty Bearer would be worse than no header"
    )
  }

  // MARK: - Refresh on 401

  func test_401_refreshes_and_retries_with_the_rotated_token() async throws {
    let rotated = AuthTokens(accessToken: "new-access", refreshToken: "new-refresh")
    let authService = MockAuthService(refreshResult: .success(rotated))
    let tokenStore = InMemoryTokenStore(
      tokens: AuthTokens(accessToken: "old-access", refreshToken: "old-refresh"),
      user: nil
    )
    let refresher = TokenRefresher(authService: authService, tokenStore: tokenStore)
    let signOuts = SignOutCounter()

    let captured = RequestLog()
    FakeURLProtocol.handler = { request in
      let isFirstAttempt = captured.record(request) == 1
      return isFirstAttempt
        ? Self.unauthorizedResponse(for: request)
        : Self.emptySurahsResponse(for: request)
    }

    let apollo = makeApolloClient(
      tokenStore: tokenStore,
      refresher: refresher,
      onSignOut: { signOuts.count += 1 }
    )
    let response = try await Self.fetch(client: apollo, query: GetSurahsQuery(limit: nil, offset: nil))

    XCTAssertEqual(response.data?.surahs.count, 0)
    XCTAssertEqual(authService.refreshCallCount, 1)
    XCTAssertEqual(captured.authorizationHeaders, ["Bearer old-access", "Bearer new-access"])
    XCTAssertEqual(captured.retryHeaders, [nil, "1"])
    XCTAssertEqual(signOuts.count, 0)
  }

  func test_second_401_signs_out_without_another_refresh() async {
    let rotated = AuthTokens(accessToken: "new-access", refreshToken: "new-refresh")
    let authService = MockAuthService(refreshResult: .success(rotated))
    let tokenStore = InMemoryTokenStore(
      tokens: AuthTokens(accessToken: "old-access", refreshToken: "old-refresh"),
      user: nil
    )
    let refresher = TokenRefresher(authService: authService, tokenStore: tokenStore)
    let signOuts = SignOutCounter()

    let captured = RequestLog()
    FakeURLProtocol.handler = { request in
      captured.record(request)
      return Self.unauthorizedResponse(for: request)
    }

    let apollo = makeApolloClient(
      tokenStore: tokenStore,
      refresher: refresher,
      onSignOut: { signOuts.count += 1 }
    )
    await XCTAssertThrowsErrorAsync(
      try await Self.fetch(client: apollo, query: GetSurahsQuery(limit: nil, offset: nil))
    ) { error in
      XCTAssertTrue(error is ResponseCodeInterceptor.ResponseCodeError)
    }

    XCTAssertEqual(authService.refreshCallCount, 1)
    XCTAssertEqual(captured.authorizationHeaders.count, 2)
    XCTAssertEqual(signOuts.count, 1)
  }

  func test_rejected_refresh_signs_out() async {
    let authService = MockAuthService(refreshResult: .failure(.invalidCredentials))
    let tokenStore = InMemoryTokenStore(
      tokens: AuthTokens(accessToken: "old-access", refreshToken: "old-refresh"),
      user: nil
    )
    let refresher = TokenRefresher(authService: authService, tokenStore: tokenStore)
    let signOuts = SignOutCounter()

    FakeURLProtocol.handler = { Self.unauthorizedResponse(for: $0) }

    let apollo = makeApolloClient(
      tokenStore: tokenStore,
      refresher: refresher,
      onSignOut: { signOuts.count += 1 }
    )
    await XCTAssertThrowsErrorAsync(
      try await Self.fetch(client: apollo, query: GetSurahsQuery(limit: nil, offset: nil))
    ) { error in
      XCTAssertEqual((error as? AppError)?.telemetryCode, "invalid_credentials")
    }

    XCTAssertEqual(signOuts.count, 1)
  }

  func test_transient_refresh_failure_keeps_the_session() async {
    let authService = MockAuthService(
      refreshResult: .failure(.backendUnavailable(operation: "auth.refresh"))
    )
    let tokenStore = InMemoryTokenStore(
      tokens: AuthTokens(accessToken: "old-access", refreshToken: "old-refresh"),
      user: nil
    )
    let refresher = TokenRefresher(authService: authService, tokenStore: tokenStore)
    let signOuts = SignOutCounter()

    FakeURLProtocol.handler = { Self.unauthorizedResponse(for: $0) }

    let apollo = makeApolloClient(
      tokenStore: tokenStore,
      refresher: refresher,
      onSignOut: { signOuts.count += 1 }
    )
    await XCTAssertThrowsErrorAsync(
      try await Self.fetch(client: apollo, query: GetSurahsQuery(limit: nil, offset: nil))
    ) { error in
      XCTAssertEqual((error as? AppError)?.telemetryCode, "backend_unavailable")
    }

    XCTAssertEqual(signOuts.count, 0)
  }

  // MARK: - Helpers

  private func makeProvider(
    tokenStore: TokenStore? = nil,
    refresher: TokenRefresher? = nil,
    onSignOut: @escaping @MainActor () -> Void = {}
  ) -> AuthInterceptorProvider {
    let store = tokenStore ?? InMemoryTokenStore()
    let refr = refresher ?? TokenRefresher(authService: MockAuthService(), tokenStore: store)
    return AuthInterceptorProvider(
      tokenStore: store,
      refresher: refr,
      onSignOut: onSignOut
    )
  }

  private func makeApolloClient(
    tokenStore: TokenStore,
    refresher: TokenRefresher,
    onSignOut: @escaping @MainActor () -> Void = {}
  ) -> ApolloClient {
    let config = URLSessionConfiguration.ephemeral
    config.protocolClasses = [FakeURLProtocol.self]
    let store = ApolloStore()
    let provider = AuthInterceptorProvider(
      tokenStore: tokenStore,
      refresher: refresher,
      onSignOut: onSignOut
    )
    let transport = RequestChainNetworkTransport(
      urlSession: URLSession(configuration: config),
      interceptorProvider: provider,
      store: store,
      endpointURL: URL(string: "https://test.example.com/graphql")!
    )
    return ApolloClient(networkTransport: transport, store: store)
  }

  static func emptySurahsResponse(for request: URLRequest) -> (HTTPURLResponse, Data) {
    let body = #"{"data":{"surahs":[]}}"#.data(using: .utf8)!
    let response = HTTPURLResponse(
      url: request.url ?? URL(string: "https://test.example.com/graphql")!,
      statusCode: 200,
      httpVersion: nil,
      headerFields: ["Content-Type": "application/json"]
    )!
    return (response, body)
  }

  /// Same shape as the BFF's `UNAUTHENTICATED` GraphQL response.
  static func unauthorizedResponse(for request: URLRequest) -> (HTTPURLResponse, Data) {
    let body = #"{"errors":[{"message":"authentication required"}]}"#.data(using: .utf8)!
    let response = HTTPURLResponse(
      url: request.url ?? URL(string: "https://test.example.com/graphql")!,
      statusCode: 401,
      httpVersion: nil,
      headerFields: ["Content-Type": "application/json"]
    )!
    return (response, body)
  }

  static func fetch<Q: GraphQLQuery>(
    client: ApolloClient,
    query: Q
  ) async throws -> GraphQLResponse<Q> where Q.ResponseFormat == SingleResponseFormat {
    try await client.fetch(query: query, cachePolicy: .networkOnly)
  }
}

// MARK: - URLProtocol stub

/// `URLProtocol` that lets tests intercept Apollo's outbound HTTP
/// without touching the real network. Configured per test via the
/// `handler` static, then injected into Apollo's `URLSessionClient`
/// through `URLSessionConfiguration.protocolClasses`.
final class FakeURLProtocol: URLProtocol {
  /// Set by each test before firing requests. Receives the outbound
  /// `URLRequest` and returns the canned response + body.
  static var handler: ((URLRequest) -> (HTTPURLResponse, Data))?

  static func reset() {
    handler = nil
  }

  override class func canInit(with request: URLRequest) -> Bool { true }
  override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }

  override func startLoading() {
    guard let handler = Self.handler else {
      client?.urlProtocol(self, didFailWithError: NSError(domain: "FakeURLProtocol", code: -1))
      return
    }
    let (response, data) = handler(request)
    client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
    client?.urlProtocol(self, didLoad: data)
    client?.urlProtocolDidFinishLoading(self)
  }

  override func stopLoading() {}
}

/// Reference cell so the `FakeURLProtocol` handler closure (running on
/// the URL session's delegate queue) can hand a captured value back to
/// the test on the main actor without crossing isolation domains.
final class AuthCaptureBox: @unchecked Sendable {
  var value: String?
}

/// Records the auth headers of each outbound request, for tests that
/// fire more than one. Locked because the `FakeURLProtocol` handler
/// runs on the URL session's delegate queue.
final class RequestLog: @unchecked Sendable {
  private let lock = NSLock()
  private var requests: [URLRequest] = []

  /// Returns how many requests have been recorded, including this one.
  @discardableResult
  func record(_ request: URLRequest) -> Int {
    lock.lock()
    defer { lock.unlock() }
    requests.append(request)
    return requests.count
  }

  var authorizationHeaders: [String?] { headers(named: "Authorization") }
  var retryHeaders: [String?] { headers(named: RefreshOn401Interceptor.retryHeaderName) }

  private func headers(named name: String) -> [String?] {
    lock.lock()
    defer { lock.unlock() }
    return requests.map { $0.value(forHTTPHeaderField: name) }
  }
}

/// Counts `onSignOut` calls, which run on the main actor.
@MainActor
final class SignOutCounter {
  var count = 0
}

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
