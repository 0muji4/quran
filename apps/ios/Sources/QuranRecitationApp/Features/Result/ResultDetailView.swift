import SwiftUI

/// Result screen: feeds `ResultDetailViewModel` into `ResultContent` and
/// loads the result on first appearance.
struct ResultDetailView: View {
  @State private var viewModel: ResultDetailViewModel
  let onClose: () -> Void

  init(viewModel: @autoclosure @escaping () -> ResultDetailViewModel, onClose: @escaping () -> Void) {
    self._viewModel = State(initialValue: viewModel())
    self.onClose = onClose
  }

  var body: some View {
    ResultContent(
      state: viewModel.state,
      ayahNumber: viewModel.ayahNumber,
      onTryAgain: {
        viewModel.tryAgainTapped()
        onClose()
      },
      onContinue: {
        viewModel.continueTapped()
        onClose()
      }
    )
    .task { await viewModel.loadIfNeeded() }
  }
}

/// The Result screen on `AppTheme` and system controls (ADR 0030). The agreed
/// mockup is the Result page of the canvas linked from #596. The screen is
/// pushed onto the Practice stack, so the system back button returns to
/// Practice. Once the result is in, Try again and Continue stay at the bottom
/// while the score and its details scroll above them. Takes state rather than
/// the ViewModel, so any state renders without one.
struct ResultContent: View {
  let state: ResultDetailViewModel.LoadState
  let ayahNumber: Int
  let onTryAgain: () -> Void
  let onContinue: () -> Void

  var body: some View {
    VStack(spacing: 0) {
      ScrollView {
        VStack(alignment: .leading, spacing: AppTheme.Spacing.space3) {
          content
        }
        .padding(.horizontal, AppTheme.Spacing.space4)
        .padding(.top, AppTheme.Spacing.space1)
        .padding(.bottom, AppTheme.Spacing.space3)
      }
      if case .loaded = state {
        actionBar
      }
    }
    .background(AppTheme.Colors.surface.ignoresSafeArea())
    .controlSize(.large)
    .buttonBorderShape(.capsule)
    .tint(AppTheme.Colors.primary)
    .navigationBarTitleDisplayMode(.inline)
    .toolbar {
      ToolbarItem(placement: .principal) {
        titleView
      }
    }
  }

  @ViewBuilder
  private var content: some View {
    switch state {
    case .idle, .loading:
      ProgressView()
        .frame(maxWidth: .infinity)
        .padding(.top, AppTheme.Spacing.space12)
    case .loaded(let result):
      // The BFF's `result.verdict` is never populated server-side, so the
      // band is computed here with the same thresholds and copy as the web's
      // `verdictForScore`: the same score gets the same verdict everywhere.
      ScoreHero(score: result.score, verdict: verdictForScore(result.score))
      MetricBars(feedback: result.feedback, fallbackScore: result.score)
      WordComparisonGrid(
        alignments: result.feedback?.wordAlignments ?? [],
        werPercent: result.feedback?.wer.map { Int(($0 * 100).rounded()) }
      )
      // Listen-back is not wired to a player yet: the buttons do nothing and
      // no clip length is known, so none is shown.
      ListenBackSection(
        teacherDuration: nil,
        youDuration: nil,
        teacherIsPlaying: false,
        youIsPlaying: false,
        onToggleTeacher: {},
        onToggleYou: {}
      )
    case .failed(let error):
      failedPanel(error)
    }
  }

  /// "Result" with the ayah under it, in the navigation bar.
  private var titleView: some View {
    VStack(spacing: 0) {
      Text("result.title", bundle: .module)
        .font(AppTheme.Typography.headline)
        .foregroundStyle(AppTheme.Colors.onSurface)
      Text("result.subtitle.ayah \(ayahNumber)", bundle: .module)
        .font(AppTheme.Typography.footnote)
        .foregroundStyle(AppTheme.Colors.onSurfaceVariant)
    }
    .accessibilityElement(children: .combine)
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
    }
  }

  /// Try again and Continue, under a divider so they read as fixed below the
  /// scrolling content. Continue takes the width Try again leaves, so its
  /// longer label stays on one line.
  private var actionBar: some View {
    VStack(spacing: 0) {
      Divider()
      HStack(spacing: AppTheme.Spacing.space2) {
        Button(action: onTryAgain) {
          Text("result.action.tryAgain", bundle: .module)
        }
        .buttonStyle(.bordered)
        Button(action: onContinue) {
          Text("result.action.continue \(ayahNumber + 1)", bundle: .module)
            .frame(maxWidth: .infinity)
        }
        .buttonStyle(.appProminent)
      }
      .padding(AppTheme.Spacing.space4)
    }
  }
}
