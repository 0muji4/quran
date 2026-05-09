import SwiftUI

/// Library tab — vertical list of surahs with a search bar and
/// difficulty chip filter. The Continue card lands in PR 11.
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
        chipFilter
        content
      }
      .padding(.vertical, Spacing.lg)
    }
    .background(Color.brand.surface.ignoresSafeArea())
    .searchable(
      text: $viewModel.query,
      placement: .navigationBarDrawer(displayMode: .always),
      prompt: Text("library.searchPlaceholder", bundle: .module)
    )
    .task {
      if case .idle = viewModel.state {
        await viewModel.load()
      }
    }
  }

  private var header: some View {
    VStack(alignment: .leading, spacing: Spacing.xs) {
      Text("library.eyebrow", bundle: .module)
        .font(Font.brand.eyebrow)
        .foregroundColor(Color.brand.accent)
        .textCase(.uppercase)
      Text("library.title", bundle: .module)
        .font(Font.brand.pageTitle)
        .foregroundColor(Color.brand.textPrimary)
    }
    .padding(.horizontal, Spacing.screenHorizontal)
  }

  private var chipFilter: some View {
    ChipFilter<LibraryViewModel.Filter>(
      items: [
        .init(.all, "library.filter.all"),
        .init(.mecca, "library.filter.mecca"),
        .init(.medina, "library.filter.medina"),
        .init(.short, "library.filter.short")
      ],
      selection: $viewModel.filter
    )
  }

  @ViewBuilder
  private var content: some View {
    switch viewModel.state {
    case .idle, .loading:
      ProgressView()
        .frame(maxWidth: .infinity)
        .padding(.top, Spacing.xxl)
    case .loaded:
      let visible = viewModel.filteredSurahs
      if visible.isEmpty {
        emptyState
      } else {
        LazyVStack(spacing: Spacing.sm) {
          ForEach(Array(visible.enumerated()), id: \.element.id) { index, surah in
            SurahRow(
              index: index + 1,
              surah: surah,
              bestScore: historyStore.bestScore(forSurah: surah.id).map { Int($0) }
            )
            .onTapGesture { viewModel.surahOpened(surah) }
          }
        }
        .padding(.horizontal, Spacing.screenHorizontal)
      }
    case .failed(let error):
      ErrorState(error: error) {
        Task { await viewModel.load() }
      }
    }
  }

  private var emptyState: some View {
    VStack(spacing: Spacing.sm) {
      Image(systemName: "magnifyingglass")
        .foregroundColor(Color.brand.textSecondary)
      Text("library.empty", bundle: .module)
        .font(Font.brand.body)
        .foregroundColor(Color.brand.textSecondary)
    }
    .frame(maxWidth: .infinity)
    .padding(.top, Spacing.xxl)
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
        Button {
          retry()
        } label: {
          Text("library.retry", bundle: .module)
        }
        .buttonStyle(.brandPrimary)
      }
    }
    .padding(.top, Spacing.xxl)
    .padding(.horizontal, Spacing.screenHorizontal)
  }
}
