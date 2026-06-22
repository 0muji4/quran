import SwiftUI

/// Result detail screen. Subsequent PRs add the Metric bars (PR 19),
/// Word comparison tiles (PR 20), and the Listen-back + actions row
/// (PR 21). This PR only mounts the score hero.
struct ResultDetailView: View {
  @StateObject var viewModel: ResultDetailViewModel
  let onClose: () -> Void

  init(viewModel: @autoclosure @escaping () -> ResultDetailViewModel, onClose: @escaping () -> Void) {
    self._viewModel = StateObject(wrappedValue: viewModel())
    self.onClose = onClose
  }

  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: Spacing.lg) {
        topBar
        content
      }
      .padding(.vertical, Spacing.lg)
    }
    .background(Color.brand.surface.ignoresSafeArea())
    .navigationBarBackButtonHidden(true)
    // Pin Try-again / Continue to the bottom so they stay reachable
    // however long the word-comparison + listen-back content scrolls.
    // Only shown once a result has loaded — the loading/error states
    // have no actions.
    .safeAreaInset(edge: .bottom) {
      if case .loaded = viewModel.state {
        bottomActionBar
      }
    }
    .task { await viewModel.loadIfNeeded() }
  }

  private var topBar: some View {
    HStack {
      Button(action: onClose) {
        Image(systemName: "chevron.right")
          .rotationEffect(.degrees(180))
          .foregroundColor(Color.brand.textPrimary)
          .padding(Spacing.sm)
          .background(Color.brand.card)
          .clipShape(Circle())
      }
      Spacer()
      Text("\(NSLocalizedString("result.title", bundle: .module, comment: "")) · ayah \(viewModel.ayahNumber)")
        .font(Font.brand.body.weight(.semibold))
        .foregroundColor(Color.brand.textPrimary)
      Spacer()
      Image(systemName: "ellipsis")
        .foregroundColor(Color.brand.textPrimary)
        .padding(Spacing.sm)
        .background(Color.brand.card)
        .clipShape(Circle())
    }
    .padding(.horizontal, Spacing.screenHorizontal)
  }

  @ViewBuilder
  private var content: some View {
    switch viewModel.state {
    case .idle, .loading:
      ProgressView()
        .frame(maxWidth: .infinity)
        .padding(.top, Spacing.xxl)
    case .loaded(let result):
      // BFF's `result.verdict` is deliberately ignored: the
      // `scoring_jobs.verdict` column is never populated server-side, so
      // we compute the band locally — same thresholds, same copy as the
      // web `verdictForScore` so a 72 on iPhone and the same 72 on Web
      // never disagree about whether it's "Great progress" or "Some
      // work to do".
      ScoreHero(
        score: result.score,
        verdict: verdictForScore(result.score)
      )
      .padding(.horizontal, Spacing.screenHorizontal)
      MetricBars(feedback: result.feedback, fallbackScore: result.score)
        .padding(.horizontal, Spacing.screenHorizontal)
      WordComparisonGrid(
        alignments: result.feedback?.wordAlignments ?? [],
        werPercent: result.feedback?.wer.map { Int(($0 * 100).rounded()) }
      )
      .padding(.horizontal, Spacing.screenHorizontal)
      ListenBackSection(
        teacherDuration: result.feedback?.referenceAudioUrl != nil ? 0 : nil,
        youDuration: nil,
        teacherIsPlaying: false,
        youIsPlaying: false,
        onToggleTeacher: {},
        onToggleYou: {}
      )
      .padding(.horizontal, Spacing.screenHorizontal)
    case .failed(let error):
      Text(error.errorDescription ?? "")
        .font(Font.brand.body)
        .foregroundColor(Color.brand.textSecondary)
        .padding(.horizontal, Spacing.screenHorizontal)
    }
  }

  /// Pinned action bar. Sits on a cream surface with a hairline top
  /// divider so it reads as a fixed footer over the scrolling content.
  private var bottomActionBar: some View {
    HStack(spacing: Spacing.md) {
      Button {
        viewModel.tryAgainTapped()
        onClose()
      } label: {
        Text("result.action.tryAgain", bundle: .module)
          .font(Font.brand.body.weight(.semibold))
          .foregroundColor(Color.brand.textPrimary)
          .padding(.vertical, Spacing.sm)
          .padding(.horizontal, Spacing.lg)
          .background(Color.brand.card)
          .overlay(Capsule().strokeBorder(Color.brand.textSecondary.opacity(0.3)))
          .clipShape(Capsule())
      }
      .buttonStyle(.plain)
      Button {
        viewModel.continueTapped()
        onClose()
      } label: {
        HStack {
          Text(continueLabel)
          Image(systemName: "arrow.right")
        }
      }
      .buttonStyle(.brandPrimary)
      .frame(minWidth: 180)
    }
    .padding(.horizontal, Spacing.screenHorizontal)
    .padding(.vertical, Spacing.md)
    .frame(maxWidth: .infinity)
    .background(
      Color.brand.surface
        .overlay(alignment: .top) {
          Divider().background(Color.brand.tile)
        }
        .ignoresSafeArea(edges: .bottom)
    )
  }

  private var continueLabel: LocalizedStringKey {
    "result.action.continue \(viewModel.ayahNumber + 1)"
  }
}
