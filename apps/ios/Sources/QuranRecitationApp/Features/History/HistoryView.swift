import SwiftUI

/// History tab. List of recent attempts with a chip filter row.
/// StatsGrid lands in PR 23 above the list.
struct HistoryView: View {
  @StateObject var viewModel: HistoryViewModel

  init(viewModel: @autoclosure @escaping () -> HistoryViewModel) {
    self._viewModel = StateObject(wrappedValue: viewModel())
  }

  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: Spacing.lg) {
        header
        chipFilter
        list
      }
      .padding(.vertical, Spacing.lg)
    }
    .background(Color.brand.surface.ignoresSafeArea())
    .onAppear { viewModel.reload() }
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
}
