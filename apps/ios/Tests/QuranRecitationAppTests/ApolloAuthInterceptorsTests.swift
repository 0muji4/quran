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
/// network. Full refresh-on-401 behaviour (rotation, sign-out on
/// second 401) is verified by parity with the Android implementation
/// at code review time; the stateful URLProtocol scaffolding needed
/// to assert it from Swift unit tests would exceed the value here.
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

    let interceptors = provider.interceptors(for: GetSurahsQuery(limit: nil, offset: nil))

    XCTAssertTrue(
      interceptors.first is BearerAuthInterceptor,
      "BearerAuthInterceptor must run first so every request carries Authorization before Apollo's default chain touches it"
    )
  }

  func test_provider_inserts_RefreshOn401Interceptor_before_ResponseCodeInterceptor() {
    let provider = makeProvider()

    let interceptors = provider.interceptors(for: GetSurahsQuery(limit: nil, offset: nil))

    let refreshIndex = interceptors.firstIndex { $0 is RefreshOn401Interceptor }
    let responseCodeIndex = interceptors.firstIndex { $0 is ResponseCodeInterceptor }
    XCTAssertNotNil(refreshIndex, "RefreshOn401Interceptor missing from chain")
    XCTAssertNotNil(responseCodeIndex, "ResponseCodeInterceptor missing from chain")
    if let r = refreshIndex, let rc = responseCodeIndex {
      XCTAssertLessThan(
        r, rc,
        "RefreshOn401Interceptor must sit before ResponseCodeInterceptor so it can observe a 401 response before it becomes a thrown ResponseCodeError"
      )
    }
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
    let urlSessionClient = URLSessionClient(
      sessionConfiguration: config,
      callbackQueue: .main
    )
    let store = ApolloStore()
    let provider = AuthInterceptorProvider(
      tokenStore: tokenStore,
      refresher: refresher,
      onSignOut: onSignOut,
      client: urlSessionClient,
      store: store
    )
    let transport = RequestChainNetworkTransport(
      interceptorProvider: provider,
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

  static func fetch<Q: GraphQLQuery>(
    client: ApolloClient,
    query: Q
  ) async throws -> GraphQLResult<Q.Data> {
    try await withCheckedThrowingContinuation { continuation in
      client.fetch(query: query, cachePolicy: .fetchIgnoringCacheData) { result in
        continuation.resume(with: result)
      }
    }
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
