import SwiftUI

/// History tab. List of recent attempts with a chip filter row.
/// Signed-out users see a "Sign in to track" empty state per ADR 0021
/// (history is an account feature); the stats / chips / list collapse
/// to that empty state so anonymous users do not see zeroed metrics.
struct HistoryView: View {
  @StateObject var viewModel: HistoryViewModel
  @ObservedObject var session: SessionStore

  init(
    viewModel: @autoclosure @escaping () -> HistoryViewModel,
    session: SessionStore
  ) {
    self._viewModel = StateObject(wrappedValue: viewModel())
    self._session = ObservedObject(wrappedValue: session)
  }

  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: Spacing.lg) {
        header
        if session.isSignedIn {
          StatsGrid(stats: HistoryStats.compute(from: viewModel.attempts))
          chipFilter
          list
        } else {
          signedOutEmpty
        }
      }
      .padding(.vertical, Spacing.lg)
    }
    .background(Color.brand.surface.ignoresSafeArea())
    .onAppear { viewModel.reload() }
    .onChange(of: session.currentUser?.id) { _ in
      // Sign-in flips the gated store from empty to "real reads";
      // sign-out flips it the other way. Re-fetch so the in-memory
      // `attempts` snapshot matches the new state without waiting
      // for the next tab-appear.
      viewModel.reload()
    }
  }

  private var header: some View {
    VStack(alignment: .leading, spacing: Spacing.xs) {
      Text("history.eyebrow", bundle: .module)
        .font(Font.brand.eyebrow)
        .foregroundColor(Color.brand.accent)
        .textCase(.uppercase)
      Text("history.title", bundle: .module)
        .font(Font.brand.pageTitle)
        .foregroundColor(Color.brand.textPrimary)
    }
    .padding(.horizontal, Spacing.screenHorizontal)
  }

  private var chipFilter: some View {
    ChipFilter<HistoryViewModel.Filter>(
      items: viewModel.filterOptions.map { filter in
        switch filter {
        case .all:
          return ChipFilter<HistoryViewModel.Filter>.Item(.all, "history.filter.all")
        case .surah(_, let name):
          return ChipFilter<HistoryViewModel.Filter>.Item(filter, .init(stringLiteral: name))
        }
      },
      selection: $viewModel.filter
    )
  }

  @ViewBuilder
  private var list: some View {
    let visible = viewModel.filteredAttempts
    if visible.isEmpty {
      empty
    } else {
      LazyVStack(spacing: Spacing.sm) {
        ForEach(visible) { attempt in
          AttemptRow(attempt: attempt)
        }
      }
      .padding(.horizontal, Spacing.screenHorizontal)
    }
  }

  private var empty: some View {
    VStack(spacing: Spacing.sm) {
      Image(systemName: "clock")
        .foregroundColor(Color.brand.textSecondary)
      Text("history.empty", bundle: .module)
        .font(Font.brand.body)
        .foregroundColor(Color.brand.textSecondary)
    }
    .frame(maxWidth: .infinity)
    .padding(.top, Spacing.xxl)
  }

  private var signedOutEmpty: some View {
    VStack(spacing: Spacing.md) {
      Image(systemName: "person.crop.circle.badge.questionmark")
        .font(.system(size: 40))
        .foregroundColor(Color.brand.textSecondary)
      Text("history.signedOutTitle", bundle: .module)
        .font(Font.brand.sectionTitle)
        .foregroundColor(Color.brand.textPrimary)
      Text("history.signedOutSubtitle", bundle: .module)
        .font(Font.brand.body)
        .foregroundColor(Color.brand.textSecondary)
        .multilineTextAlignment(.center)
    }
    .frame(maxWidth: .infinity)
    .padding(.horizontal, Spacing.screenHorizontal)
    .padding(.top, Spacing.xxl)
  }
}
