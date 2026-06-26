import SwiftUI

/// Three stacked metric rows: Accuracy, Character match, Completeness.
/// Feedback values are 0…1 fractions, scaled to the 0…100 the row
/// renders; the fallback overall score is already 0…100. Character match
/// is `1 − CER` — chirp_3 returns no per-word confidence, so the former
/// Fluency row was always zero and has been dropped. Renders even when
/// feedback is missing by falling back to the overall score.
struct MetricBars: View {
  let feedback: PronunciationFeedbackPayload?
  let fallbackScore: Double?

  var body: some View {
    BrandCard {
      VStack(spacing: Spacing.lg) {
        row(label: "result.metric.accuracy", value: accuracy)
        Divider().background(Color.brand.tile)
        row(label: "result.metric.characterMatch", value: characterMatch)
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
    feedback.map { $0.accuracy * 100 } ?? fallbackScore ?? 0
  }

  private var characterMatch: Double {
    feedback?.cer.map { (1 - $0) * 100 } ?? fallbackScore ?? 0
  }

  private var completeness: Double {
    feedback.map { $0.completeness * 100 } ?? fallbackScore ?? 0
  }
}
