import SwiftUI

/// Sign up screen — pushed onto the Profile tab's `NavigationStack`.
/// Social buttons (deferred), name / email / password fields, the
/// "Your level" picker, the Terms-of-Service gate, the primary
/// "Create account" action, and a link across to sign-in. Matches
/// `docs/design/iOS _ Sign up`.
///
/// Shares its `AuthViewModel` with `SignInView` (owned by
/// `ProfileView`) so typed input survives the sign-in ↔ sign-up toggle.
struct SignUpView: View {
  @ObservedObject var viewModel: AuthViewModel
  let onBack: () -> Void
  let onNavigateToSignIn: () -> Void
  let onAuthenticated: () -> Void

  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: Spacing.lg) {
        topBar
        heading

        if let error = viewModel.error {
          AuthErrorBanner(error: error)
        }

        VStack(spacing: Spacing.md) {
          SocialButton(provider: .google)
          SocialButton(provider: .apple)
        }

        AuthDivider(label: "auth.divider.orWithEmail")

        AuthTextField(
          label: "auth.field.name",
          text: $viewModel.displayName,
          textContentType: .name,
          autocapitalization: .words
        )
        AuthTextField(
          label: "auth.field.email",
          text: $viewModel.email,
          keyboardType: .emailAddress,
          textContentType: .username
        )
        AuthPasswordField(
          label: "auth.field.password",
          text: $viewModel.password,
          isVisible: $viewModel.isPasswordVisible,
          textContentType: .newPassword,
          helperText: "auth.password.helper"
        )

        LevelSelector(selection: $viewModel.selectedLevel)
        termsRow
        submitButton
        footer
      }
      .padding(.horizontal, Spacing.screenHorizontal)
      .padding(.top, Spacing.lg)
      .padding(.bottom, Spacing.xxl)
    }
    .background(Color.brand.surface.ignoresSafeArea())
    .scrollDismissesKeyboard(.interactively)
    .toolbar(.hidden, for: .navigationBar)
  }

  private var topBar: some View {
    HStack {
      AuthBackButton(action: onBack)
      Spacer()
    }
  }

  private var heading: some View {
    VStack(alignment: .leading, spacing: Spacing.xs) {
      Text("auth.signup.eyebrow", bundle: .module)
        .font(Font.brand.eyebrow)
        .foregroundColor(Color.brand.accent)
        .textCase(.uppercase)
      Text("auth.signup.title", bundle: .module)
        .font(Font.brand.pageTitle)
        .foregroundColor(Color.brand.textPrimary)
      Text("auth.signup.lede", bundle: .module)
        .font(Font.brand.body)
        .foregroundColor(Color.brand.textSecondary)
    }
  }

  private var termsRow: some View {
    VStack(alignment: .leading, spacing: Spacing.xs) {
      Button {
        viewModel.agreedToTerms.toggle()
      } label: {
        HStack(alignment: .top, spacing: Spacing.sm) {
          Image(systemName: viewModel.agreedToTerms ? "checkmark.square.fill" : "square")
            .font(.system(size: 20))
            .foregroundColor(
              viewModel.agreedToTerms ? Color.brand.primary : Color.brand.textSecondary
            )
          Text("auth.terms.label", bundle: .module)
            .font(Font.brand.caption)
            .foregroundColor(
              viewModel.termsError ? Color.brand.recording : Color.brand.textPrimary
            )
            .multilineTextAlignment(.leading)
          Spacer(minLength: 0)
        }
      }
      .buttonStyle(.plain)
      .accessibilityAddTraits(viewModel.agreedToTerms ? .isSelected : [])

      if viewModel.termsError {
        Text("auth.terms.error", bundle: .module)
          .font(Font.brand.caption)
          .foregroundColor(Color.brand.recording)
      }
    }
  }

  private var submitButton: some View {
    Button {
      Task { await viewModel.signUp(onSuccess: onAuthenticated) }
    } label: {
      HStack(spacing: Spacing.sm) {
        if viewModel.isSubmitting {
          ProgressView()
            .tint(Color.brand.textOnPrimary)
        }
        Text(
          viewModel.isSubmitting ? "auth.signup.submitPending" : "auth.signup.submit",
          bundle: .module
        )
        if !viewModel.isSubmitting {
          Image(systemName: "arrow.right")
        }
      }
    }
    .buttonStyle(.brandPrimary)
    .disabled(!viewModel.canSubmit || viewModel.isSubmitting)
    .padding(.top, Spacing.sm)
  }

  private var footer: some View {
    HStack(spacing: Spacing.xs) {
      Text("auth.signup.footerPrompt", bundle: .module)
        .foregroundColor(Color.brand.textSecondary)
      Button {
        onNavigateToSignIn()
      } label: {
        Text("auth.signup.footerAction", bundle: .module)
          .fontWeight(.semibold)
          .foregroundColor(Color.brand.primary)
      }
      .buttonStyle(.plain)
    }
    .font(Font.brand.body)
    .frame(maxWidth: .infinity, alignment: .center)
  }
}
