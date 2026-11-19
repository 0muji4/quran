import SwiftUI

/// Profile tab: feeds the session, the practice preferences and the sheets
/// into `ProfileContent`.
///
/// The auth screens are pushed onto this tab's own `NavigationStack`
/// (`AuthRoute.signIn` / `.signUp`), so the rest of the app keeps
/// working anonymously — there is no launch gate. Mirrors the Android
/// `ProfileAuthHost` + `ProfileScreen` pair.
struct ProfileView: View {
  private let session: SessionStore
  @State private var authViewModel: AuthViewModel
  @State private var path: [AuthRoute] = []
  private let profileService: ProfileService?
  private let meClient: MeClient?
  private let historyStore: HistoryStore?

  /// `profileService: nil` keeps the Profile tab in read-only mode
  /// (every CTA in the cards stays disabled). Previews and the
  /// signed-out flow can pass `nil`; production passes the live
  /// service so the Edit / Change / Update / Delete sheets work.
  /// `meClient: nil` likewise hides the Practice Preferences card,
  /// which needs the `/me/preferences` transport. `historyStore`
  /// feeds the header streak pill (local source, same as History).
  init(
    session: SessionStore,
    authService: AuthService,
    telemetry: Telemetry,
    profileService: ProfileService? = nil,
    meClient: MeClient? = nil,
    historyStore: HistoryStore? = nil
  ) {
    self.session = session
    self._authViewModel = State(
      initialValue: AuthViewModel(
        authService: authService,
        session: session,
        telemetry: telemetry
      )
    )
    self.profileService = profileService
    self.meClient = meClient
    self.historyStore = historyStore
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
      ProfileSignedInScreen(
        user: user,
        session: session,
        profileService: profileService,
        meClient: meClient,
        streakDays: Self.streakDays(historyStore),
        onSignOut: { session.signOut() }
      )
    } else {
      ProfileContent(
        user: nil,
        preferences: nil,
        preferencesError: nil,
        streakDays: 0,
        showReactivationBanner: false,
        actions: ProfileActions(onSignIn: { path = [.signIn] }, onSignUp: { path = [.signUp] })
      )
    }
  }

  /// Consecutive-day streak from the local store, or 0 when unavailable
  /// (read-only/preview paths). Reuses `HistoryStats` so the count
  /// always matches the History tab to the day.
  private static func streakDays(_ store: HistoryStore?) -> Int {
    guard let store else { return 0 }
    return HistoryStats.compute(from: store.recentAttempts(limit: 365)).streakDays
  }
}

/// Everything the Profile tab can ask its owner to do. A `nil` sheet action
/// disables its button, the read-only default.
struct ProfileActions {
  var onSignIn: () -> Void = {}
  var onSignUp: () -> Void = {}
  var onSignOut: () -> Void = {}
  var onEditProfile: (() -> Void)?
  var onChangeEmail: (() -> Void)?
  var onUpdatePassword: (() -> Void)?
  var onDeleteAccount: (() -> Void)?
  var onDismissReactivation: () -> Void = {}
  var onReciterChange: (String) -> Void = { _ in }
  var onPlaybackSpeedChange: (Double) -> Void = { _ in }
  var onReminderEnabledChange: (Bool) -> Void = { _ in }
  var onReminderTimeChange: (String) -> Void = { _ in }
}

/// Owns the signed-in tab's practice preferences and sheets, and feeds them
/// into `ProfileContent`.
private struct ProfileSignedInScreen: View {
  let user: AuthenticatedUser
  /// Observed so `pendingReactivationNotice` toggles re-render the message.
  let session: SessionStore
  let profileService: ProfileService?
  let streakDays: Int
  let onSignOut: () -> Void
  /// `nil` without a `MeClient`, which hides the preferences.
  @State private var preferencesViewModel: PreferencesViewModel?
  @State private var editViewModel: EditProfileViewModel?
  @State private var updatePasswordViewModel: UpdatePasswordViewModel?
  @State private var changeEmailViewModel: ChangeEmailViewModel?
  @State private var deleteAccountViewModel: DeleteAccountViewModel?

  init(
    user: AuthenticatedUser,
    session: SessionStore,
    profileService: ProfileService?,
    meClient: MeClient?,
    streakDays: Int,
    onSignOut: @escaping () -> Void
  ) {
    self.user = user
    self.session = session
    self.profileService = profileService
    self.streakDays = streakDays
    self.onSignOut = onSignOut
    self._preferencesViewModel = State(initialValue: meClient.map { PreferencesViewModel(meClient: $0) })
  }

  var body: some View {
    ProfileContent(
      user: user,
      preferences: preferencesViewModel?.preferences,
      preferencesError: preferencesViewModel?.errorMessage,
      streakDays: streakDays,
      showReactivationBanner: session.pendingReactivationNotice,
      actions: actions
    )
    .task { await preferencesViewModel?.loadIfNeeded() }
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

  private var actions: ProfileActions {
    var actions = ProfileActions(onSignOut: onSignOut, onDismissReactivation: session.acknowledgeReactivationNotice)
    let preferences = preferencesViewModel
    actions.onReciterChange = { id in Task { await preferences?.setReciter(id) } }
    actions.onPlaybackSpeedChange = { speed in Task { await preferences?.setPlaybackSpeed(speed) } }
    actions.onReminderEnabledChange = { isOn in Task { await preferences?.setReminderEnabled(isOn) } }
    actions.onReminderTimeChange = { time in Task { await preferences?.setReminderTime(time) } }
    guard let profileService else { return actions }
    actions.onEditProfile = {
      editViewModel = EditProfileViewModel(user: user, profileService: profileService, session: session)
    }
    actions.onUpdatePassword = {
      updatePasswordViewModel = UpdatePasswordViewModel(profileService: profileService)
    }
    actions.onChangeEmail = {
      changeEmailViewModel = ChangeEmailViewModel(
        currentEmail: user.email, profileService: profileService, session: session)
    }
    actions.onDeleteAccount = {
      deleteAccountViewModel = DeleteAccountViewModel(profileService: profileService, session: session)
    }
    return actions
  }
}

/// The Profile tab on `AppTheme` and system controls (ADR 0030). The agreed
/// mockup is the Profile page of the canvas linked from #596. A large title
/// heads an inset grouped list: the welcome-back message, the profile,
/// practice preferences, account, Sign out, and Delete account with what
/// deleting does. Signed out, a welcome offers Sign in and Create an account.
/// Takes state rather than ViewModels, so any state renders without them.
struct ProfileContent: View {
  /// The signed-in user, or `nil` when signed out.
  let user: AuthenticatedUser?
  /// `nil` hides practice preferences (no `MeClient`).
  let preferences: PracticePreferences?
  /// A failed preference save, shown under the preferences.
  let preferencesError: String?
  let streakDays: Int
  let showReactivationBanner: Bool
  var actions = ProfileActions()

  var body: some View {
    content
      .background(AppTheme.Colors.surface.ignoresSafeArea())
      .tint(AppTheme.Colors.primary)
      .navigationTitle(Text("profile.page.title", bundle: .module))
  }

  @ViewBuilder
  private var content: some View {
    if let user {
      signedIn(user)
    } else {
      signedOut
    }
  }

  private var signedOut: some View {
    ContentUnavailableView {
      Label {
        Text("profile.signedOut.title", bundle: .module)
      } icon: {
        Image(systemName: "person.crop.circle")
      }
    } description: {
      Text("profile.signedOut.subtitle", bundle: .module)
    } actions: {
      Button(action: actions.onSignIn) {
        Text("profile.action.signIn", bundle: .module)
          .frame(maxWidth: .infinity)
      }
      .buttonStyle(.appProminent)
      Button(action: actions.onSignUp) {
        Text("profile.action.createAccount", bundle: .module)
          .frame(maxWidth: .infinity)
      }
      .buttonStyle(.bordered)
    }
    .controlSize(.large)
    .buttonBorderShape(.capsule)
  }

  private func signedIn(_ user: AuthenticatedUser) -> some View {
    List {
      if showReactivationBanner {
        Section {
          ReactivationBanner(onDismiss: actions.onDismissReactivation)
            .listRowBackground(AppTheme.Colors.passContainer)
        }
      }
      Section {
        ProfileHeader(user: user, streakDays: streakDays, onEdit: actions.onEditProfile)
          .listRowBackground(AppTheme.Colors.surfaceContainer)
      }
      if let preferences {
        preferencesSection(preferences)
      }
      Section {
        accountRow(
          label: "profile.section.email.eyebrow",
          value: user.email,
          helper: Text("profile.section.email.helper", bundle: .module),
          action: "profile.section.email.cta",
          onAction: actions.onChangeEmail
        )
        accountRow(
          label: "profile.section.password.eyebrow",
          value: "••••••••••",
          helper: Self.passwordHelper(user.passwordChangedAt),
          action: "profile.section.password.cta",
          onAction: actions.onUpdatePassword
        )
      } header: {
        Text("profile.section.account", bundle: .module)
      }
      .listRowBackground(AppTheme.Colors.surfaceContainer)
      Section {
        Button(action: actions.onSignOut) {
          Text("profile.action.signOut", bundle: .module)
            .frame(maxWidth: .infinity)
        }
      }
      .listRowBackground(AppTheme.Colors.surfaceContainer)
      Section {
        Button(role: .destructive) {
          actions.onDeleteAccount?()
        } label: {
          Text("profile.dangerZone.cta", bundle: .module)
            .frame(maxWidth: .infinity)
        }
        .disabled(actions.onDeleteAccount == nil)
      } footer: {
        Text("profile.dangerZone.helper", bundle: .module)
      }
      .listRowBackground(AppTheme.Colors.surfaceContainer)
    }
    .listStyle(.insetGrouped)
    .listSectionSpacing(AppTheme.Spacing.space4)
    .scrollContentBackground(.hidden)
  }

  private func preferencesSection(_ preferences: PracticePreferences) -> some View {
    Section {
      Picker(
        selection: Binding(
          get: { preferences.referenceReciterId },
          set: { actions.onReciterChange($0) }
        )
      ) {
        ForEach(ReciterOption.all) { option in
          Text(verbatim: option.label).tag(option.id)
        }
      } label: {
        Text("profile.preferences.reciter.label", bundle: .module)
      }
      Picker(
        selection: Binding(
          get: { preferences.defaultPlaybackSpeed },
          set: { actions.onPlaybackSpeedChange($0) }
        )
      ) {
        ForEach(PlaybackSpeedOption.all, id: \.self) { speed in
          Text(verbatim: PlaybackSpeedOption.label(speed)).tag(speed)
        }
      } label: {
        Text("profile.preferences.speed.label", bundle: .module)
      }
      Toggle(
        isOn: Binding(
          get: { preferences.dailyReminderEnabled },
          set: { actions.onReminderEnabledChange($0) }
        )
      ) {
        VStack(alignment: .leading, spacing: 2) {
          Text("profile.preferences.reminder.label", bundle: .module)
          Text("profile.preferences.reminder.helper", bundle: .module)
            .font(AppTheme.Typography.footnote)
            .foregroundStyle(AppTheme.Colors.onSurfaceVariant)
        }
      }
      if preferences.dailyReminderEnabled {
        DatePicker(
          selection: reminderTime(preferences.dailyReminderTime),
          displayedComponents: .hourAndMinute
        ) {
          Text("profile.preferences.reminderTime.label", bundle: .module)
        }
      }
    } header: {
      Text("profile.section.preferences", bundle: .module)
    } footer: {
      if let preferencesError {
        Text(verbatim: preferencesError)
          .foregroundStyle(AppTheme.Colors.error)
      }
    }
    .listRowBackground(AppTheme.Colors.surfaceContainer)
  }

  /// Bridges the stored "HH:mm" and the picker's `Date`. Only the hour and
  /// minute matter, so the date is anchored to today.
  private func reminderTime(_ hhmm: String) -> Binding<Date> {
    Binding(
      get: {
        let (hour, minute) = ReminderClock.parse(hhmm)
        return Calendar.current.date(bySettingHour: hour, minute: minute, second: 0, of: Date()) ?? Date()
      },
      set: { date in
        let components = Calendar.current.dateComponents([.hour, .minute], from: date)
        actions.onReminderTimeChange(
          ReminderClock.format(hour: components.hour ?? 8, minute: components.minute ?? 0))
      }
    )
  }

  private func accountRow(
    label: LocalizedStringKey,
    value: String,
    helper: Text,
    action: LocalizedStringKey,
    onAction: (() -> Void)?
  ) -> some View {
    HStack(spacing: AppTheme.Spacing.space2) {
      VStack(alignment: .leading, spacing: 2) {
        Text(label, bundle: .module)
          .font(AppTheme.Typography.footnote)
          .foregroundStyle(AppTheme.Colors.onSurfaceVariant)
        Text(verbatim: value)
          .font(AppTheme.Typography.body)
          .foregroundStyle(AppTheme.Colors.onSurface)
          .lineLimit(1)
        helper
          .font(AppTheme.Typography.footnote)
          .foregroundStyle(AppTheme.Colors.onSurfaceVariant)
      }
      Spacer(minLength: AppTheme.Spacing.space2)
      Button {
        onAction?()
      } label: {
        Text(action, bundle: .module)
      }
      .buttonStyle(.borderless)
      .disabled(onAction == nil)
    }
  }

  /// "Last changed Nov 2, 2026", or the general advice before any change.
  static func passwordHelper(_ iso: String?) -> Text {
    guard let iso, let date = parseISO(iso) else {
      return Text("profile.section.password.helper", bundle: .module)
    }
    let formatter = DateFormatter()
    formatter.locale = Locale.current
    formatter.setLocalizedDateFormatFromTemplate("MMM d, y")
    let template = Bundle.module.localizedString(
      forKey: "profile.section.password.lastChanged", value: "Last changed %@", table: nil)
    return Text(verbatim: String(format: template, formatter.string(from: date)))
  }

  private static func parseISO(_ value: String) -> Date? {
    let fractional = ISO8601DateFormatter()
    fractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    if let date = fractional.date(from: value) { return date }
    let plain = ISO8601DateFormatter()
    plain.formatOptions = [.withInternetDateTime]
    return plain.date(from: value)
  }
}
