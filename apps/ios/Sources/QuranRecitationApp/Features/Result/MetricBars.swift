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
        row(label: "result.metric.fluency", value: fluency)
        row(label: "result.metric.completeness", value: completeness)
      }
    }
  }

  private func row(label: LocalizedStringKey, value: Double) -> some View {
    VStack(alignment: .leading, spacing: Spacing.sm) {
      HStack {
        Text(label, bundle: .module)
          .font(Font.brand.body.weight(.semibold))
          .foregroundColor(Color.brand.textPrimary)
        Spacer()
        Text("\(Int(value)) %")
          .font(Font.brand.body.weight(.semibold))
          .foregroundColor(Color.brand.success)
          .monospacedDigit()
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
