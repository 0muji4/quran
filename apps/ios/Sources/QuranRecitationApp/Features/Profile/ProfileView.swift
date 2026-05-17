import SwiftUI

/// Profile tab. Renders one of two states keyed off `SessionStore`:
///
/// - signed out: a short welcome + "Sign in" / "Create an account"
/// - signed in: the user's name / email + "Sign out"
///
/// The auth screens are pushed onto this tab's own `NavigationStack`
/// (`AuthRoute.signIn` / `.signUp`), so the rest of the app keeps
/// working anonymously — there is no launch gate. Mirrors the Android
/// `ProfileAuthHost` + `ProfileScreen` pair.
struct ProfileView: View {
  @ObservedObject private var session: SessionStore
  @StateObject private var authViewModel: AuthViewModel
  @State private var path: [AuthRoute] = []
  private let profileService: ProfileService?

  /// `profileService: nil` keeps the Profile tab in read-only mode
  /// (every CTA in the cards stays disabled). Previews and the
  /// signed-out flow can pass `nil`; production passes the live
  /// service so the Edit / Change / Update / Delete sheets work.
  init(
    session: SessionStore,
    authService: AuthService,
    telemetry: Telemetry,
    profileService: ProfileService? = nil
  ) {
    self._session = ObservedObject(wrappedValue: session)
    self._authViewModel = StateObject(
      wrappedValue: AuthViewModel(
        authService: authService,
        session: session,
        telemetry: telemetry
      )
    )
    self.profileService = profileService
  }

  var body: some View {
    NavigationStack(path: $path) {
      content
        .navigationDestination(for: AuthRoute.self) { route in
          switch route {
          case .signIn:
            SignInView(
              viewModel: authViewModel,
              onNavigateToSignUp: { path = [.signUp] },
              onAuthenticated: { path = [] }
            )
          case .signUp:
            SignUpView(
              viewModel: authViewModel,
              onNavigateToSignIn: { path = [.signIn] },
              onAuthenticated: { path = [] }
            )
          }
        }
    }
  }

  @ViewBuilder
  private var content: some View {
    if let user = session.currentUser {
      ProfileSignedInContent(
        user: user,
        session: session,
        profileService: profileService,
        onSignOut: { session.signOut() }
      )
    } else {
      ProfileSignedOutContent(
        onSignIn: { path = [.signIn] },
        onSignUp: { path = [.signUp] }
      )
    }
  }
}

/// Signed-out shell: a welcome line and the two entry points into the
/// auth flow.
private struct ProfileSignedOutContent: View {
  let onSignIn: () -> Void
  let onSignUp: () -> Void

  var body: some View {
    VStack(spacing: Spacing.lg) {
      Spacer()
      VStack(spacing: Spacing.sm) {
        Text("profile.signedOut.title", bundle: .module)
          .font(Font.brand.pageTitle)
          .foregroundColor(Color.brand.textPrimary)
        Text("profile.signedOut.subtitle", bundle: .module)
          .font(Font.brand.body)
          .foregroundColor(Color.brand.textSecondary)
          .multilineTextAlignment(.center)
      }

      VStack(spacing: Spacing.md) {
        Button(action: onSignIn) {
          Text("profile.action.signIn", bundle: .module)
        }
        .buttonStyle(.brandPrimary)

        Button(action: onSignUp) {
          Text("profile.action.createAccount", bundle: .module)
        }
        .buttonStyle(.brandSecondary)
      }
      Spacer()
    }
    .frame(maxWidth: .infinity)
    .padding(.horizontal, Spacing.screenHorizontal)
    .background(Color.brand.surface.ignoresSafeArea())
  }
}

/// Signed-in shell: header card + Account & data card + danger zone +
/// Sign out. The action CTAs inside the cards are disabled placeholders
/// in PR-H2 — Edit (H3), Update password (H4), Change email (H5), and
/// Delete account (H6) wire them up over subsequent stacked PRs.
private struct ProfileSignedInContent: View {
  let user: AuthenticatedUser
  let session: SessionStore
  let profileService: ProfileService?
  let onSignOut: () -> Void
  @State private var editViewModel: EditProfileViewModel?
  @State private var updatePasswordViewModel: UpdatePasswordViewModel?
  @State private var changeEmailViewModel: ChangeEmailViewModel?
  @State private var deleteAccountViewModel: DeleteAccountViewModel?

  var body: some View {
    ScrollView {
      VStack(spacing: Spacing.lg) {
        ProfileHeader(user: user, onEdit: editAction)
        AccountDataCard(
          email: user.email,
          onChangeEmail: changeEmailAction,
          onUpdatePassword: updatePasswordAction
        )
        DangerZoneCard(onDelete: deleteAccountAction)
        SignOutSection(onSignOut: onSignOut)
          .padding(.top, Spacing.sm)
      }
      .padding(.horizontal, Spacing.screenHorizontal)
      .padding(.vertical, Spacing.lg)
    }
    .background(Color.brand.surface.ignoresSafeArea())
    .sheet(item: $editViewModel) { viewModel in
      EditProfileSheet(viewModel: viewModel, onDismiss: { editViewModel = nil })
    }
    .sheet(item: $updatePasswordViewModel) { viewModel in
      UpdatePasswordSheet(viewModel: viewModel, onDismiss: { updatePasswordViewModel = nil })
    }
    .sheet(item: $changeEmailViewModel) { viewModel in
      ChangeEmailSheet(viewModel: viewModel, onDismiss: { changeEmailViewModel = nil })
    }
    .sheet(item: $deleteAccountViewModel) { viewModel in
      DeleteAccountSheet(viewModel: viewModel, onDismiss: { deleteAccountViewModel = nil })
    }
  }

  private var editAction: (() -> Void)? {
    guard let profileService else { return nil }
    return {
      editViewModel = EditProfileViewModel(
        user: user,
        profileService: profileService,
        session: session
      )
    }
  }

  private var updatePasswordAction: (() -> Void)? {
    guard let profileService else { return nil }
    return {
      updatePasswordViewModel = UpdatePasswordViewModel(profileService: profileService)
    }
  }

  private var changeEmailAction: (() -> Void)? {
    guard let profileService else { return nil }
    return {
      changeEmailViewModel = ChangeEmailViewModel(
        currentEmail: user.email,
        profileService: profileService,
        session: session
      )
    }
  }

  private var deleteAccountAction: (() -> Void)? {
    guard let profileService else { return nil }
    return {
      deleteAccountViewModel = DeleteAccountViewModel(
        profileService: profileService,
        session: session
      )
    }
  }
}
