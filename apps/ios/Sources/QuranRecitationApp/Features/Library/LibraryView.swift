import SwiftUI

/// Library tab — vertical list of surahs. Search bar, difficulty chips,
/// and the Continue card are deliberately out of scope for this PR
/// (PR 10 / PR 11). The page-level header layout matches
/// `docs/design/iOS _ Surah library.png`.
struct LibraryView: View {
  @StateObject var viewModel: LibraryViewModel
  let historyStore: HistoryStore

  init(viewModel: @autoclosure @escaping () -> LibraryViewModel, historyStore: HistoryStore) {
    self._viewModel = StateObject(wrappedValue: viewModel())
    self.historyStore = historyStore
  }

  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: Spacing.lg) {
        header
        content
      }
      .padding(.horizontal, Spacing.screenHorizontal)
      .padding(.vertical, Spacing.lg)
    }
    .background(Color.brand.surface.ignoresSafeArea())
    .task {
      if case .idle = viewModel.state {
        await viewModel.load()
      }
    }
  }

  private var header: some View {
    VStack(alignment: .leading, spacing: Spacing.xs) {
      Text("library.eyebrow")
        .font(Font.brand.eyebrow)
        .foregroundColor(Color.brand.accent)
        .textCase(.uppercase)
      Text("library.title")
        .font(Font.brand.pageTitle)
        .foregroundColor(Color.brand.textPrimary)
    }
  }

  @ViewBuilder
  private var content: some View {
    switch viewModel.state {
    case .idle, .loading:
      ProgressView()
        .frame(maxWidth: .infinity)
        .padding(.top, Spacing.xxl)
    case .loaded(let surahs):
      LazyVStack(spacing: Spacing.sm) {
        ForEach(Array(surahs.enumerated()), id: \.element.id) { index, surah in
          SurahRow(
            index: index + 1,
            surah: surah,
            bestScore: historyStore.bestScore(forSurah: surah.id).map { Int($0) }
          )
          .onTapGesture { viewModel.surahOpened(surah) }
        }
      }
    case .failed(let error):
      ErrorState(error: error) {
        Task { await viewModel.load() }
      }
    }
  }
}

private struct ErrorState: View {
  let error: AppError
  let retry: () -> Void

  var body: some View {
    VStack(spacing: Spacing.md) {
      Image(systemName: "exclamationmark.triangle")
        .foregroundColor(Color.brand.recording)
      Text(error.errorDescription ?? "")
        .font(Font.brand.body)
        .foregroundColor(Color.brand.textPrimary)
      if let suggestion = error.recoverySuggestion {
        Text(suggestion)
          .font(Font.brand.caption)
          .foregroundColor(Color.brand.textSecondary)
          .multilineTextAlignment(.center)
      }
      if error.isRetriable {
        Button("library.retry", action: retry)
          .buttonStyle(.brandPrimary)
      }
    }
    .padding(.top, Spacing.xxl)
  }
}
