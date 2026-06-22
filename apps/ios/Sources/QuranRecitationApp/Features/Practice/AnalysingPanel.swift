import SwiftUI

/// Cream card shown while a scoring job runs. Mirrors
/// `docs/design/iOS _ Practice _ analysing.png`: title + sub-line on
/// top, a tinted shimmer waveform behind a 3-step progress checklist.
struct AnalysingPanel: View {
  let step: AnalysingStep

  @Environment(\.accessibilityReduceMotion) private var reduceMotion

  var body: some View {
    BrandCard {
      VStack(alignment: .leading, spacing: Spacing.lg) {
        header
        VStack(spacing: Spacing.lg) {
          shimmerWaveform
          checklist
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, Spacing.xl)
        .background(Color.brand.tile)
        .clipShape(RoundedRectangle(cornerRadius: Spacing.cardCornerRadius, style: .continuous))
      }
    }
  }

  private var header: some View {
    HStack(alignment: .center, spacing: Spacing.md) {
      Image(systemName: "sparkles")
        .foregroundColor(Color.brand.primary)
        .frame(width: Spacing.minTapTarget, height: Spacing.minTapTarget)
        .background(Color.brand.primary.opacity(0.12))
        .clipShape(Circle())
      VStack(alignment: .leading, spacing: 2) {
        Text("practice.analysing.title", bundle: .module)
          .font(Font.brand.body.weight(.semibold))
          .foregroundColor(Color.brand.textPrimary)
        Text("practice.analysing.subtitle", bundle: .module)
          .font(Font.brand.caption)
          .foregroundColor(Color.brand.textSecondary)
      }
      Spacer()
    }
  }

  private var shimmerWaveform: some View {
    let baseLevels: [Float] = (0..<32).map { idx in
      Float(0.4 + 0.4 * sin(Double(idx) * 0.5))
    }
    return WaveformView(
      meters: baseLevels,
      maxHeight: 56,
      color: Color.brand.primary.opacity(reduceMotion ? 0.35 : 0.55)
    )
    .padding(.horizontal, Spacing.lg)
  }

  private var checklist: some View {
    VStack(alignment: .leading, spacing: Spacing.sm) {
      checklistRow(.transcribing, label: "practice.analysing.step.transcribing")
      checklistRow(.comparing, label: "practice.analysing.step.comparing")
      checklistRow(.calculating, label: "practice.analysing.step.calculating")
    }
    .padding(.horizontal, Spacing.lg)
  }

  private func checklistRow(_ rowStep: AnalysingStep, label: LocalizedStringKey) -> some View {
    HStack(spacing: Spacing.sm) {
      Image(systemName: icon(for: rowStep))
        .foregroundColor(color(for: rowStep))
      Text(label, bundle: .module)
        .font(Font.brand.body.weight(weight(for: rowStep)))
        .foregroundColor(textColor(for: rowStep))
      Spacer()
    }
  }

  // MARK: - Step styling

  private func ordinal(_ s: AnalysingStep) -> Int {
    switch s {
    case .transcribing: return 0
    case .comparing:    return 1
    case .calculating:  return 2
    }
  }

  private func icon(for rowStep: AnalysingStep) -> String {
    if ordinal(rowStep) < ordinal(step) { return "checkmark.circle.fill" }
    if ordinal(rowStep) == ordinal(step) { return "circle.dotted" }
    return "circle"
  }

  private func color(for rowStep: AnalysingStep) -> Color {
    ordinal(rowStep) <= ordinal(step) ? Color.brand.primary : Color.brand.textSecondary
  }

  private func textColor(for rowStep: AnalysingStep) -> Color {
    ordinal(rowStep) == ordinal(step) ? Color.brand.textPrimary : Color.brand.textSecondary
  }

  private func weight(for rowStep: AnalysingStep) -> Font.Weight {
    ordinal(rowStep) == ordinal(step) ? .semibold : .regular
  }
}
