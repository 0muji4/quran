import SwiftUI

/// Library tab — vertical list of surahs with a search bar and
/// difficulty chip filter, plus a Continue card when the user has a
/// recent practice session, and a personalised "Suggested for you"
/// card when the BFF returns one for a signed-in user.
struct LibraryView: View {
  @StateObject var viewModel: LibraryViewModel
  @ObservedObject var session: SessionStore
  let historyStore: HistoryStore
  let onResume: ((LastPracticed) -> Void)?
  let onSuggestedBegin: ((SurahSummary) -> Void)?
  let onSurahOpened: ((SurahSummary) -> Void)?

  init(
    viewModel: @autoclosure @escaping () -> LibraryViewModel,
    session: SessionStore,
    historyStore: HistoryStore,
    onResume: ((LastPracticed) -> Void)? = nil,
    onSuggestedBegin: ((SurahSummary) -> Void)? = nil,
    onSurahOpened: ((SurahSummary) -> Void)? = nil
  ) {
    self._viewModel = StateObject(wrappedValue: viewModel())
    self._session = ObservedObject(wrappedValue: session)
    self.historyStore = historyStore
    self.onResume = onResume
    self.onSuggestedBegin = onSuggestedBegin
    self.onSurahOpened = onSurahOpened
  }

  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: Spacing.lg) {
        header
        if let lastPracticed = historyStore.lastPracticed() {
          ContinueCard(entry: lastPracticed) { entry in
            viewModel.continueTapped(entry)
            onResume?(entry)
          }
          .padding(.horizontal, Spacing.screenHorizontal)
        }
        if let suggestion = viewModel.suggestion,
           case let .loaded(items) = viewModel.state {
          SuggestedCard(suggestion: suggestion, surahs: items) { surah in
            viewModel.suggestedTapped(surah)
            onSuggestedBegin?(surah)
          }
          .padding(.horizontal, Spacing.screenHorizontal)
        }
        searchPill
        chipFilter
        content
      }
      .padding(.vertical, Spacing.lg)
    }
    .background(Color.brand.surface.ignoresSafeArea())
    .task {
      if case .idle = viewModel.state {
        await viewModel.load()
      }
    }
    .task(id: session.currentUser?.id) {
      // Re-fetch on sign-in / sign-out / first appearance. `task(id:)`
      // cancels the previous task whenever the id changes, so a
      // sign-out mid-flight does not race a stale success.
      if session.isSignedIn {
        await viewModel.refreshSuggestion()
      } else {
        viewModel.clearSuggestion()
      }
    }
  }

  private var header: some View {
    VStack(alignment: .leading, spacing: Spacing.xs) {
      BrandEyebrow("library.eyebrow")
      Text("library.title", bundle: .module)
        .font(Font.brand.pageTitle)
        .foregroundColor(Color.brand.textPrimary)
    }
    .padding(.horizontal, Spacing.screenHorizontal)
  }

  /// Inline search pill in the content (not the nav-bar `.searchable`
  /// drawer) — the rounded cream field from the mock, sitting between
  /// the Continue card and the filter chips.
  private var searchPill: some View {
    HStack(spacing: Spacing.sm) {
      Image(systemName: "magnifyingglass")
        .foregroundColor(Color.brand.textSecondary)
      TextField(
        "",
        text: $viewModel.query,
        prompt: Text("library.searchPlaceholder", bundle: .module)
          .foregroundColor(Color.brand.textSecondary)
      )
      .foregroundColor(Color.brand.textPrimary)
      .autocorrectionDisabled()
      .textInputAutocapitalization(.never)
      if !viewModel.query.isEmpty {
        Button {
          viewModel.query = ""
        } label: {
          Image(systemName: "xmark.circle.fill")
            .foregroundColor(Color.brand.textSecondary)
        }
        .buttonStyle(.plain)
        .accessibilityLabel(Text("library.searchPlaceholder", bundle: .module))
      }
    }
    .padding(.horizontal, Spacing.lg)
    .frame(minHeight: Spacing.minTapTarget)
    .background(Color.brand.card)
    .clipShape(Capsule())
    .overlay(Capsule().strokeBorder(Color.brand.tile, lineWidth: 1))
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
          ForEach(visible) { surah in
            SurahRow(
              surah: surah,
              bestScore: historyStore.bestScore(forSurah: surah.id).map { Int($0) }
            )
            .onTapGesture {
              viewModel.surahOpened(surah)
              onSurahOpened?(surah)
            }
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
