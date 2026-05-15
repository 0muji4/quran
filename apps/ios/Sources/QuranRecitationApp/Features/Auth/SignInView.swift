import SwiftUI

/// Sign in screen — pushed onto the Profile tab's `NavigationStack`.
/// Brand mark, email + password fields, the primary "Sign in" action,
/// the deferred social buttons, and a link across to sign-up. Matches
/// `docs/design/iOS _ Sign in` (plus a back chevron, since the screen
/// is now reached from the Profile tab rather than a launch gate).
///
/// The `AuthViewModel` is owned by `ProfileView` and shared with
/// `SignUpView`, so anything typed survives the sign-in ↔ sign-up
/// toggle.
struct SignInView: View {
  @ObservedObject var viewModel: AuthViewModel
  let onBack: () -> Void
  let onNavigateToSignUp: () -> Void
  let onAuthenticated: () -> Void

  var body: some View {
    ScrollView {
      VStack(spacing: Spacing.xl) {
        HStack {
          AuthBackButton(action: onBack)
          Spacer()
        }

        VStack(spacing: Spacing.md) {
          MihrabMark()
          VStack(spacing: Spacing.xs) {
            Text("auth.signin.title", bundle: .module)
              .font(Font.brand.pageTitle)
              .foregroundColor(Color.brand.textPrimary)
            Text("auth.signin.subtitle", bundle: .module)
              .font(Font.brand.body)
              .foregroundColor(Color.brand.textSecondary)
          }
          .multilineTextAlignment(.center)
        }

        if let error = viewModel.error {
          AuthErrorBanner(error: error)
        }

        formSection
        submitButton

        AuthDivider(label: "auth.divider.or")

        VStack(spacing: Spacing.md) {
          SocialButton(provider: .google)
          SocialButton(provider: .apple)
        }

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

  private var formSection: some View {
    VStack(alignment: .leading, spacing: Spacing.lg) {
      AuthTextField(
        label: "auth.field.email",
        text: $viewModel.email,
        keyboardType: .emailAddress,
        textContentType: .username
      )
      VStack(alignment: .trailing, spacing: Spacing.sm) {
        AuthPasswordField(
          label: "auth.field.password",
          text: $viewModel.password,
          isVisible: $viewModel.isPasswordVisible
        )
        // "Forgot password?" is deferred per ADR 0010 — disabled, like
        // the social buttons and the web client's link.
        Button {} label: {
          Text("auth.forgotPassword", bundle: .module)
            .font(Font.brand.caption.weight(.semibold))
            .foregroundColor(Color.brand.primary)
        }
        .buttonStyle(.plain)
        .disabled(true)
        .opacity(0.55)
        .accessibilityHint(Text("Coming soon"))
      }
    }
  }

  private var submitButton: some View {
    Button {
      Task { await viewModel.signIn(onSuccess: onAuthenticated) }
    } label: {
      HStack(spacing: Spacing.sm) {
        if viewModel.isSubmitting {
          ProgressView()
            .tint(Color.brand.textOnPrimary)
        }
        Text(
          viewModel.isSubmitting ? "auth.signin.submitPending" : "auth.signin.submit",
          bundle: .module
        )
        if !viewModel.isSubmitting {
          Image(systemName: "arrow.right")
        }
      }
    }
    .buttonStyle(.brandPrimary)
    .disabled(!viewModel.canSubmit || viewModel.isSubmitting)
  }

  private var footer: some View {
    HStack(spacing: Spacing.xs) {
      Text("auth.signin.footerPrompt", bundle: .module)
        .foregroundColor(Color.brand.textSecondary)
      Button {
        onNavigateToSignUp()
      } label: {
        Text("auth.signin.footerAction", bundle: .module)
          .fontWeight(.semibold)
          .foregroundColor(Color.brand.primary)
      }
      .buttonStyle(.plain)
    }
    .font(Font.brand.body)
  }
}
