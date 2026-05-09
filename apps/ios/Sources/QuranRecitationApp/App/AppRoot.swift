import SwiftUI

/// Tab-based shell with three tabs: Library, Practice, History. Each
/// tab owns its own `NavigationStack` so drilling in one does not
/// reset the others. History stays a placeholder until PR 22 lands.
/// See ADR 0005.
struct AppRoot: View {
  private let backend: QuranBackend
  private let referenceClient: ReferenceAudioClient
  private let telemetry: Telemetry
  private let historyStore: HistoryStore
  @State private var selectedTab: AppTab = .library
  @State private var practiceContext: PracticeContext

  init(
    backend: QuranBackend,
    telemetry: Telemetry,
    historyStore: HistoryStore = UserDefaultsHistoryStore(),
    referenceClient: ReferenceAudioClient? = nil
  ) {
    self.backend = backend
    self.telemetry = telemetry
    self.historyStore = historyStore
    self.referenceClient = referenceClient ?? HTTPReferenceAudioClient()
    // Default Practice opens at Al-Fatihah ayah 1. The Library Continue
    // card overrides via `practiceContext` when the user resumes.
    self._practiceContext = State(initialValue: PracticeContext(surahId: "1", ayahNumber: 1))
  }

  var body: some View {
    TabView(selection: $selectedTab) {
      libraryTab
      practiceTab
      historyTab
    }
    .tint(Color.brand.primary)
    .onChange(of: selectedTab) { newValue in
      if newValue == .library {
        telemetry.event(TelemetryEvent.libraryTabSelected)
      }
    }
  }

  private var libraryTab: some View {
    NavigationStack {
      LibraryView(
        viewModel: LibraryViewModel(backend: backend, telemetry: telemetry),
        historyStore: historyStore,
        onResume: { entry in
          practiceContext = PracticeContext(
            surahId: entry.surahId,
            ayahNumber: entry.ayahNumber
          )
          selectedTab = .practice
        }
      )
    }
    .tabItem { Label("Library", systemImage: "books.vertical") }
    .tag(AppTab.library)
  }

  private var practiceTab: some View {
    NavigationStack {
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
        onClose: { selectedTab = .library }
      )
      .id("\(practiceContext.surahId):\(practiceContext.ayahNumber)")
    }
    .tabItem { Label("Practice", systemImage: "mic") }
    .tag(AppTab.practice)
  }

  private var historyTab: some View {
    NavigationStack {
      ComingSoonView(title: "History", systemImage: "clock")
        .navigationTitle("History")
    }
    .tabItem { Label("History", systemImage: "clock") }
    .tag(AppTab.history)
  }
}

/// Lightweight value the Library Continue card writes into to redirect
/// Practice. PR 21's "Continue to ayah N+1" action will mutate the same
/// state from the Result screen.
private struct PracticeContext: Equatable {
  var surahId: String
  var ayahNumber: Int
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
