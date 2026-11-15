import SwiftUI

/// The score out of 100 with its verdict chip, then the verdict band's
/// headline and advice. `score` is whole points out of 100; nil shows a dash
/// and no chip. `verdict` comes from `verdictForScore(_:)`, so iOS shows the
/// same band as the web for the same score.
struct ScoreHero: View {
  let score: Int?
  let verdict: VerdictBand

  var body: some View {
    AppCard(spacing: AppTheme.Spacing.space2) {
      HStack(alignment: .center, spacing: AppTheme.Spacing.space2) {
        HStack(alignment: .firstTextBaseline, spacing: AppTheme.Spacing.space1) {
          Text(verbatim: score.map(String.init) ?? "—")
            .font(.system(.largeTitle, weight: .semibold).monospacedDigit())
            .foregroundStyle(AppTheme.Colors.primary)
          Text("result.score.of100", bundle: .module)
            .font(AppTheme.Typography.body)
            .foregroundStyle(AppTheme.Colors.onSurfaceVariant)
        }
        .accessibilityElement(children: .combine)
        Spacer(minLength: 0)
        if let chip = verdict.verdict {
          AppVerdictChip(verdict: chip, label: verdict.badge, emphasis: .overall)
        }
      }
      Text(verbatim: verdict.headline)
        .font(AppTheme.Typography.title3.weight(.semibold))
        .foregroundStyle(AppTheme.Colors.onSurface)
      Text(verbatim: verdict.subhead)
        .font(AppTheme.Typography.subheadline)
        .foregroundStyle(AppTheme.Colors.onSurfaceVariant)
        .fixedSize(horizontal: false, vertical: true)
    }
  }
}
