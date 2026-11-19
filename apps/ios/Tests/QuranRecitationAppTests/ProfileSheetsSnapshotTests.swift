import SwiftUI
import XCTest
@testable import QuranRecitationApp

/// Renders the four Profile sheets' forms in each state, in every
/// `RenderVariant` (ADR 0027). The forms are drawn full height, without the
/// sheet presentation around them.
@MainActor
final class ProfileSheetsSnapshotTests: XCTestCase {
  func test_edit() {
    snapshot(
      EditProfileForm(
        displayName: .constant("Amina R"), level: .constant("intermediate"),
        canSubmit: true, isSubmitting: false, error: nil, onCancel: {}, onSubmit: {}))
  }

  func test_emailSaving() {
    snapshot(
      ChangeEmailForm(
        newEmail: .constant("amina.r@example.com"), currentPassword: .constant("secret-pass"),
        canSubmit: false, isSubmitting: true, error: nil, onCancel: {}, onSubmit: {}))
  }

  func test_passwordEmpty() {
    snapshot(
      UpdatePasswordForm(
        currentPassword: .constant(""), newPassword: .constant(""), confirmPassword: .constant(""),
        canSubmit: false, isSubmitting: false, error: nil, onCancel: {}, onSubmit: {}))
  }

  func test_passwordError() {
    snapshot(
      UpdatePasswordForm(
        currentPassword: .constant("wrong-pass"), newPassword: .constant("new-secret-1"),
        confirmPassword: .constant("new-secret-1"),
        canSubmit: true, isSubmitting: false, error: "Current password is incorrect.",
        onCancel: {}, onSubmit: {}))
  }

  func test_delete() {
    snapshot(
      DeleteAccountForm(
        confirmText: .constant("DELETE"),
        canSubmit: true, isSubmitting: false, error: nil, onCancel: {}, onSubmit: {}))
  }

  private func snapshot<V: View>(_ form: V, testName: String = #function, line: UInt = #line) {
    // The height of the pinned simulator's screen (iPhone 17 Pro).
    let screen = form
      .frame(height: 874)
      .frame(maxHeight: .infinity, alignment: .top)
    for variant in RenderVariant.all {
      assertSnapshot(of: screen, in: variant, testName: testName, line: line)
    }
  }
}
