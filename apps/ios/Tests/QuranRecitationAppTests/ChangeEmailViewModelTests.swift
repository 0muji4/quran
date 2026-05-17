import XCTest
@testable import QuranRecitationApp

@MainActor
final class ChangeEmailViewModelTests: XCTestCase {
  private let user = AuthenticatedUser(
    id: "u1",
    email: "noor@example.com",
    displayName: "Noor",
    createdAt: "2026-01-04T12:00:00.000Z",
    level: "beginner"
  )

  private func makeViewModel(
    service: MockProfileService? = nil,
    currentEmail: String = "noor@example.com"
  ) -> (ChangeEmailViewModel, SessionStore, MockProfileService) {
    let mock = service ?? MockProfileService()
    let tokenStore = InMemoryTokenStore(
      tokens: AuthTokens(accessToken: "a", refreshToken: "r"),
      user: user
    )
    let session = SessionStore(tokenStore: tokenStore)
    let viewModel = ChangeEmailViewModel(
      currentEmail: currentEmail,
      profileService: mock,
      session: session
    )
    return (viewModel, session, mock)
  }

  // MARK: - Preflight / canSubmit

  func test_canSubmit_isFalse_initially() {
    let (vm, _, _) = makeViewModel()
    XCTAssertFalse(vm.canSubmit)
  }

  func test_canSubmit_isFalse_whenCurrentPasswordMissing() {
    let (vm, _, _) = makeViewModel()
    vm.newEmail = "new@example.com"
    XCTAssertFalse(vm.canSubmit)
  }

  func test_canSubmit_isFalse_whenNewEmailMissing() {
    let (vm, _, _) = makeViewModel()
    vm.currentPassword = "old-password"
    XCTAssertFalse(vm.canSubmit)
  }

  func test_canSubmit_isFalse_whenNewEmailMalformed() {
    // Catch obvious typos before spending a network round-trip; the
    // BFF zod schema does the authoritative validation.
    let (vm, _, _) = makeViewModel()
    vm.currentPassword = "old-password"
    vm.newEmail = "not-an-email"
    XCTAssertFalse(vm.canSubmit)
  }

  func test_canSubmit_isFalse_whenNewEmailMatchesCurrent_caseInsensitive() {
    // "Same address" check must ignore case so the BFF doesn't get a
    // 200 no-op (its own short-circuit) for what the user thinks is a
    // change.
    let (vm, _, _) = makeViewModel(currentEmail: "noor@example.com")
    vm.currentPassword = "old-password"
    vm.newEmail = "NOOR@example.com"
    XCTAssertFalse(vm.canSubmit)
  }

  func test_canSubmit_isTrue_whenAllRulesPass() {
    let (vm, _, _) = makeViewModel()
    vm.currentPassword = "old-password"
    vm.newEmail = "fresh@example.com"
    XCTAssertTrue(vm.canSubmit)
    XCTAssertNil(vm.preflightError())
  }

  // MARK: - submit

  func test_submit_success_updatesSessionAndReturnsTrue() async {
    let refreshed = AuthenticatedUser(
      id: "u1",
      email: "fresh@example.com",
      displayName: "Noor",
      createdAt: "2026-01-04T12:00:00.000Z",
      level: "beginner"
    )
    let mock = MockProfileService()
    mock.updateEmailResult = .success(refreshed)
    let (vm, session, _) = makeViewModel(service: mock)
    vm.currentPassword = "old-password"
    vm.newEmail = "fresh@example.com"

    let ok = await vm.submit()

    XCTAssertTrue(ok)
    XCTAssertEqual(vm.status, .idle)
    XCTAssertEqual(session.currentUser?.email, "fresh@example.com")
    XCTAssertEqual(mock.lastUpdateEmailCurrentPassword, "old-password")
    XCTAssertEqual(mock.lastUpdateEmailNewEmail, "fresh@example.com")
  }

  func test_submit_trimsWhitespaceFromNewEmail() async {
    let refreshed = AuthenticatedUser(
      id: "u1",
      email: "fresh@example.com",
      displayName: "Noor",
      createdAt: nil,
      level: nil
    )
    let mock = MockProfileService()
    mock.updateEmailResult = .success(refreshed)
    let (vm, _, _) = makeViewModel(service: mock)
    vm.currentPassword = "old-password"
    // Paste / autocomplete will sometimes leave a trailing space —
    // the BFF zod treats that as an invalid email, so trim first.
    vm.newEmail = "  fresh@example.com  "

    _ = await vm.submit()

    XCTAssertEqual(mock.lastUpdateEmailNewEmail, "fresh@example.com")
  }

  func test_submit_invalidCredentials_mapsToCurrentPasswordIncorrect() async {
    let mock = MockProfileService()
    mock.updateEmailResult = .failure(.invalidCredentials)
    let (vm, session, _) = makeViewModel(service: mock)
    vm.currentPassword = "wrong"
    vm.newEmail = "fresh@example.com"

    let ok = await vm.submit()

    XCTAssertFalse(ok)
    if case let .error(message) = vm.status {
      XCTAssertTrue(
        message.localizedCaseInsensitiveContains("current password"),
        "expected wrong-current-password copy, got '\(message)'"
      )
    } else {
      XCTFail("expected .error status")
    }
    // Session stays on the previous email.
    XCTAssertEqual(session.currentUser?.email, "noor@example.com")
  }

  func test_submit_emailInUse_setsErrorWithDistinctCopy() async {
    let mock = MockProfileService()
    mock.updateEmailResult = .failure(.emailInUse)
    let (vm, _, _) = makeViewModel(service: mock)
    vm.currentPassword = "old-password"
    vm.newEmail = "taken@example.com"

    _ = await vm.submit()

    if case let .error(message) = vm.status {
      XCTAssertTrue(
        message.localizedCaseInsensitiveContains("already"),
        "expected already-in-use copy, got '\(message)'"
      )
    } else {
      XCTFail("expected .error status")
    }
  }

  func test_submit_failedPreflight_doesNotCallService() async {
    let mock = MockProfileService()
    mock.updateEmailResult = .success(user)
    let (vm, _, _) = makeViewModel(service: mock)
    // Missing current password — preflight must short-circuit.
    vm.newEmail = "fresh@example.com"

    let ok = await vm.submit()

    XCTAssertFalse(ok)
    XCTAssertEqual(mock.updateEmailCallCount, 0)
    if case .error = vm.status {} else { XCTFail("expected .error status") }
  }

  func test_clearError_resetsToIdleAfterError() async {
    let mock = MockProfileService()
    mock.updateEmailResult = .failure(.validationFailed)
    let (vm, _, _) = makeViewModel(service: mock)
    vm.currentPassword = "old-password"
    vm.newEmail = "fresh@example.com"

    _ = await vm.submit()
    vm.clearError()

    XCTAssertEqual(vm.status, .idle)
  }
}
