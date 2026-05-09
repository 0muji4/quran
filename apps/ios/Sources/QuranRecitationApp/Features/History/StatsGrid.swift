import SwiftUI

/// 2×2 grid of summary statistics shown above the History list.
/// Mirrors `docs/design/iOS _ History.png`: This Week, Average, Best,
/// Streak. The Average tile uses the inverse (dark) BrandCard variant
/// to match the design's emphasis treatment.
struct StatsGrid: View {
  let stats: HistoryStats

  var body: some View {
    LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: Spacing.md) {
      tile(
        eyebrow: "history.stats.thisWeek",
        big: "\(stats.thisWeekCount)",
        small: "history.stats.attempts",
        style: .standard
      )
      tile(
        eyebrow: "history.stats.average",
        big: stats.averageScore.map { "\(Int($0))" } ?? "—",
        small: "history.stats.outOf",
        style: .inverse
      )
      tile(
        eyebrow: "history.stats.best",
        big: stats.bestScore.map { "\(Int($0))" } ?? "—",
        small: stats.bestSurah.map { LocalizedStringKey($0) } ?? "history.stats.bestUnknown",
        style: .standard
      )
      tile(
        eyebrow: "history.stats.streak",
        big: "\(stats.streakDays)",
        small: "history.stats.days",
        style: .standard
      )
    }
    .padding(.horizontal, Spacing.screenHorizontal)
  }

  private func tile(
    eyebrow: LocalizedStringKey,
    big: String,
    small: LocalizedStringKey,
    style: BrandCardStyle
  ) -> some View {
    BrandCard(style: style) {
      VStack(alignment: .leading, spacing: Spacing.xs) {
        Text(eyebrow, bundle: .module)
          .font(Font.brand.eyebrow)
          .foregroundColor(textOnStyle(style, secondary: true))
          .textCase(.uppercase)
        Text(big)
          .font(Font.brand.scoreDisplay)
          .foregroundColor(textOnStyle(style, secondary: false))
        Text(small, bundle: .module)
          .font(Font.brand.caption)
          .foregroundColor(textOnStyle(style, secondary: true))
      }
    }
  }

  private func textOnStyle(_ style: BrandCardStyle, secondary: Bool) -> Color {
    switch style {
    case .standard:
      return secondary ? Color.brand.textSecondary : Color.brand.textPrimary
    case .inverse:
      return secondary
        ? Color.brand.textOnInverse.opacity(0.65)
        : Color.brand.accent
    }
  }
}

/// Pure-function-friendly aggregate over an attempt history. Lives on
/// its own so unit tests can assert on the math without standing up a
/// HistoryStore.
struct HistoryStats: Equatable {
  let thisWeekCount: Int
  let averageScore: Double?
  let bestScore: Double?
  let bestSurah: String?
  let streakDays: Int

  static func compute(from attempts: [Attempt], now: Date = Date()) -> HistoryStats {
    let calendar = Calendar.current
    let weekStart = calendar.date(byAdding: .day, value: -7, to: now) ?? now
    let week = attempts.filter { $0.createdAt >= weekStart }

    let scoredAttempts = attempts.compactMap { $0.score }
    let avg: Double? = scoredAttempts.isEmpty ? nil
      : scoredAttempts.reduce(0, +) / Double(scoredAttempts.count)

    let best = attempts
      .compactMap { attempt in attempt.score.map { (score: $0, surah: attempt.surahNameEn) } }
      .max(by: { $0.score < $1.score })

    let streak = computeStreak(attempts: attempts, calendar: calendar, now: now)

    return HistoryStats(
      thisWeekCount: week.count,
      averageScore: avg,
      bestScore: best?.score,
      bestSurah: best?.surah,
      streakDays: streak
    )
  }

  private static func computeStreak(attempts: [Attempt], calendar: Calendar, now: Date) -> Int {
    let practicedDays = Set(attempts.map { calendar.startOfDay(for: $0.createdAt) })
    var streak = 0
    var cursor = calendar.startOfDay(for: now)
    while practicedDays.contains(cursor) {
      streak += 1
      cursor = calendar.date(byAdding: .day, value: -1, to: cursor) ?? cursor
    }
    return streak
  }
}
