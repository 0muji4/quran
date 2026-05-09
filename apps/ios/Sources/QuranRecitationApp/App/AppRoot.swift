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
        viewModel: HistoryViewModel(historyStore: historyStore, telemetry: telemetry)
      )
    }
    .tabItem { Label("History", systemImage: "clock") }
    .tag(AppTab.history)
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
/// from `AppRoot` so the routing graph is readable in one place.
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
