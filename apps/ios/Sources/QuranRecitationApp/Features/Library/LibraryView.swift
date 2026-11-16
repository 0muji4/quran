import SwiftUI

/// Library tab: feeds `LibraryViewModel` into `LibraryContent`, loads the
/// surahs on first appearance and reloads the history when it changes.
struct LibraryView: View {
  @State private var viewModel: LibraryViewModel
  let onResume: ((LastPracticed) -> Void)?
  let onSurahOpened: ((SurahSummary) -> Void)?

  init(
    viewModel: @autoclosure @escaping () -> LibraryViewModel,
    onResume: ((LastPracticed) -> Void)? = nil,
    onSurahOpened: ((SurahSummary) -> Void)? = nil
  ) {
    self._viewModel = State(initialValue: viewModel())
    self.onResume = onResume
    self.onSurahOpened = onSurahOpened
  }

  var body: some View {
    LibraryContent(
      state: viewModel.state,
      visibleSurahs: viewModel.filteredSurahs,
      query: $viewModel.query,
      filter: $viewModel.filter,
      lastPracticed: viewModel.lastPracticed,
      bestScores: viewModel.bestScores,
      onResume: { entry in
        viewModel.continueTapped(entry)
        onResume?(entry)
      },
      onSurahOpened: { surah in
        viewModel.surahOpened(surah)
        onSurahOpened?(surah)
      },
      onRetry: { Task { await viewModel.load() } }
    )
    .task {
      if case .idle = viewModel.state {
        await viewModel.load()
      }
    }
    .onAppear { viewModel.reloadHistory() }
    .onReceive(viewModel.historyChanges) { viewModel.reloadHistory() }
  }
}

/// The Library on `AppTheme` and system controls (ADR 0030). The agreed
/// mockup is the Library page of the canvas linked from #596. A large title
/// and the system search field head an inset grouped list: the Continue card,
/// the revelation-place filter as a segmented control, then the surahs. Takes
/// state rather than the ViewModel, so any state renders without one.
///
/// The Continue card resumes `lastPracticed` whenever there is one. Without
/// one, once the surahs are in, it offers to start at the first surah.
struct LibraryContent: View {
  let state: LibraryViewModel.LoadState
  let visibleSurahs: [SurahSummary]
  @Binding var query: String
  @Binding var filter: LibraryViewModel.Filter
  let lastPracticed: LastPracticed?
  let bestScores: [String: Int]
  let onResume: (LastPracticed) -> Void
  let onSurahOpened: (SurahSummary) -> Void
  let onRetry: () -> Void

  var body: some View {
    List {
      Section {
        hero
        filterPicker
          .listRowInsets(EdgeInsets(top: AppTheme.Spacing.space2, leading: 0, bottom: 0, trailing: 0))
          .listRowBackground(Color.clear)
          .listRowSeparator(.hidden)
      }
      content
    }
    .listStyle(.insetGrouped)
    .listSectionSpacing(AppTheme.Spacing.space3)
    .scrollContentBackground(.hidden)
    .background(AppTheme.Colors.surface.ignoresSafeArea())
    .tint(AppTheme.Colors.primary)
    .navigationTitle(Text("library.title", bundle: .module))
    .searchable(
      text: $query,
      placement: .navigationBarDrawer(displayMode: .always),
      prompt: Text("library.searchPlaceholder", bundle: .module)
    )
    .autocorrectionDisabled()
    .textInputAutocapitalization(.never)
  }

  @ViewBuilder
  private var hero: some View {
    Group {
      if let lastPracticed {
        ContinueCard(entry: lastPracticed, onResume: onResume)
      } else if case .loaded(let items) = state, let first = items.first {
        GetStartedCard { onSurahOpened(first) }
      }
    }
    .controlSize(.large)
    .buttonBorderShape(.capsule)
    .listRowInsets(EdgeInsets())
    .listRowBackground(Color.clear)
    .listRowSeparator(.hidden)
  }

  private var filterPicker: some View {
    Picker(selection: $filter) {
      Text("library.filter.all", bundle: .module).tag(LibraryViewModel.Filter.all)
      Text("library.filter.mecca", bundle: .module).tag(LibraryViewModel.Filter.mecca)
      Text("library.filter.medina", bundle: .module).tag(LibraryViewModel.Filter.medina)
      Text("library.filter.short", bundle: .module).tag(LibraryViewModel.Filter.short)
    } label: {
      Text("library.filter.a11y", bundle: .module)
    }
    .pickerStyle(.segmented)
  }

  @ViewBuilder
  private var content: some View {
    switch state {
    case .idle, .loading:
      ProgressView()
        .frame(maxWidth: .infinity)
        .padding(.top, AppTheme.Spacing.space12)
        .listRowBackground(Color.clear)
    case .loaded:
      if visibleSurahs.isEmpty {
        noMatch
          .listRowBackground(Color.clear)
      } else {
        Section {
          ForEach(visibleSurahs) { surah in
            Button {
              onSurahOpened(surah)
            } label: {
              SurahRow(
                surah: surah,
                bestScore: bestScores[surah.id],
                resume: surah.id == lastPracticed?.surahId
              )
            }
            .listRowBackground(AppTheme.Colors.surfaceContainer)
            .alignmentGuide(.listRowSeparatorLeading) { _ in AppTheme.Spacing.space12 }
          }
        }
      }
    case .failed(let error):
      failedPanel(error)
        .listRowInsets(EdgeInsets())
        .listRowBackground(Color.clear)
    }
  }

  private var noMatch: some View {
    VStack(spacing: AppTheme.Spacing.space2) {
      Image(systemName: "magnifyingglass")
        .font(.system(size: 36))
        .foregroundStyle(AppTheme.Colors.onSurfaceVariant)
        .accessibilityHidden(true)
      Text("library.empty", bundle: .module)
        .font(AppTheme.Typography.headline)
        .foregroundStyle(AppTheme.Colors.onSurface)
      Text("library.emptyBody", bundle: .module)
        .font(AppTheme.Typography.subheadline)
        .foregroundStyle(AppTheme.Colors.onSurfaceVariant)
    }
    .multilineTextAlignment(.center)
    .frame(maxWidth: .infinity)
    .padding(.top, AppTheme.Spacing.space12)
  }

  private func failedPanel(_ error: AppError) -> some View {
    AppPanel(tone: .error) {
      HStack(alignment: .top, spacing: AppTheme.Spacing.space3) {
        Image(systemName: "exclamationmark.circle")
          .font(AppTheme.Typography.title3)
          .accessibilityHidden(true)
        VStack(alignment: .leading, spacing: AppTheme.Spacing.space1) {
          Text(error.errorDescription ?? "")
            .font(AppTheme.Typography.headline)
          if let suggestion = error.recoverySuggestion {
            Text(suggestion)
              .font(AppTheme.Typography.subheadline)
          }
        }
      }
      .foregroundStyle(AppTheme.Colors.onErrorContainer)
      if error.isRetriable {
        HStack {
          Spacer(minLength: 0)
          Button(action: onRetry) {
            Text("library.retry", bundle: .module)
          }
          .buttonStyle(.appProminent)
        }
      }
    }
    .controlSize(.large)
    .buttonBorderShape(.capsule)
  }
}
