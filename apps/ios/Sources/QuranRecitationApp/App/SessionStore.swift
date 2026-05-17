import Combine
import Foundation

/// Owns the signed-in user's session. Wraps `TokenStore` and publishes
/// the current `AuthenticatedUser` (or `nil` when signed out / using
/// the app anonymously).
///
/// The Profile tab observes this to switch between the signed-out shell
/// and the signed-in summary; `AuthViewModel` calls
/// `completeAuthentication` after a successful sign-in / sign-up. The
/// app stays usable anonymously — there is no launch gate (parity with
/// the Web client and the Android `AuthSession` model).
@MainActor
final class SessionStore: ObservableObject {
  /// The signed-in user, or `nil` when no session is stored.
  @Published private(set) var currentUser: AuthenticatedUser? = nil

  private let tokenStore: TokenStore

  init(tokenStore: TokenStore) {
    self.tokenStore = tokenStore
    // Load any persisted session synchronously at construction — the
    // Keychain read is fast and lets the Profile tab render the right
    // state on first appearance without a loading flash.
    if tokenStore.loadTokens() != nil {
      self.currentUser = tokenStore.loadUser()
    }
  }

  var isSignedIn: Bool {
    currentUser != nil
  }

  /// Persist a freshly authenticated session and publish the user.
  /// `clear()` first drops any stale items so a re-auth never leaves a
  /// half-written session behind.
  func completeAuthentication(_ success: AuthSuccess) {
    tokenStore.clear()
    tokenStore.saveTokens(success.tokens)
    tokenStore.saveUser(success.user)
    currentUser = success.user
  }

  /// Replace the stored user profile without rotating tokens. Called
  /// after `ProfileService.updateProfile` / `.updateEmail` so the
  /// header card and any other view bound to `currentUser` refreshes
  /// without forcing a re-sign-in. The token pair is left untouched
  /// — those endpoints don't return a new pair.
  func updateUser(_ user: AuthenticatedUser) {
    tokenStore.saveUser(user)
    currentUser = user
  }

  /// Clear the stored session and return to the signed-out state.
  func signOut() {
    tokenStore.clear()
    currentUser = nil
  }
}
