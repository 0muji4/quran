import XCTest
@testable import QuranRecitationApp

@MainActor
final class SessionStoreTests: XCTestCase {
  func test_init_withStoredSession_loadsCurrentUser() {
    let user = AuthenticatedUser(id: "user-1", email: "noor@example.com", displayName: "Noor")
    let store = InMemoryTokenStore(
      tokens: AuthTokens(accessToken: "a", refreshToken: "r"),
      user: user
    )

    let session = SessionStore(tokenStore: store)

    XCTAssertEqual(session.currentUser, user)
    XCTAssertTrue(session.isSignedIn)
  }

  func test_init_withNoStoredSession_isSignedOut() {
    let session = SessionStore(tokenStore: InMemoryTokenStore())

    XCTAssertNil(session.currentUser)
    XCTAssertFalse(session.isSignedIn)
  }

  func test_init_withTokensButNoUser_isSignedOut() {
    // Defensive: a half-written store must not present as signed in.
    let store = InMemoryTokenStore(
      tokens: AuthTokens(accessToken: "a", refreshToken: "r"),
      user: nil
    )

    let session = SessionStore(tokenStore: store)

    XCTAssertNil(session.currentUser)
  }

  func test_completeAuthentication_persistsAndPublishesUser() {
    let store = InMemoryTokenStore()
    let session = SessionStore(tokenStore: store)
    let success = AuthSuccess.fixture()

    session.completeAuthentication(success)

    XCTAssertEqual(session.currentUser, success.user)
    XCTAssertEqual(store.loadTokens(), success.tokens)
    XCTAssertEqual(store.loadUser(), success.user)
  }

  func test_signOut_clearsStorageAndUser() {
    let store = InMemoryTokenStore(
      tokens: AuthTokens(accessToken: "a", refreshToken: "r"),
      user: AuthenticatedUser(id: "user-1", email: "noor@example.com", displayName: nil)
    )
    let session = SessionStore(tokenStore: store)

    session.signOut()

    XCTAssertNil(session.currentUser)
    XCTAssertNil(store.loadTokens())
    XCTAssertNil(store.loadUser())
  }
}
