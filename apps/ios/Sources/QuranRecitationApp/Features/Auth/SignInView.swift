import SwiftUI

/// Sign in, pushed onto the Profile tab's `NavigationStack`: feeds the shared
/// `AuthViewModel` into `SignInForm`. Users leave by signing in, crossing to
/// create account, or going back.
///
/// The `AuthViewModel` is owned by `ProfileView` and shared with
/// `SignUpView`, so anything typed survives the sign-in ↔ sign-up toggle.
struct SignInView: View {
  @Bindable var viewModel: AuthViewModel
  let onNavigateToSignUp: () -> Void
  let onAuthenticated: () -> Void

  /// Configured only when both Google client IDs are present; otherwise
  /// the Google button stays disabled.
  private var googleClient: GoogleSignInClient? {
    let ios = AppConfig.googleIOSClientID
    let server = AppConfig.googleServerClientID
    guard !ios.isEmpty, !server.isEmpty else { return nil }
    return GoogleSignInClient(iosClientID: ios, serverClientID: server)
  }

  private func signInWithGoogle() {
    guard let client = googleClient else { return }
    Task {
      await viewModel.signInWithGoogle(
        getIdToken: { nonce in try await client.idToken(nonce: nonce) },
        onSuccess: onAuthenticated
      )
    }
  }

  var body: some View {
    SignInForm(
      email: $viewModel.email,
      password: $viewModel.password,
      isPasswordVisible: $viewModel.isPasswordVisible,
      canSubmit: viewModel.canSubmit,
      isSubmitting: viewModel.isSubmitting,
      error: viewModel.error,
      googleAvailable: googleClient != nil,
      onSubmit: { Task { await viewModel.signIn(onSuccess: onAuthenticated) } },
      onGoogle: signInWithGoogle,
      onCreateAccount: onNavigateToSignUp
    )
  }
}

/// The sign-in form drawn from values, so any state renders without a
/// ViewModel: email and password, the error, Sign in, then Apple and Google,
/// and the way across to create an account.
struct SignInForm: View {
  @Binding var email: String
  @Binding var password: String
  @Binding var isPasswordVisible: Bool
  let canSubmit: Bool
  let isSubmitting: Bool
  let error: AppError?
  let googleAvailable: Bool
  let onSubmit: () -> Void
  let onGoogle: () -> Void
  let onCreateAccount: () -> Void

  var body: some View {
    AuthForm(title: "auth.signin.title") {
      Section {
        AuthEmailField(text: $email)
          .authRow()
        AuthPasswordField(text: $password, isVisible: $isPasswordVisible)
          .authRow()
      } header: {
        AuthLede(text: "auth.signin.lede")
      }
      .disabled(isSubmitting)

      if let error {
        AuthErrorSection(error: error)
      }

      AuthSubmitSection(
        label: "auth.signin.submit",
        pendingLabel: "auth.signin.submitPending",
        canSubmit: canSubmit,
        isSubmitting: isSubmitting,
        showsForgotPassword: true,
        onSubmit: onSubmit
      )
      AuthProvidersSection(googleEnabled: googleAvailable && !isSubmitting, onGoogle: onGoogle)
      AuthFooterSection(
        prompt: "auth.signin.footerPrompt",
        action: "auth.signin.footerAction",
        onAction: onCreateAccount
      )
      .disabled(isSubmitting)
    }
  }
}
