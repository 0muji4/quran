import Foundation
import SwiftUI

/// State container shared by `SignInView` and `SignUpView`. A single
/// view model backs both screens — exactly like the web `AuthForm` and
/// the Android `AuthViewModel` — so anything the user has typed
/// survives the sign-in ↔ sign-up toggle.
///
/// `signIn` / `signUp` wrap the `AuthService` call, persist the result
/// through `SessionStore`, and then invoke the caller's `onSuccess`
/// (which dismisses the auth screen). Every failure path lands in
/// `error` as an `AppError` — the one error vocabulary the views read.
@MainActor
final class AuthViewModel: ObservableObject {
  // Form fields. Editing any text field clears a stale error banner,
  // matching the Android `AuthViewModel` setters.
  @Published var email: String = "" { didSet { clearError() } }
  @Published var password: String = "" { didSet { clearError() } }
  @Published var displayName: String = "" { didSet { clearError() } }
  @Published var isPasswordVisible: Bool = false
  /// UI-only — collected but never sent to the BFF (see `PracticeLevel`).
  @Published var selectedLevel: PracticeLevel = .beginner
  /// Terms-of-Service gate on sign-up. Checking the box clears the error.
  @Published var agreedToTerms: Bool = false {
    didSet { if agreedToTerms { termsError = false } }
  }

  /// Set when sign-up is attempted without accepting the Terms.
  @Published private(set) var termsError: Bool = false
  /// True while a sign-in / sign-up request is in flight.
  @Published private(set) var isSubmitting: Bool = false
  /// The most recent failure, shown in the form's error banner.
  @Published private(set) var error: AppError? = nil

  private let authService: AuthService
  private let session: SessionStore
  private let telemetry: Telemetry

  init(authService: AuthService, session: SessionStore, telemetry: Telemetry) {
    self.authService = authService
    self.session = session
    self.telemetry = telemetry
  }

  /// Whether the form has the minimum input to submit. The BFF zod
  /// schema stays the authority on email format and password length;
  /// this only keeps the submit button from firing an obviously-empty
  /// request (parity with the Android screens).
  var canSubmit: Bool {
    !email.trimmedForAuth.isEmpty && !password.isEmpty
  }

  /// Stricter gate for the sign-up screen: also requires 8+ characters,
  /// matching the BFF zod schema (`password.min(8)` on `/auth/sign-up`).
  /// Sign-in deliberately stays on `canSubmit` so accounts created before
  /// this rule existed can still authenticate.
  var canSubmitSignUp: Bool {
    canSubmit && password.count >= AuthViewModel.minSignUpPasswordLength
  }

  static let minSignUpPasswordLength = 8

  func signIn(onSuccess: @escaping () -> Void) async {
    guard !isSubmitting else { return }
    isSubmitting = true
    error = nil
    do {
      let success = try await telemetry.measure("auth.signin") {
        try await authService.signIn(email: email.trimmedForAuth, password: password)
      }
      session.completeAuthentication(success)
      isSubmitting = false
      onSuccess()
    } catch {
      handleFailure(error, screen: "sign_in")
    }
  }

  func signUp(onSuccess: @escaping () -> Void) async {
    guard !isSubmitting else { return }
    // Terms gate: block the request and surface the inline error rather
    // than silently doing nothing.
    guard agreedToTerms else {
      termsError = true
      return
    }
    isSubmitting = true
    error = nil
    termsError = false
    let trimmedName = displayName.trimmedForAuth
    let name = trimmedName.isEmpty ? nil : trimmedName
    do {
      let success = try await telemetry.measure("auth.signup") {
        // `selectedLevel` is deliberately not passed — UI-only this pass.
        try await authService.signUp(
          email: email.trimmedForAuth,
          password: password,
          displayName: name
        )
      }
      session.completeAuthentication(success)
      isSubmitting = false
      onSuccess()
    } catch {
      handleFailure(error, screen: "sign_up")
    }
  }

  // MARK: - Helpers

  private func handleFailure(_ error: Error, screen: String) {
    let appError = (error as? AppError) ?? AppError.network(underlying: error)
    telemetry.error(appError, context: ["screen": screen])
    isSubmitting = false
    self.error = appError
  }

  private func clearError() {
    if error != nil { error = nil }
  }
}

private extension String {
  /// Whitespace-trimmed copy, used when normalising form fields before
  /// submission (matches the Android `AuthViewModel`'s `.trim()`).
  var trimmedForAuth: String {
    trimmingCharacters(in: .whitespacesAndNewlines)
  }
}
