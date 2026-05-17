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

  // MARK: - Reactivation notice (ADR-0024 §4)

  func test_init_pendingReactivationNotice_isFalse() {
    let session = SessionStore(tokenStore: InMemoryTokenStore())
    XCTAssertFalse(session.pendingReactivationNotice)
  }

  func test_completeAuthentication_reactivatedTrue_flipsTheFlag() {
    let session = SessionStore(tokenStore: InMemoryTokenStore())
    let success = AuthSuccess(
      tokens: AuthTokens(accessToken: "a", refreshToken: "r"),
      user: AuthenticatedUser(id: "u1", email: "noor@example.com", displayName: nil),
      reactivated: true
    )

    session.completeAuthentication(success)

    XCTAssertTrue(session.pendingReactivationNotice)
  }

  func test_completeAuthentication_reactivatedFalse_leavesFlagOff() {
    let session = SessionStore(tokenStore: InMemoryTokenStore())

    session.completeAuthentication(AuthSuccess.fixture())  // default reactivated: false

    XCTAssertFalse(session.pendingReactivationNotice)
  }

  func test_acknowledgeReactivationNotice_clearsFlag() {
    let session = SessionStore(tokenStore: InMemoryTokenStore())
    let success = AuthSuccess(
      tokens: AuthTokens(accessToken: "a", refreshToken: "r"),
      user: AuthenticatedUser(id: "u1", email: "noor@example.com", displayName: nil),
      reactivated: true
    )
    session.completeAuthentication(success)
    XCTAssertTrue(session.pendingReactivationNotice)

    session.acknowledgeReactivationNotice()

    XCTAssertFalse(session.pendingReactivationNotice)
  }

  func test_signOut_clearsReactivationFlag() {
    // A stale notice from a previous session must not survive into
    // the next sign-in.
    let session = SessionStore(tokenStore: InMemoryTokenStore())
    let success = AuthSuccess(
      tokens: AuthTokens(accessToken: "a", refreshToken: "r"),
      user: AuthenticatedUser(id: "u1", email: "noor@example.com", displayName: nil),
      reactivated: true
    )
    session.completeAuthentication(success)

    session.signOut()

    XCTAssertFalse(session.pendingReactivationNotice)
  }
}
