import SwiftUI

/// History tab: feeds `HistoryViewModel` into `HistoryContent` and reloads the
/// attempts when they change or the user signs in or out.
struct HistoryView: View {
  @State private var viewModel: HistoryViewModel
  let session: SessionStore

  init(
    viewModel: @autoclosure @escaping () -> HistoryViewModel,
    session: SessionStore
  ) {
    self._viewModel = State(initialValue: viewModel())
    self.session = session
  }

  var body: some View {
    HistoryContent(
      attempts: viewModel.attempts,
      visibleAttempts: viewModel.filteredAttempts,
      filter: $viewModel.filter,
      filterOptions: viewModel.filterOptions,
      isSignedIn: session.isSignedIn
    )
    .onAppear { viewModel.reload() }
    .onReceive(viewModel.historyChanges) { viewModel.reload() }
    .onChange(of: session.currentUser?.id) {
      // Sign-in flips the gated store from empty to real reads, and sign-out
      // the other way, so the attempts are read again.
      viewModel.reload()
    }
  }
}

/// History on `AppTheme` and system controls (ADR 0030). The agreed mockup is
/// the History page of the canvas linked from #596. A large title heads an
/// inset grouped list: the four totals, then the attempts under a section
/// header. The surah filter is a pull-down menu in the navigation bar. Takes
/// state rather than the ViewModel, so any state renders without one.
///
/// History is an account feature (ADR 0021): signed out, the screen says so
/// instead of showing totals. With no attempts, an empty state replaces the
/// totals and the list.
struct HistoryContent: View {
  /// Every attempt, newest first; the totals cover all of them.
  let attempts: [Attempt]
  /// The attempts that pass `filter`.
  let visibleAttempts: [Attempt]
  @Binding var filter: HistoryViewModel.Filter
  let filterOptions: [HistoryViewModel.Filter]
  let isSignedIn: Bool
  /// The time the totals and the "Today" / "Yesterday" labels count from.
  var now: Date = Date()

  var body: some View {
    content
      .background(AppTheme.Colors.surface.ignoresSafeArea())
      .tint(AppTheme.Colors.primary)
      .navigationTitle(Text("history.title", bundle: .module))
      .toolbar {
        if showsAttempts {
          ToolbarItem(placement: .topBarTrailing) { filterMenu }
        }
      }
  }

  private var showsAttempts: Bool { isSignedIn && !attempts.isEmpty }

  @ViewBuilder
  private var content: some View {
    if !isSignedIn {
      ContentUnavailableView {
        Label {
          Text("history.signedOutTitle", bundle: .module)
        } icon: {
          Image(systemName: "person.crop.circle")
        }
      } description: {
        Text("history.signedOutSubtitle", bundle: .module)
      }
    } else if attempts.isEmpty {
      ContentUnavailableView {
        Label {
          Text("history.empty", bundle: .module)
        } icon: {
          Image(systemName: "clock")
        }
      } description: {
        Text("history.emptyBody", bundle: .module)
      }
    } else {
      List {
        Section {
          StatsGrid(stats: HistoryStats.compute(from: attempts, now: now))
            .listRowInsets(EdgeInsets())
            .listRowBackground(Color.clear)
        }
        Section {
          ForEach(visibleAttempts) { attempt in
            AttemptRow(attempt: attempt, now: now)
              .listRowBackground(AppTheme.Colors.surfaceContainer)
              .alignmentGuide(.listRowSeparatorLeading) { _ in AppTheme.Spacing.space12 }
          }
        } header: {
          sectionTitle
        }
      }
      .listStyle(.insetGrouped)
      .listSectionSpacing(AppTheme.Spacing.space3)
      .scrollContentBackground(.hidden)
    }
  }

  private var sectionTitle: Text {
    switch filter {
    case .all: Text("history.section.all", bundle: .module)
    case .surah(_, let nameEn): Text(verbatim: nameEn)
    }
  }

  private var filterMenu: some View {
    Menu {
      Picker(selection: $filter) {
        ForEach(filterOptions, id: \.self) { option in
          switch option {
          case .all: Text("history.filter.all", bundle: .module).tag(option)
          case .surah(_, let nameEn): Text(verbatim: nameEn).tag(option)
          }
        }
      } label: {
        Text("history.filter.a11y", bundle: .module)
      }
    } label: {
      Label {
        Text("history.filter.a11y", bundle: .module)
      } icon: {
        Image(systemName: "line.3.horizontal.decrease")
      }
    }
  }
}
