import Foundation

// MARK: - DTOs

/// Access + refresh JWT pair issued by the BFF `/auth/*` endpoints
/// (see ADR 0010). The access token is short-lived (15 min) and the
/// refresh token long-lived (30 days); attaching either to outbound
/// requests is a follow-up — this pass only persists them.
struct AuthTokens: Equatable {
  let accessToken: String
  let refreshToken: String
}

/// The signed-in user's public profile, as returned in the `user`
/// object of an `/auth/login` or `/auth/signup` response. Mirrors the
/// web `AuthSessionUser` shape so a future server-side identity store
/// can serve both clients without per-platform mapping.
struct AuthenticatedUser: Codable, Equatable {
  let id: String
  let email: String
  let displayName: String?
  /// ISO-8601 string. Optional because (a) the BFF only started
  /// returning this with the profile work, and (b) accounts persisted
  /// before that day still need to decode from Keychain without a
  /// `keyNotFound` error.
  let createdAt: String?
  /// Skill bucket the user chose on sign-up. Optional for the same
  /// backward-compatibility reasons as `createdAt`, plus iOS does not
  /// send the field on sign-up today so the value can be `null` for
  /// freshly created accounts as well.
  let level: String?
  let passwordChangedAt: String?

  // Default-valued init so call sites that pre-date `createdAt` / `level`
  // (tests, fixtures, MockAuthService) keep compiling without a churn
  // PR. New call sites can pass either field explicitly.
  init(
    id: String,
    email: String,
    displayName: String?,
    createdAt: String? = nil,
    level: String? = nil,
    passwordChangedAt: String? = nil
  ) {
    self.id = id
    self.email = email
    self.displayName = displayName
    self.createdAt = createdAt
    self.level = level
    self.passwordChangedAt = passwordChangedAt
  }
}

// MARK: - Protocol

/// Persistence surface for the signed-in user's tokens and profile.
/// The View / ViewModel layer never touches this directly — `SessionStore`
/// owns it. Production uses `KeychainTokenStore`, Previews and tests use
/// `InMemoryTokenStore`. Mirrors the `HistoryStore` protocol / real-impl /
/// in-memory trio, and the Android `AuthSession` surface.
protocol TokenStore {
  func loadTokens() -> AuthTokens?
  func saveTokens(_ tokens: AuthTokens)

  func loadUser() -> AuthenticatedUser?
  func saveUser(_ user: AuthenticatedUser)

  /// Drop every stored item — tokens and user. Used by sign-out and
  /// before persisting a freshly authenticated session.
  func clear()
}

enum TokenStoreConstants {
  /// Keychain service identifier; also the `OSLog` subsystem family.
  static let service = "com.tilawah.ios.auth"

  enum Account {
    static let accessToken = "accessToken"
    static let refreshToken = "refreshToken"
    static let user = "user"
  }
}
