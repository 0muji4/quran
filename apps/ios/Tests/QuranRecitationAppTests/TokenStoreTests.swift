import XCTest
@testable import QuranRecitationApp

/// Exercises `TokenStore` behaviour through `InMemoryTokenStore`.
/// `KeychainTokenStore` shares the same contract but is covered by
/// manual verification — Keychain access is flaky in the SPM test
/// runner without an app entitlement / signed host.
final class TokenStoreTests: XCTestCase {
  func test_roundTripsTokensAndUser() {
    let store = InMemoryTokenStore()
    XCTAssertNil(store.loadTokens())
    XCTAssertNil(store.loadUser())

    let tokens = AuthTokens(accessToken: "access-jwt", refreshToken: "refresh-jwt")
    let user = AuthenticatedUser(id: "user-1", email: "noor@example.com", displayName: "Noor")
    store.saveTokens(tokens)
    store.saveUser(user)

    XCTAssertEqual(store.loadTokens(), tokens)
    XCTAssertEqual(store.loadUser(), user)
  }

  func test_clear_dropsEverything() {
    let store = InMemoryTokenStore(
      tokens: AuthTokens(accessToken: "access-jwt", refreshToken: "refresh-jwt"),
      user: AuthenticatedUser(id: "user-1", email: "noor@example.com", displayName: nil)
    )

    store.clear()

    XCTAssertNil(store.loadTokens())
    XCTAssertNil(store.loadUser())
  }
}
