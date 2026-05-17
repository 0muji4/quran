import XCTest
@testable import QuranRecitationApp

@MainActor
final class UpdatePasswordViewModelTests: XCTestCase {
  private func makeViewModel(
    service: MockProfileService? = nil
  ) -> (UpdatePasswordViewModel, MockProfileService) {
    let mock = service ?? MockProfileService()
    let vm = UpdatePasswordViewModel(profileService: mock)
    return (vm, mock)
  }

  // MARK: - Preflight / canSubmit

  func test_canSubmit_isFalse_initially() {
    let (vm, _) = makeViewModel()
    XCTAssertFalse(vm.canSubmit)
    XCTAssertNotNil(vm.preflightError())
  }

  func test_canSubmit_isFalse_whenCurrentMissing() {
    let (vm, _) = makeViewModel()
    vm.newPassword = "newpassword1"
    vm.confirmPassword = "newpassword1"
    XCTAssertFalse(vm.canSubmit)
  }

  func test_canSubmit_isFalse_whenNewTooShort() {
    let (vm, _) = makeViewModel()
    vm.currentPassword = "old"
    vm.newPassword = "short"
    vm.confirmPassword = "short"
    XCTAssertFalse(vm.canSubmit)
  }

  func test_canSubmit_isFalse_whenConfirmMismatch() {
    let (vm, _) = makeViewModel()
    vm.currentPassword = "old-password"
    vm.newPassword = "newpassword1"
    vm.confirmPassword = "newpassword2"
    XCTAssertFalse(vm.canSubmit)
  }

  func test_canSubmit_isFalse_whenNewMatchesCurrent() {
    let (vm, _) = makeViewModel()
    vm.currentPassword = "samepassword1"
    vm.newPassword = "samepassword1"
    vm.confirmPassword = "samepassword1"
    XCTAssertFalse(vm.canSubmit)
  }

  func test_canSubmit_isTrue_whenAllRulesPass() {
    let (vm, _) = makeViewModel()
    vm.currentPassword = "old-password"
    vm.newPassword = "newpassword1"
    vm.confirmPassword = "newpassword1"
    XCTAssertTrue(vm.canSubmit)
    XCTAssertNil(vm.preflightError())
  }

  // MARK: - submit

  func test_submit_success_returnsTrueAndForwardsBothFields() async {
    let mock = MockProfileService()
    mock.updatePasswordResult = .success(())
    let (vm, _) = makeViewModel(service: mock)
    vm.currentPassword = "old-password"
    vm.newPassword = "newpassword1"
    vm.confirmPassword = "newpassword1"

    let ok = await vm.submit()

    XCTAssertTrue(ok)
    XCTAssertEqual(vm.status, .idle)
    XCTAssertEqual(mock.lastUpdatePasswordCurrentPassword, "old-password")
    XCTAssertEqual(mock.lastUpdatePasswordNewPassword, "newpassword1")
  }

  func test_submit_failedPreflight_doesNotCallService() async {
    // Current password is missing — submit must short-circuit before
    // touching the network so a wrong field doesn't waste a round
    // trip (or worse, get logged in BFF telemetry as an auth attempt).
    let mock = MockProfileService()
    mock.updatePasswordResult = .success(())
    let (vm, _) = makeViewModel(service: mock)
    vm.newPassword = "newpassword1"
    vm.confirmPassword = "newpassword1"

    let ok = await vm.submit()

    XCTAssertFalse(ok)
    XCTAssertEqual(mock.updatePasswordCallCount, 0)
    if case .error = vm.status {} else { XCTFail("expected .error status") }
  }

  func test_submit_invalidCredentials_mapsToCurrentPasswordIncorrect() async {
    let mock = MockProfileService()
    mock.updatePasswordResult = .failure(.invalidCredentials)
    let (vm, _) = makeViewModel(service: mock)
    vm.currentPassword = "wrong"
    vm.newPassword = "newpassword1"
    vm.confirmPassword = "newpassword1"

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
  }

  func test_submit_validationFailed_setsErrorStatus() async {
    let mock = MockProfileService()
    mock.updatePasswordResult = .failure(.validationFailed)
    let (vm, _) = makeViewModel(service: mock)
    vm.currentPassword = "old-password"
    vm.newPassword = "newpassword1"
    vm.confirmPassword = "newpassword1"

    _ = await vm.submit()

    if case .error = vm.status {} else { XCTFail("expected .error status") }
  }

  func test_clearError_resetsToIdleAfterError() async {
    let mock = MockProfileService()
    mock.updatePasswordResult = .failure(.validationFailed)
    let (vm, _) = makeViewModel(service: mock)
    vm.currentPassword = "old-password"
    vm.newPassword = "newpassword1"
    vm.confirmPassword = "newpassword1"

    _ = await vm.submit()
    vm.clearError()

    XCTAssertEqual(vm.status, .idle)
  }
}
