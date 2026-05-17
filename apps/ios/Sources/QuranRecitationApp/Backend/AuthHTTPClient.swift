import Foundation

/// Authenticated HTTP transport for the BFF REST surface. Attaches
/// `Authorization: Bearer <accessToken>` from `TokenStore` on every
/// outbound request, and on a 401 retries once after asking
/// `TokenRefresher` for a freshly rotated pair.
///
/// On a confirmed auth failure — no stored token, refresh rejected,
/// or the rotated token itself rejected — the configured `onSignOut`
/// hook fires so the UI flips back to the signed-out shell. Network
/// and 5xx errors bubble unchanged so the caller can present a
/// retry-able state without nuking the session.
///
/// `Transport` is injected (rather than a `URLSession`) so unit tests
/// can stub the wire without touching the network: production wires
/// `URLSessionTransport.default`, tests pass a closure that returns
/// canned `(Data, HTTPURLResponse)` tuples.
@MainActor
final class AuthHTTPClient {
  typealias Transport = @Sendable (URLRequest) async throws -> (Data, HTTPURLResponse)

  private let transport: Transport
  private let tokenStore: TokenStore
  private let refresher: TokenRefresher
  private let onSignOut: @MainActor () -> Void

  init(
    transport: @escaping Transport = URLSessionTransport.default,
    tokenStore: TokenStore,
    refresher: TokenRefresher,
    onSignOut: @escaping @MainActor () -> Void
  ) {
    self.transport = transport
    self.tokenStore = tokenStore
    self.refresher = refresher
    self.onSignOut = onSignOut
  }

  /// Send a request as the signed-in user. Returns the BFF response
  /// tuple on any non-401 outcome (so the caller can map domain status
  /// codes like 404 or 502 themselves). Throws
  /// `AppError.invalidCredentials` and signs the user out when the
  /// auth path is confirmed dead — either no token, refresh rejected,
  /// or even the rotated token is refused.
  ///
  /// `retryOn401`: when `false`, a 401 is returned to the caller
  /// unchanged (no refresh, no sign-out). This is the escape hatch for
  /// endpoints where 401 is semantically overloaded — `/auth/me/email`
  /// and `/auth/me/password` reuse 401 for "current password
  /// incorrect", and we must not let that response evict a still-valid
  /// session. The default `true` preserves the standard rotate-and-
  /// retry behaviour for plain Bearer-authenticated endpoints.
  func send(_ request: URLRequest, retryOn401: Bool = true) async throws -> (Data, HTTPURLResponse) {
    guard let tokens = tokenStore.loadTokens() else {
      onSignOut()
      throw AppError.invalidCredentials
    }

    let first = try await attempt(request, accessToken: tokens.accessToken)
    if first.1.statusCode != 401 || !retryOn401 {
      return first
    }

    let rotated: AuthTokens
    do {
      rotated = try await refresher.refresh()
    } catch AppError.invalidCredentials {
      // The refresh token itself was rejected — fresh /auth/login
      // required, so cut the session.
      onSignOut()
      throw AppError.invalidCredentials
    } catch {
      // Transient (network / 5xx). Let the caller surface it without
      // stranding the user.
      throw error
    }

    let second = try await attempt(request, accessToken: rotated.accessToken)
    if second.1.statusCode == 401 {
      // Rotation succeeded but the BFF still says no — treat as a
      // confirmed sign-out rather than looping or surfacing 401 to the
      // domain caller.
      onSignOut()
      throw AppError.invalidCredentials
    }
    return second
  }

  private func attempt(_ request: URLRequest, accessToken: String) async throws -> (Data, HTTPURLResponse) {
    var req = request
    req.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
    return try await transport(req)
  }
}

/// Production `Transport` wired on top of `URLSession.shared`. Raw
/// `URLError`s and unexpected response types are converted to
/// `AppError` so `AuthHTTPClient` only deals in our error vocabulary.
enum URLSessionTransport {
  static let `default`: AuthHTTPClient.Transport = { request in
    do {
      let (data, response) = try await URLSession.shared.data(for: request)
      guard let http = response as? HTTPURLResponse else {
        throw AppError.network(underlying: URLError(.badServerResponse))
      }
      return (data, http)
    } catch let error as AppError {
      throw error
    } catch {
      throw AppError.network(underlying: error)
    }
  }
}
