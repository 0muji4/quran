import SwiftUI

/// One row of the History list. Mirrors the design's flat row treatment
/// — tan index circle, surah name + ayah, relative date, score on the
/// right.
struct AttemptRow: View {
  let attempt: Attempt

  private static let relativeFormatter: RelativeDateTimeFormatter = {
    let formatter = RelativeDateTimeFormatter()
    formatter.unitsStyle = .short
    return formatter
  }()

  var body: some View {
    HStack(spacing: Spacing.md) {
      Text("\(attempt.ayahNumber)")
        .font(Font.brand.caption.weight(.semibold))
        .foregroundColor(Color.brand.textSecondary)
        .frame(width: 28, height: 28)
        .background(Color.brand.tile)
        .clipShape(Circle())
      VStack(alignment: .leading, spacing: 2) {
        Text("\(attempt.surahNameEn) · ayah \(attempt.ayahNumber)")
          .font(Font.brand.body.weight(.semibold))
          .foregroundColor(Color.brand.textPrimary)
        Text(Self.relativeFormatter.localizedString(for: attempt.createdAt, relativeTo: .now))
          .font(Font.brand.caption)
          .foregroundColor(Color.brand.textSecondary)
      }
      Spacer()
      scoreLabel
    }
    .padding(.vertical, Spacing.sm)
    .padding(.horizontal, Spacing.md)
    .background(Color.brand.card)
    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
  }

  @ViewBuilder
  private var scoreLabel: some View {
    if let score = attempt.score {
      HStack(spacing: 0) {
        Text("\(Int(score))")
          .font(Font.brand.body.weight(.bold))
          .foregroundColor(Color.brand.textPrimary)
        Text("/100")
          .font(Font.brand.caption)
          .foregroundColor(Color.brand.textSecondary)
      }
      .monospacedDigit()
    } else {
      Text("—")
        .font(Font.brand.body)
        .foregroundColor(Color.brand.textSecondary)
    }
  }
}
