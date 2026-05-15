import Foundation

/// Coalesces concurrent `POST /auth/refresh` calls into a single
/// in-flight request and persists the rotated `AuthTokens` to the
/// `TokenStore` before returning.
///
/// Why this exists: the BFF treats a re-presented refresh token as a
/// replay attack and revokes every outstanding token for the user
/// (`apps/bff/src/rest/rest.ts:232`). When several API clients
/// (Apollo, `AuthHTTPClient`, the upload path) each receive a 401 at
/// roughly the same moment, they must all share one rotation —
/// otherwise the second redemption looks like a replay and signs the
/// user out.
///
/// Why `@MainActor` rather than its own actor: `SessionStore` and the
/// observed UI state already live on the main actor, the network IO
/// inside `authService.refresh` releases the main actor while awaiting,
/// and a single isolation domain keeps `TokenStore` accesses
/// linearised without retrofitting `Sendable` onto every implementation.
///
/// Refresh failure is bubbled as-is. The HTTP retry layer added in
/// follow-up PRs decides whether to sign the user out — an
/// `AppError.invalidCredentials` is the signal that the refresh token
/// has been revoked or replayed and a fresh `/auth/login` is required;
/// `.network` / `.backendUnavailable` are transient and the caller can
/// surface them without nuking the session.
@MainActor
final class TokenRefresher {
  private let authService: AuthService
  private let tokenStore: TokenStore
  private var inFlight: Task<AuthTokens, Error>?

  init(authService: AuthService, tokenStore: TokenStore) {
    self.authService = authService
    self.tokenStore = tokenStore
  }

  /// Returns a freshly rotated `AuthTokens`. Concurrent callers share
  /// the same in-flight `Task`, so only one `POST /auth/refresh` fires
  /// per rotation window.
  ///
  /// Throws `AppError.invalidCredentials` when no refresh token is
  /// stored (the user is not signed in), or when the BFF rejects the
  /// token. Other `AppError` cases bubble from `AuthService.refresh`.
  func refresh() async throws -> AuthTokens {
    if let task = inFlight {
      return try await task.value
    }
    let task = Task { @MainActor in
      try await self.performRefresh()
    }
    inFlight = task
    defer { inFlight = nil }
    return try await task.value
  }

  private func performRefresh() async throws -> AuthTokens {
    guard let current = tokenStore.loadTokens() else {
      throw AppError.invalidCredentials
    }
    let rotated = try await authService.refresh(refreshToken: current.refreshToken)
    tokenStore.saveTokens(rotated)
    return rotated
  }
}
