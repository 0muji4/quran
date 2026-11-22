import SwiftUI

/// Create account, pushed onto the Profile tab's `NavigationStack`: feeds the
/// shared `AuthViewModel` into `SignUpForm`.
///
/// Shares its `AuthViewModel` with `SignInView` (owned by `ProfileView`) so
/// typed input survives the sign-in ↔ sign-up toggle.
struct SignUpView: View {
  @Bindable var viewModel: AuthViewModel
  let onNavigateToSignIn: () -> Void
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
    SignUpForm(
      displayName: $viewModel.displayName,
      email: $viewModel.email,
      password: $viewModel.password,
      isPasswordVisible: $viewModel.isPasswordVisible,
      level: $viewModel.selectedLevel,
      agreedToTerms: $viewModel.agreedToTerms,
      termsError: viewModel.termsError,
      canSubmit: viewModel.canSubmitSignUp,
      isSubmitting: viewModel.isSubmitting,
      error: viewModel.error,
      googleAvailable: googleClient != nil,
      onSubmit: { Task { await viewModel.signUp(onSuccess: onAuthenticated) } },
      onGoogle: signInWithGoogle,
      onSignIn: onNavigateToSignIn
    )
  }
}

/// The create-account form drawn from values, so any state renders without a
/// ViewModel: the display name, email and password, the level, the terms,
/// the error, Create account, then Apple and Google, and the way across to
/// sign in.
struct SignUpForm: View {
  @Binding var displayName: String
  @Binding var email: String
  @Binding var password: String
  @Binding var isPasswordVisible: Bool
  @Binding var level: PracticeLevel
  @Binding var agreedToTerms: Bool
  let termsError: Bool
  let canSubmit: Bool
  let isSubmitting: Bool
  let error: AppError?
  let googleAvailable: Bool
  let onSubmit: () -> Void
  let onGoogle: () -> Void
  let onSignIn: () -> Void

  var body: some View {
    AuthForm(title: "auth.signup.title") {
      Group {
        Section {
          TextField(text: $displayName, prompt: Text("auth.field.name", bundle: .module)) {
            Text("auth.field.name", bundle: .module)
          }
          .textContentType(.name)
          .textInputAutocapitalization(.words)
          .authRow()
        } header: {
          AuthLede(text: "auth.signup.lede")
        } footer: {
          Text("auth.field.name.helper", bundle: .module)
        }

        Section {
          AuthEmailField(text: $email)
            .authRow()
          AuthPasswordField(text: $password, isVisible: $isPasswordVisible, textContentType: .newPassword)
            .authRow()
        } footer: {
          Text("auth.password.helper", bundle: .module)
        }

        Section {
          Picker(selection: $level) {
            ForEach(PracticeLevel.allCases, id: \.self) { option in
              VStack(alignment: .leading, spacing: 2) {
                Text(option.label, bundle: .module)
                Text(option.description, bundle: .module)
                  .font(AppTheme.Typography.subheadline)
                  .foregroundStyle(AppTheme.Colors.onSurfaceVariant)
              }
              .tag(option)
            }
          } label: {
            Text("auth.level.title", bundle: .module)
          }
          .pickerStyle(.inline)
          .labelsHidden()
          .authRow()
        } header: {
          Text("auth.level.title", bundle: .module)
        } footer: {
          Text("auth.level.helper", bundle: .module)
        }

        Section {
          Toggle(isOn: $agreedToTerms) {
            Text("auth.terms.label", bundle: .module)
              .font(AppTheme.Typography.subheadline)
          }
          .authRow()
        } footer: {
          if termsError {
            Text("auth.terms.error", bundle: .module)
              .foregroundStyle(AppTheme.Colors.error)
          }
        }
      }
      .disabled(isSubmitting)

      if let error {
        AuthErrorSection(error: error)
      }

      AuthSubmitSection(
        label: "auth.signup.submit",
        pendingLabel: "auth.signup.submitPending",
        canSubmit: canSubmit,
        isSubmitting: isSubmitting,
        onSubmit: onSubmit
      )
      AuthProvidersSection(googleEnabled: googleAvailable && !isSubmitting, onGoogle: onGoogle)
      AuthFooterSection(
        prompt: "auth.signup.footerPrompt",
        action: "auth.signup.footerAction",
        onAction: onSignIn
      )
      .disabled(isSubmitting)
    }
  }
}
