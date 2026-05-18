import SwiftUI

/// Tab-based shell with four tabs: Library, Practice, History, Profile.
/// Each tab owns its own `NavigationStack` so drilling in one does not
/// reset the others. The app is usable anonymously — sign-in lives
/// inside the Profile tab, there is no launch gate (see ADR 0005, ADR
/// 0010, and the Android `AppRoot` it mirrors).
struct AppRoot: View {
  /// Mirrors the web client's `REFRESH_INTERVAL_MS`
  /// (`apps/web/app/lib/storage.ts`) so the two surfaces converge at the
  /// same rate when the user flips between them.
  private static let foregroundRefreshThrottle: TimeInterval = 30

  private let backend: QuranBackend
  private let authService: AuthService
  private let referenceClient: ReferenceAudioClient
  private let meClient: MeClient?
  private let profileService: ProfileService?
  private let telemetry: Telemetry
  private let historyStore: HistoryStore
  @ObservedObject private var session: SessionStore
  @Environment(\.scenePhase) private var scenePhase
  @State private var selectedTab: AppTab = .library
  @State private var practiceContext: PracticeContext
  @State private var lastHistoryRefreshAt: Date?

  init(
    session: SessionStore,
    backend: QuranBackend,
    authService: AuthService,
    telemetry: Telemetry,
    historyStore: HistoryStore = UserDefaultsHistoryStore(),
    referenceClient: ReferenceAudioClient? = nil,
    meClient: MeClient? = nil,
    profileService: ProfileService? = nil
  ) {
    self._session = ObservedObject(wrappedValue: session)
    self.backend = backend
    self.authService = authService
    self.telemetry = telemetry
    self.historyStore = historyStore
    self.referenceClient = referenceClient ?? HTTPReferenceAudioClient()
    self.meClient = meClient
    self.profileService = profileService
    // Default Practice opens at Al-Fatihah ayah 1. The Library Continue
    // card overrides via `practiceContext` when the user resumes.
    self._practiceContext = State(initialValue: PracticeContext(surahId: "1", ayahNumber: 1))
  }

  var body: some View {
    TabView(selection: $selectedTab) {
      libraryTab
      practiceTab
      historyTab
      profileTab
    }
    .tint(Color.brand.primary)
    .onChange(of: selectedTab) { newValue in
      if newValue == .library {
        telemetry.event(TelemetryEvent.libraryTabSelected)
      }
    }
    .task(id: session.currentUser?.id) {
      // Two responsibilities driven by one event:
      //   1. On sign-out (id → nil), wipe the local cache so the
      //      previous identity's history does not leak into the next
      //      sign-in (different account or same).
      //   2. On sign-in / first-launch-while-signed-in (id → value),
      //      pull the authoritative state from BFF into the cache so
      //      reads can stay synchronous and tab-switches feel
      //      instant once data has landed.
      if session.isSignedIn {
        await historyStore.refreshFromRemote()
        lastHistoryRefreshAt = Date()
      } else {
        historyStore.clear()
        lastHistoryRefreshAt = nil
      }
    }
    .onChange(of: scenePhase) { newPhase in
      // Foreground-return refresh: when the user returns to the app
      // after recording on another device (e.g. web), pull the
      // authoritative state so the History tab and Continue card are
      // not stuck on yesterday's cache. `task(id:)` already covers
      // cold launch / sign-in transitions, so we only fire here once
      // we have an anchor timestamp from that path.
      guard newPhase == .active, session.isSignedIn else { return }
      guard
        let last = lastHistoryRefreshAt,
        Date().timeIntervalSince(last) >= Self.foregroundRefreshThrottle
      else { return }
      Task { @MainActor in
        await historyStore.refreshFromRemote()
        lastHistoryRefreshAt = Date()
      }
    }
  }

  private var libraryTab: some View {
    NavigationStack {
      LibraryView(
        viewModel: LibraryViewModel(
          backend: backend,
          telemetry: telemetry,
          meClient: meClient
        ),
        session: session,
        historyStore: historyStore,
        onResume: { entry in
          practiceContext = PracticeContext(
            surahId: entry.surahId,
            ayahNumber: entry.ayahNumber
          )
          selectedTab = .practice
        },
        onSuggestedBegin: { surah in
          practiceContext = PracticeContext(surahId: surah.id, ayahNumber: 1)
          selectedTab = .practice
        }
      )
    }
    .tabItem { Label("Library", systemImage: "books.vertical") }
    .tag(AppTab.library)
  }

  private var practiceTab: some View {
    PracticeNavigationStack(
      practiceContext: $practiceContext,
      backend: backend,
      referenceClient: referenceClient,
      historyStore: historyStore,
      telemetry: telemetry,
      onCloseToLibrary: { selectedTab = .library }
    )
    .tabItem { Label("Practice", systemImage: "mic") }
    .tag(AppTab.practice)
  }

  private var historyTab: some View {
    NavigationStack {
      HistoryView(
        viewModel: HistoryViewModel(historyStore: historyStore, telemetry: telemetry),
        session: session
      )
    }
    .tabItem { Label("History", systemImage: "clock") }
    .tag(AppTab.history)
  }

  private var profileTab: some View {
    ProfileView(
      session: session,
      authService: authService,
      telemetry: telemetry,
      profileService: profileService
    )
    .tabItem { Label("Profile", systemImage: "person.crop.circle") }
    .tag(AppTab.profile)
  }
}

/// Lightweight value the Library Continue card writes into to redirect
/// Practice. PR 21's "Continue to ayah N+1" action mutates the same
/// state from the Result screen.
private struct PracticeContext: Equatable {
  var surahId: String
  var ayahNumber: Int
}

/// Hosts the Practice `NavigationStack` and the typed `PracticeRoute`
/// destinations (`.result(...)` here, future ones layer on). Extracted
/// so the routing graph is readable in one place.
private struct PracticeNavigationStack: View {
  @Binding var practiceContext: PracticeContext
  let backend: QuranBackend
  let referenceClient: ReferenceAudioClient
  let historyStore: HistoryStore
  let telemetry: Telemetry
  let onCloseToLibrary: () -> Void
  @State private var path: [PracticeRoute] = []

  var body: some View {
    NavigationStack(path: $path) {
      PracticeView(
        viewModel: PracticeViewModel(
          surahId: practiceContext.surahId,
          ayahNumber: practiceContext.ayahNumber,
          backend: backend,
          referenceClient: referenceClient,
          recorder: AudioRecorder(),
          player: AudioPlayer(),
          historyStore: historyStore,
          telemetry: telemetry
        ),
        onClose: onCloseToLibrary
      )
      .id("\(practiceContext.surahId):\(practiceContext.ayahNumber)")
      .navigationDestination(for: PracticeRoute.self) { route in
        switch route {
        case let .result(jobId, surahId, ayahNumber, _):
          ResultDetailView(
            viewModel: ResultDetailViewModel(
              jobId: jobId,
              surahId: surahId,
              ayahNumber: ayahNumber,
              backend: backend,
              telemetry: telemetry
            ),
            onClose: { path.removeLast() }
          )
        }
      }
    }
  }
}

private struct ComingSoonView: View {
  let title: String
  let systemImage: String

  var body: some View {
    VStack(spacing: Spacing.lg) {
      Image(systemName: systemImage)
        .font(.system(size: 40))
        .foregroundColor(Color.brand.textSecondary)
      Text("\(title) coming soon")
        .font(Font.brand.body)
        .foregroundColor(Color.brand.textSecondary)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .background(Color.brand.surface)
  }
}
