import XCTest
@testable import QuranRecitationApp

@MainActor
final class DeleteAccountViewModelTests: XCTestCase {
  private func makeViewModel(
    service: MockProfileService? = nil
  ) -> (DeleteAccountViewModel, SessionStore, MockProfileService) {
    let mock = service ?? MockProfileService()
    let user = AuthenticatedUser(
      id: "u1",
      email: "noor@example.com",
      displayName: "Noor"
    )
    let tokenStore = InMemoryTokenStore(
      tokens: AuthTokens(accessToken: "a", refreshToken: "r"),
      user: user
    )
    let session = SessionStore(tokenStore: tokenStore)
    let viewModel = DeleteAccountViewModel(profileService: mock, session: session)
    return (viewModel, session, mock)
  }

  // MARK: - Gating

  func test_canSubmit_isFalse_initially() {
    let (vm, _, _) = makeViewModel()
    XCTAssertFalse(vm.canSubmit)
  }

  func test_canSubmit_isFalse_whenPhraseDoesNotMatch() {
    // Strict equality, including capitalisation. "delete" / " DELETE "
    // both must fail so the destructive action stays unambiguous.
    let (vm, _, _) = makeViewModel()
    vm.confirmText = "delete"
    XCTAssertFalse(vm.canSubmit)
    vm.confirmText = " DELETE "
    XCTAssertFalse(vm.canSubmit)
  }

  func test_canSubmit_isTrue_whenPhraseMatches() {
    let (vm, _, _) = makeViewModel()
    vm.confirmText = "DELETE"
    XCTAssertTrue(vm.canSubmit)
  }

  // MARK: - submit

  func test_submit_success_signsOutLocallyAndReturnsTrue() async {
    let mock = MockProfileService()
    mock.deleteAccountResult = .success(())
    let (vm, session, _) = makeViewModel(service: mock)
    vm.confirmText = "DELETE"
    XCTAssertNotNil(session.currentUser)

    let ok = await vm.submit()

    XCTAssertTrue(ok)
    XCTAssertEqual(vm.status, .idle)
    XCTAssertNil(session.currentUser, "local session must be cleared on successful soft-delete")
    XCTAssertEqual(mock.deleteAccountCallCount, 1)
  }

  func test_submit_phraseMismatch_doesNotCallService() async {
    // Programmatic call must still pass the same gate — `canSubmit`
    // controls the button, but submit() is the source of truth.
    let mock = MockProfileService()
    mock.deleteAccountResult = .success(())
    let (vm, session, _) = makeViewModel(service: mock)
    vm.confirmText = "delete"  // wrong case

    let ok = await vm.submit()

    XCTAssertFalse(ok)
    XCTAssertEqual(mock.deleteAccountCallCount, 0)
    XCTAssertNotNil(session.currentUser, "local session intact when delete short-circuits")
    if case .error = vm.status {} else { XCTFail("expected .error status") }
  }

  func test_submit_networkError_leavesSessionIntactAndSurfacesError() async {
    let underlying = URLError(.notConnectedToInternet)
    let mock = MockProfileService()
    mock.deleteAccountResult = .failure(.network(underlying: underlying))
    let (vm, session, _) = makeViewModel(service: mock)
    vm.confirmText = "DELETE"

    let ok = await vm.submit()

    XCTAssertFalse(ok)
    XCTAssertNotNil(session.currentUser, "network failure must not strand a half-deleted state")
    if case .error = vm.status {} else { XCTFail("expected .error status") }
  }

  func test_submit_backendUnavailable_setsErrorStatus() async {
    let mock = MockProfileService()
    mock.deleteAccountResult = .failure(.backendUnavailable(operation: "profile.delete"))
    let (vm, session, _) = makeViewModel(service: mock)
    vm.confirmText = "DELETE"

    _ = await vm.submit()

    if case .error = vm.status {} else { XCTFail("expected .error status") }
    XCTAssertNotNil(session.currentUser)
  }

  func test_clearError_resetsToIdleAfterError() async {
    let mock = MockProfileService()
    mock.deleteAccountResult = .failure(.backendUnavailable(operation: "profile.delete"))
    let (vm, _, _) = makeViewModel(service: mock)
    vm.confirmText = "DELETE"

    _ = await vm.submit()
    vm.clearError()

    XCTAssertEqual(vm.status, .idle)
  }
}
