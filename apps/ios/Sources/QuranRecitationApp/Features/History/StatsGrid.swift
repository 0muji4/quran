import SwiftUI

/// The four totals above the History list: this week's attempts, the average
/// score, the best score with its surah, and the day streak, as tiles in a
/// 2×2 grid. The average is the emphasised one, its value in the primary
/// colour. The totals always cover every attempt, whatever the list's filter.
struct StatsGrid: View {
  let stats: HistoryStats

  var body: some View {
    LazyVGrid(
      columns: [GridItem(.flexible(), spacing: 10), GridItem(.flexible(), spacing: 10)],
      spacing: 10
    ) {
      tile("history.stats.thisWeek", value: "\(stats.thisWeekCount)", unit: Text("history.stats.attempts", bundle: .module))
      tile(
        "history.stats.average",
        value: stats.averageScore.map { "\(Int($0.rounded()))" } ?? "—",
        unit: Text("history.stats.outOf", bundle: .module),
        emphasis: true
      )
      tile(
        "history.stats.best",
        value: stats.bestScore.map { "\($0)" } ?? "—",
        unit: stats.bestSurah.map { Text(verbatim: $0) } ?? Text("history.stats.bestUnknown", bundle: .module)
      )
      tile("history.stats.streak", value: "\(stats.streakDays)", unit: Text("history.stats.days", bundle: .module))
    }
  }

  private func tile(
    _ title: LocalizedStringKey, value: String, unit: Text, emphasis: Bool = false
  ) -> some View {
    VStack(alignment: .leading, spacing: 2) {
      Text(title, bundle: .module)
        .font(AppTheme.Typography.footnote.weight(.medium))
        .foregroundStyle(AppTheme.Colors.onSurfaceVariant)
      Text(verbatim: value)
        .font(AppTheme.Typography.title.weight(.bold).monospacedDigit())
        .foregroundStyle(emphasis ? AppTheme.Colors.primary : AppTheme.Colors.onSurface)
      unit
        .font(AppTheme.Typography.footnote)
        .foregroundStyle(AppTheme.Colors.onSurfaceVariant)
        .lineLimit(1)
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .padding(.vertical, 14)
    .padding(.horizontal, AppTheme.Spacing.space4)
    .background(
      AppTheme.Colors.surfaceContainer,
      in: RoundedRectangle(cornerRadius: AppTheme.Shape.large, style: .continuous)
    )
    .accessibilityElement(children: .combine)
  }
}

/// Pure-function-friendly aggregate over an attempt history. Lives on
/// its own so unit tests can assert on the math without standing up a
/// HistoryStore.
struct HistoryStats: Equatable {
  let thisWeekCount: Int
  let averageScore: Double?
  let bestScore: Int?
  let bestSurah: String?
  let streakDays: Int

  static func compute(from attempts: [Attempt], now: Date = Date()) -> HistoryStats {
    let calendar = Calendar.current
    let weekStart = calendar.date(byAdding: .day, value: -7, to: now) ?? now
    let week = attempts.filter { $0.createdAt >= weekStart }

    let scoredAttempts = attempts.compactMap { $0.score }
    let avg: Double? = scoredAttempts.isEmpty ? nil
      : Double(scoredAttempts.reduce(0, +)) / Double(scoredAttempts.count)

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
