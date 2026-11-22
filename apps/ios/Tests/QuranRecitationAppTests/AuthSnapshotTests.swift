import SwiftUI
import XCTest
@testable import QuranRecitationApp

/// Renders sign in and create account in each state, in every
/// `RenderVariant` (ADR 0027). Each form is pushed onto a navigation stack,
/// as the Profile tab pushes it, so the back button and large title show.
@MainActor
final class AuthSnapshotTests: XCTestCase {
  func test_signIn() {
    snapshot(signIn())
  }

  func test_signInError() {
    snapshot(signIn(error: .invalidCredentials))
  }

  func test_signInSubmitting() {
    snapshot(signIn(isSubmitting: true))
  }

  func test_signUp() {
    snapshot(signUp(), height: Self.fullPage)
  }

  func test_signUpTermsError() {
    snapshot(signUp(agreedToTerms: false, termsError: true), height: Self.fullPage)
  }

  /// The height of the pinned simulator's screen (iPhone 17 Pro).
  private static let phone: CGFloat = 874

  /// Tall enough for the whole create-account form, which scrolls on a phone.
  private static let fullPage: CGFloat = 1600

  private func signIn(isSubmitting: Bool = false, error: AppError? = nil) -> some View {
    SignInForm(
      email: .constant("amina@example.com"),
      password: .constant("secret-pass"),
      isPasswordVisible: .constant(false),
      canSubmit: true,
      isSubmitting: isSubmitting,
      error: error,
      googleAvailable: true,
      onSubmit: {},
      onGoogle: {},
      onCreateAccount: {}
    )
  }

  private func signUp(agreedToTerms: Bool = true, termsError: Bool = false) -> some View {
    SignUpForm(
      displayName: .constant("Amina"),
      email: .constant("amina@example.com"),
      password: .constant("secret-pass-1"),
      isPasswordVisible: .constant(false),
      level: .constant(.intermediate),
      agreedToTerms: .constant(agreedToTerms),
      termsError: termsError,
      canSubmit: true,
      isSubmitting: false,
      error: nil,
      googleAvailable: true,
      onSubmit: {},
      onGoogle: {},
      onSignIn: {}
    )
  }

  private func snapshot<V: View>(
    _ form: V,
    height: CGFloat = AuthSnapshotTests.phone,
    testName: String = #function,
    line: UInt = #line
  ) {
    let screen = Pushed(content: form)
      .frame(height: height)
      .frame(maxHeight: .infinity, alignment: .top)
    for variant in RenderVariant.all {
      assertSnapshot(of: screen, in: variant, testName: testName, line: line)
    }
  }
}

/// A navigation stack with `content` pushed onto it from the start.
private struct Pushed<Content: View>: View {
  let content: Content
  @State private var path = [0]

  var body: some View {
    NavigationStack(path: $path) {
      Color.clear
        .navigationDestination(for: Int.self) { _ in content }
    }
  }
}
