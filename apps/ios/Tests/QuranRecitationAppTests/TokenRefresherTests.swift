import XCTest
@testable import QuranRecitationApp

@MainActor
final class TokenRefresherTests: XCTestCase {
  private let original = AuthTokens(accessToken: "old-access", refreshToken: "old-refresh")
  private let rotated = AuthTokens(accessToken: "new-access", refreshToken: "new-refresh")

  func test_refresh_withStoredTokens_callsAuthServiceAndPersistsRotated() async throws {
    let authService = MockAuthService(refreshResult: .success(rotated))
    let store = InMemoryTokenStore(tokens: original, user: nil)
    let refresher = TokenRefresher(authService: authService, tokenStore: store)

    let result = try await refresher.refresh()

    XCTAssertEqual(result, rotated)
    XCTAssertEqual(authService.refreshCallCount, 1)
    XCTAssertEqual(authService.lastRefreshToken, "old-refresh")
    XCTAssertEqual(store.loadTokens(), rotated)
  }

  func test_refresh_withoutStoredTokens_throwsInvalidCredentials() async {
    let authService = MockAuthService(refreshResult: .success(rotated))
    let store = InMemoryTokenStore()
    let refresher = TokenRefresher(authService: authService, tokenStore: store)

    await XCTAssertThrowsErrorAsync(try await refresher.refresh()) { error in
      XCTAssertEqual((error as? AppError)?.telemetryCode, "invalid_credentials")
    }
    XCTAssertEqual(authService.refreshCallCount, 0)
  }

  func test_refresh_whenAuthServiceRejects_throwsInvalidCredentials_andPreservesStoredTokens() async {
    // BFF returns 401 for an unknown / revoked / replayed refresh token.
    // The retry layer maps that to a sign-out — but the refresher itself
    // must not clobber the stored tokens, so a transient bug elsewhere
    // doesn't strand the user.
    let authService = MockAuthService(refreshResult: .failure(.invalidCredentials))
    let store = InMemoryTokenStore(tokens: original, user: nil)
    let refresher = TokenRefresher(authService: authService, tokenStore: store)

    await XCTAssertThrowsErrorAsync(try await refresher.refresh()) { error in
      XCTAssertEqual((error as? AppError)?.telemetryCode, "invalid_credentials")
    }
    XCTAssertEqual(store.loadTokens(), original)
  }

  func test_refresh_whenBackendUnavailable_throwsAndPreservesStoredTokens() async {
    // 5xx is transient; the caller should be able to retry on the next
    // request without re-authenticating.
    let authService = MockAuthService(refreshResult: .failure(.backendUnavailable(operation: "auth.refresh")))
    let store = InMemoryTokenStore(tokens: original, user: nil)
    let refresher = TokenRefresher(authService: authService, tokenStore: store)

    await XCTAssertThrowsErrorAsync(try await refresher.refresh()) { error in
      XCTAssertEqual((error as? AppError)?.telemetryCode, "backend_unavailable")
    }
    XCTAssertEqual(store.loadTokens(), original)
  }

  func test_refresh_concurrentCalls_coalesceToSingleAuthServiceCall() async throws {
    // Three call sites get 401 at roughly the same moment (Apollo +
    // AuthHTTPClient + the upload path). They must share one rotation
    // so the BFF's replay-detection (apps/bff/src/rest/rest.ts:232)
    // does not revoke every outstanding token.
    let authService = MockAuthService(refreshResult: .success(rotated))
    let store = InMemoryTokenStore(tokens: original, user: nil)
    let refresher = TokenRefresher(authService: authService, tokenStore: store)

    let gate = AsyncGate()
    authService.refreshDelay = { await gate.wait() }

    async let a = refresher.refresh()
    async let b = refresher.refresh()
    async let c = refresher.refresh()

    // Yield the main actor enough times for all three child tasks to
    // queue on the in-flight refresh task.
    for _ in 0..<10 { await Task.yield() }

    gate.signal()

    let results = try await [a, b, c]
    XCTAssertEqual(authService.refreshCallCount, 1)
    XCTAssertEqual(results, [rotated, rotated, rotated])
    XCTAssertEqual(store.loadTokens(), rotated)
  }

  func test_refresh_afterInFlightCompletes_startsFreshTask() async throws {
    // Once the in-flight task settles, a subsequent refresh must mint
    // a new task rather than re-yielding the cached result.
    let authService = MockAuthService(refreshResult: .success(rotated))
    let store = InMemoryTokenStore(tokens: original, user: nil)
    let refresher = TokenRefresher(authService: authService, tokenStore: store)

    _ = try await refresher.refresh()
    _ = try await refresher.refresh()

    XCTAssertEqual(authService.refreshCallCount, 2)
  }
}

// MARK: - Helpers

/// One-shot async gate. `wait()` suspends until `signal()` (or earlier
/// if `signal()` already fired). Used to hold a mock async call open
/// while concurrent callers queue on its in-flight task.
private final class AsyncGate: @unchecked Sendable {
  private let lock = NSLock()
  private var continuation: CheckedContinuation<Void, Never>?
  private var released = false

  func wait() async {
    await withCheckedContinuation { cont in
      lock.lock()
      if released {
        lock.unlock()
        cont.resume()
      } else {
        continuation = cont
        lock.unlock()
      }
    }
  }

  func signal() {
    lock.lock()
    released = true
    let cont = continuation
    continuation = nil
    lock.unlock()
    cont?.resume()
  }
}

/// Async equivalent of `XCTAssertThrowsError` so we don't have to
/// hand-roll do/catch in every negative test.
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
