import SwiftUI

/// Three stacked metric rows from `docs/design/iOS _ Result detail.png`:
/// Accuracy, Fluency, Completeness. Values are 0…100 and come from
/// `PronunciationFeedbackPayload`. Renders even when feedback is missing
/// — falls back to using the overall score for all three so the user
/// still sees the row treatment.
struct MetricBars: View {
  let feedback: PronunciationFeedbackPayload?
  let fallbackScore: Double?

  var body: some View {
    BrandCard {
      VStack(spacing: Spacing.lg) {
        row(label: "result.metric.accuracy", value: accuracy)
        Divider().background(Color.brand.tile)
        row(label: "result.metric.fluency", value: fluency)
        Divider().background(Color.brand.tile)
        row(label: "result.metric.completeness", value: completeness)
      }
    }
  }

  private func row(label: LocalizedStringKey, value: Double) -> some View {
    VStack(alignment: .leading, spacing: Spacing.sm) {
      HStack(alignment: .firstTextBaseline) {
        Text(label, bundle: .module)
          .font(Font.brand.body.weight(.semibold))
          .foregroundColor(Color.brand.textPrimary)
        Spacer()
        // Serif numeral to echo the score-hero figure; the "%" stays
        // smaller so the value reads as the emphasis.
        Text("\(Int(value))")
          .font(.system(size: 19, weight: .semibold, design: .serif))
          .foregroundColor(Color.brand.primary)
          .monospacedDigit()
          + Text(" %")
          .font(Font.brand.caption.weight(.semibold))
          .foregroundColor(Color.brand.primary)
      }
      ProgressBar(value: value, total: 100)
    }
  }

  private var accuracy: Double {
    feedback?.accuracy ?? fallbackScore ?? 0
  }

  private var fluency: Double {
    feedback?.fluency ?? fallbackScore ?? 0
  }

  private var completeness: Double {
    feedback?.completeness ?? fallbackScore ?? 0
  }
}
