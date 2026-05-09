import SwiftUI

/// Tab-based shell that subsequent PRs hang feature views off of. Each
/// tab owns its own `NavigationStack` so drilling in one tab does not
/// reset the others. The Practice tab still hosts the legacy
/// `RecorderView` until PR 17 retires it; Library and History show a
/// placeholder until PR 9 / PR 22 land. See ADR 0005.
struct AppRoot: View {
  private let telemetry: Telemetry
  @StateObject private var legacyRecordingViewModel: RecordingViewModel
  @State private var selectedTab: AppTab = .library

  init(backend: QuranBackend, telemetry: Telemetry) {
    self.telemetry = telemetry
    self._legacyRecordingViewModel = StateObject(
      wrappedValue: RecordingViewModel(backend: backend, telemetry: telemetry)
    )
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
      ComingSoonView(title: "Library", systemImage: "books.vertical")
        .navigationTitle("Library")
    }
    .tabItem { Label("Library", systemImage: "books.vertical") }
    .tag(AppTab.library)
  }

  private var practiceTab: some View {
    NavigationStack {
      RecorderView(viewModel: legacyRecordingViewModel)
        .navigationTitle("Practice")
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
