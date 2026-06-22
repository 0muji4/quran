import SwiftUI

/// One row of the History list: a tan index circle, surah name + ayah, a
/// relative date, and a score-coloured "NN/100" on the right. The row
/// carries no surface of its own — `HistoryView` groups the rows into a
/// single divider-separated card.
struct AttemptRow: View {
  let attempt: Attempt

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
        Text(Self.relativeText(for: attempt.createdAt))
          .font(Font.brand.caption)
          .foregroundColor(Color.brand.textSecondary)
      }
      Spacer()
      scoreLabel
    }
    .padding(.vertical, Spacing.sm)
  }

  @ViewBuilder
  private var scoreLabel: some View {
    if let score = attempt.score {
      HStack(spacing: 0) {
        Text("\(Int(score))")
          .font(.system(size: 19, weight: .bold, design: .serif))
          .foregroundColor(Self.scoreColor(Int(score)))
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

  // MARK: - Score banding

  /// Colour bands shared with the web History list: ≥ 80 reads as a
  /// strong attempt (green), 60–79 is mid (amber), below 60 is a fail
  /// (coral). Pure so the thresholds are unit-testable.
  static func scoreColor(_ score: Int) -> Color {
    if score >= 80 { return Color.brand.success }
    if score >= 60 { return Color.brand.accent }
    return Color.brand.recording
  }

  // MARK: - Relative date

  /// "Today · 14:02" for same-day attempts, "Yesterday" for the prior
  /// day, and a "MMM d" date otherwise — the History list trades the
  /// generic "2 hr ago" for the day-anchored labels in the design.
  static func relativeText(
    for date: Date,
    now: Date = Date(),
    calendar: Calendar = .current
  ) -> String {
    if calendar.isDate(date, inSameDayAs: now) {
      let template = Bundle.module.localizedString(
        forKey: "history.relative.today", value: "Today · %@", table: nil
      )
      return String(format: template, timeFormatter.string(from: date))
    }
    if let yesterday = calendar.date(byAdding: .day, value: -1, to: now),
      calendar.isDate(date, inSameDayAs: yesterday) {
      return Bundle.module.localizedString(
        forKey: "history.relative.yesterday", value: "Yesterday", table: nil
      )
    }
    return monthDayFormatter.string(from: date)
  }

  private static let timeFormatter: DateFormatter = {
    let formatter = DateFormatter()
    formatter.locale = .current
    formatter.setLocalizedDateFormatFromTemplate("jmm")
    return formatter
  }()

  private static let monthDayFormatter: DateFormatter = {
    let formatter = DateFormatter()
    formatter.locale = .current
    formatter.setLocalizedDateFormatFromTemplate("MMMd")
    return formatter
  }()
}
