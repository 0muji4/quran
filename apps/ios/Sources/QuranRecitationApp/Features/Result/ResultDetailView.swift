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
      ScoreHero(
        score: result.score,
        verdict: result.verdict,
        detail: result.score.map { detailMessage(for: $0) }
      )
      .padding(.horizontal, Spacing.screenHorizontal)
      MetricBars(feedback: result.feedback, fallbackScore: result.score)
        .padding(.horizontal, Spacing.screenHorizontal)
      WordComparisonGrid(
        alignments: result.feedback?.wordAlignments ?? [],
        werPercent: result.feedback?.wer.map { Int(($0 * 100).rounded()) }
      )
      .padding(.horizontal, Spacing.screenHorizontal)
    case .failed(let error):
      Text(error.errorDescription ?? "")
        .font(Font.brand.body)
        .foregroundColor(Color.brand.textSecondary)
        .padding(.horizontal, Spacing.screenHorizontal)
    }
  }

  private func detailMessage(for score: Double) -> String {
    let key: String
    switch score {
    case 90...:    key = "result.detail.excellent"
    case 75..<90:  key = "result.detail.strong"
    case 50..<75:  key = "result.detail.midway"
    default:       key = "result.detail.beginner"
    }
    return NSLocalizedString(key, bundle: .module, comment: "")
  }
}
