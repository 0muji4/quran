import SwiftUI

/// Accuracy, character match and completeness, each as a percentage over a
/// linear progress view. Feedback values are 0…1 fractions; without feedback
/// every row falls back to the overall score, which is already 0…100.
/// Character match is `1 − CER`. chirp_3 gives no per-word confidence, so
/// there is no fluency row.
struct MetricBars: View {
  let feedback: PronunciationFeedbackPayload?
  let fallbackScore: Int?

  var body: some View {
    AppPanel {
      Text("result.metrics.title", bundle: .module)
        .font(AppTheme.Typography.headline)
        .foregroundStyle(AppTheme.Colors.onSurface)
      row(label: "result.metric.accuracy", percent: accuracy)
      row(label: "result.metric.characterMatch", percent: characterMatch)
      row(label: "result.metric.completeness", percent: completeness)
    }
  }

  private func row(label: LocalizedStringKey, percent: Double) -> some View {
    let clamped = min(max(percent, 0), 100)
    return VStack(alignment: .leading, spacing: AppTheme.Spacing.space2) {
      HStack(alignment: .firstTextBaseline) {
        Text(label, bundle: .module)
          .font(AppTheme.Typography.subheadline)
          .foregroundStyle(AppTheme.Colors.onSurface)
        Spacer(minLength: AppTheme.Spacing.space2)
        Text("result.metric.percent \(Int(clamped.rounded()))", bundle: .module)
          .font(AppTheme.Typography.subheadline.weight(.semibold).monospacedDigit())
          .foregroundStyle(AppTheme.Colors.primary)
      }
      ProgressView(value: clamped, total: 100)
        .accessibilityHidden(true)
    }
    .accessibilityElement(children: .combine)
  }

  private var accuracy: Double {
    feedback.map { $0.accuracy * 100 } ?? fallbackScore.map(Double.init) ?? 0
  }

  private var characterMatch: Double {
    feedback?.cer.map { (1 - $0) * 100 } ?? fallbackScore.map(Double.init) ?? 0
  }

  private var completeness: Double {
    feedback.map { $0.completeness * 100 } ?? fallbackScore.map(Double.init) ?? 0
  }
}
