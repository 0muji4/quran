import XCTest
@testable import QuranRecitationApp

@MainActor
final class EditProfileViewModelTests: XCTestCase {
  private func makeUser(
    displayName: String? = "Noor",
    level: String? = "beginner",
    email: String = "noor@example.com"
  ) -> AuthenticatedUser {
    AuthenticatedUser(
      id: "u1",
      email: email,
      displayName: displayName,
      createdAt: "2026-01-04T12:00:00.000Z",
      level: level
    )
  }

  private func makeViewModel(
    user: AuthenticatedUser,
    profileService: MockProfileService = MockProfileService()
  ) -> (EditProfileViewModel, SessionStore, MockProfileService) {
    let tokenStore = InMemoryTokenStore(
      tokens: AuthTokens(accessToken: "a", refreshToken: "r"),
      user: user
    )
    let session = SessionStore(tokenStore: tokenStore)
    let viewModel = EditProfileViewModel(
      user: user,
      profileService: profileService,
      session: session
    )
    return (viewModel, session, profileService)
  }

  // MARK: - Initial state

  func test_init_seedsFromUser() {
    let (vm, _, _) = makeViewModel(user: makeUser(displayName: "Noor", level: "advanced"))
    XCTAssertEqual(vm.displayName, "Noor")
    XCTAssertEqual(vm.level, "advanced")
    XCTAssertEqual(vm.status, .idle)
    XCTAssertFalse(vm.hasChanges)
    XCTAssertFalse(vm.canSubmit)
  }

  func test_init_trimsWhitespaceFromDisplayName() {
    let (vm, _, _) = makeViewModel(user: makeUser(displayName: "  Noor  "))
    XCTAssertEqual(vm.displayName, "Noor")
    XCTAssertFalse(vm.hasChanges)
  }

  // MARK: - hasChanges / canSubmit

  func test_canSubmit_isTrue_whenDisplayNameChanged() {
    let (vm, _, _) = makeViewModel(user: makeUser())
    vm.displayName = "Noor Updated"
    XCTAssertTrue(vm.hasChanges)
    XCTAssertTrue(vm.canSubmit)
  }

  func test_canSubmit_isTrue_whenLevelChanged() {
    let (vm, _, _) = makeViewModel(user: makeUser(level: "beginner"))
    vm.level = "advanced"
    XCTAssertTrue(vm.canSubmit)
  }

  func test_canSubmit_isFalse_whenClearingNonEmptyDisplayName() {
    // BFF zod rejects "" and we have no UX for clearing a name; the
    // form must keep Save disabled rather than land in a 400.
    let (vm, _, _) = makeViewModel(user: makeUser(displayName: "Noor"))
    vm.displayName = ""
    XCTAssertFalse(vm.canSubmit)
  }

  func test_canSubmit_isTrue_whenInitialDisplayNameEmpty_andOnlyLevelChanges() {
    // Initial nil/empty name is a valid persistent state; the form
    // should still allow editing the level without forcing a name.
    let (vm, _, _) = makeViewModel(user: makeUser(displayName: nil, level: nil))
    vm.level = "beginner"
    XCTAssertTrue(vm.canSubmit)
  }

  // MARK: - submit

  func test_submit_success_updatesSessionAndReturnsTrue() async {
    let refreshed = AuthenticatedUser(
      id: "u1",
      email: "noor@example.com",
      displayName: "Noor Updated",
      createdAt: "2026-01-04T12:00:00.000Z",
      level: "advanced"
    )
    let service = MockProfileService()
    service.updateProfileResult = .success(refreshed)
    let (vm, session, _) = makeViewModel(user: makeUser(), profileService: service)
    vm.displayName = "Noor Updated"
    vm.level = "advanced"

    let ok = await vm.submit()

    XCTAssertTrue(ok)
    XCTAssertEqual(vm.status, .idle)
    XCTAssertEqual(session.currentUser?.displayName, "Noor Updated")
    XCTAssertEqual(session.currentUser?.level, "advanced")
    // Both fields changed → both PATCHed.
    XCTAssertEqual(service.lastUpdateProfileDisplayName, .some("Noor Updated"))
    XCTAssertEqual(service.lastUpdateProfileLevel, .some("advanced"))
  }

  func test_submit_onlyLevelChanged_sendsNilForDisplayName() async {
    let refreshed = AuthenticatedUser(
      id: "u1",
      email: "noor@example.com",
      displayName: "Noor",
      createdAt: nil,
      level: "advanced"
    )
    let service = MockProfileService()
    service.updateProfileResult = .success(refreshed)
    let (vm, _, _) = makeViewModel(user: makeUser(), profileService: service)
    vm.level = "advanced"

    _ = await vm.submit()

    // ProfileService treats nil here as "leave the column alone";
    // we must not echo the unchanged displayName.
    XCTAssertEqual(service.lastUpdateProfileDisplayName, .some(nil))
    XCTAssertEqual(service.lastUpdateProfileLevel, .some("advanced"))
  }

  func test_submit_validationFailed_setsErrorStatusAndReturnsFalse() async {
    let service = MockProfileService()
    service.updateProfileResult = .failure(.validationFailed)
    let (vm, session, _) = makeViewModel(user: makeUser(), profileService: service)
    vm.displayName = "Noor Updated"

    let ok = await vm.submit()

    XCTAssertFalse(ok)
    if case .error = vm.status {
      // expected
    } else {
      XCTFail("expected .error status, got \(vm.status)")
    }
    // Session must stay on the previous user — failed submit doesn't
    // get to publish a phantom value.
    XCTAssertEqual(session.currentUser?.displayName, "Noor")
  }

  func test_submit_backendUnavailable_setsErrorStatus() async {
    let service = MockProfileService()
    service.updateProfileResult = .failure(.backendUnavailable(operation: "profile.update"))
    let (vm, _, _) = makeViewModel(user: makeUser(), profileService: service)
    vm.displayName = "Noor Updated"

    _ = await vm.submit()

    if case .error = vm.status {
      // expected
    } else {
      XCTFail("expected .error status")
    }
  }

  func test_clearError_resetsToIdleAfterError() async {
    let service = MockProfileService()
    service.updateProfileResult = .failure(.validationFailed)
    let (vm, _, _) = makeViewModel(user: makeUser(), profileService: service)
    vm.displayName = "Noor Updated"

    _ = await vm.submit()
    vm.clearError()

    XCTAssertEqual(vm.status, .idle)
  }
}
