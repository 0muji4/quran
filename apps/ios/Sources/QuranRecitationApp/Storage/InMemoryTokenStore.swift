import Foundation

/// In-memory `TokenStore` for SwiftUI Previews and unit tests. State is
/// held in plain properties; nothing is persisted. Mirrors
/// `InMemoryHistoryStore`.
final class InMemoryTokenStore: TokenStore {
  private var tokens: AuthTokens?
  private var user: AuthenticatedUser?

  init(
    tokens: AuthTokens? = nil,
    user: AuthenticatedUser? = nil
  ) {
    self.tokens = tokens
    self.user = user
  }

  func loadTokens() -> AuthTokens? { tokens }
  func saveTokens(_ tokens: AuthTokens) { self.tokens = tokens }

  func loadUser() -> AuthenticatedUser? { user }
  func saveUser(_ user: AuthenticatedUser) { self.user = user }

  func clear() {
    tokens = nil
    user = nil
  }
}
