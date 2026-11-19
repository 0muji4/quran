import SwiftUI

/// One attempt in the History list: the surah's number, the surah and ayah,
/// when it was recorded, and the score.
///
/// The score is an `AppVerdictChip` in the Result screen's bands
/// (`verdictForScore`), so a score reads the same on both screens. An attempt
/// still being scored shows a dash; one whose scoring failed says so.
struct AttemptRow: View {
  let attempt: Attempt
  var now: Date = Date()

  var body: some View {
    HStack(spacing: AppTheme.Spacing.space3) {
      Text(verbatim: attempt.surahId)
        .font(AppTheme.Typography.footnote.weight(.semibold).monospacedDigit())
        .foregroundStyle(AppTheme.Colors.primary)
        .frame(width: 32, height: 32)
        .background(AppTheme.Colors.primary.opacity(0.14), in: Circle())
        .accessibilityHidden(true)
      VStack(alignment: .leading, spacing: 2) {
        Text("history.attempt.title \(attempt.surahNameEn) \(attempt.ayahNumber)", bundle: .module)
          .font(AppTheme.Typography.body)
          .foregroundStyle(AppTheme.Colors.onSurface)
        Text(verbatim: Self.relativeText(for: attempt.createdAt, now: now))
          .font(AppTheme.Typography.footnote)
          .foregroundStyle(AppTheme.Colors.onSurfaceVariant)
      }
      Spacer(minLength: AppTheme.Spacing.space2)
      score
    }
    .accessibilityElement(children: .combine)
  }

  @ViewBuilder
  private var score: some View {
    if attempt.status == .failed {
      Text("history.attempt.failed", bundle: .module)
        .font(AppTheme.Typography.subheadline)
        .foregroundStyle(AppTheme.Colors.onSurfaceVariant)
    } else if let score = attempt.score, let verdict = Self.verdict(for: score) {
      AppVerdictChip(verdict: verdict, label: "\(score)")
    } else {
      Text(verbatim: "—")
        .font(AppTheme.Typography.body)
        .foregroundStyle(AppTheme.Colors.onSurfaceVariant)
        .accessibilityLabel(Text("history.notScored", bundle: .module))
    }
  }

  /// The Result screen's verdict for a score: 70 and up pass, 40 to 69 warn, below 40 fail.
  static func verdict(for score: Int) -> AppVerdict? {
    verdictForScore(score).verdict
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
