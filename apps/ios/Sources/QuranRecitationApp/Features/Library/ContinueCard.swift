import SwiftUI

/// The card at the top of the Library that resumes the last session: the
/// surah in English and Arabic, how far into it the user got and when, and a
/// button to resume at that ayah.
struct ContinueCard: View {
  let entry: LastPracticed
  let onResume: (LastPracticed) -> Void

  var body: some View {
    AppCard {
      LibraryCardEyebrow(symbol: "bookmark.fill", label: "library.continueEyebrow")
      HStack(alignment: .firstTextBaseline, spacing: AppTheme.Spacing.space2) {
        Text(verbatim: entry.surahNameEn)
          .font(AppTheme.Typography.title3.weight(.semibold))
          .foregroundStyle(AppTheme.Colors.onSurface)
        Spacer(minLength: 0)
        SurahNameArabic(name: entry.surahNameAr)
      }
      Text(
        "library.continueProgress \(entry.ayahNumber) \(entry.ayahCount) \(relativeLastPracticed(entry.practicedAt))",
        bundle: .module
      )
      .font(AppTheme.Typography.subheadline)
      .foregroundStyle(AppTheme.Colors.onSurfaceVariant)
      ProgressView(value: Self.fraction(entry))
        .padding(.vertical, AppTheme.Spacing.space1)
        .accessibilityHidden(true)
      LibraryCardAction(label: "library.resumeAyah \(entry.ayahNumber)") { onResume(entry) }
    }
  }

  static func fraction(_ entry: LastPracticed) -> Double {
    guard entry.ayahCount > 0 else { return 0 }
    return min(1, max(0, Double(entry.ayahNumber) / Double(entry.ayahCount)))
  }
}

/// The same card for a user with no session yet: an invitation to start, with
/// a button that opens the first surah at ayah 1.
struct GetStartedCard: View {
  let onStart: () -> Void

  var body: some View {
    AppCard {
      LibraryCardEyebrow(symbol: "star.fill", label: "library.getStartedEyebrow")
      Text("library.getStartedTitle", bundle: .module)
        .font(AppTheme.Typography.title3.weight(.semibold))
        .foregroundStyle(AppTheme.Colors.onSurface)
      Text("library.getStartedBody", bundle: .module)
        .font(AppTheme.Typography.subheadline)
        .foregroundStyle(AppTheme.Colors.onSurfaceVariant)
        .fixedSize(horizontal: false, vertical: true)
      LibraryCardAction(label: "library.getStartedCta", action: onStart)
    }
  }
}

/// A small primary label with a symbol, above the card's title. An `HStack`
/// rather than a `Label`: inside a list row a `Label` lays its icon out in the
/// row's icon column, which is wider than this small symbol needs.
private struct LibraryCardEyebrow: View {
  let symbol: String
  let label: LocalizedStringKey

  var body: some View {
    HStack(spacing: AppTheme.Spacing.space1) {
      Image(systemName: symbol)
        .accessibilityHidden(true)
      Text(label, bundle: .module)
    }
    .font(AppTheme.Typography.footnote.weight(.semibold))
    .foregroundStyle(AppTheme.Colors.primary)
  }
}

/// The card's main action with a forward arrow, at the card's trailing edge.
private struct LibraryCardAction: View {
  let label: LocalizedStringKey
  let action: () -> Void

  var body: some View {
    HStack {
      Spacer(minLength: 0)
      Button(action: action) {
        HStack(spacing: AppTheme.Spacing.space2) {
          Text(label, bundle: .module)
          Image(systemName: "arrow.forward")
        }
      }
      .buttonStyle(.appProminent)
    }
  }
}

/// When the user last practised: "today", "yesterday", or the month and day,
/// counted in calendar days in the user's time zone.
func relativeLastPracticed(_ date: Date, now: Date = Date(), calendar: Calendar = .current) -> String {
  let days = calendar.dateComponents(
    [.day], from: calendar.startOfDay(for: date), to: calendar.startOfDay(for: now)
  ).day ?? 0
  switch days {
  case 0: return NSLocalizedString("library.lastPracticed.today", bundle: .module, comment: "")
  case 1: return NSLocalizedString("library.lastPracticed.yesterday", bundle: .module, comment: "")
  default: return date.formatted(.dateTime.month(.abbreviated).day())
  }
}
