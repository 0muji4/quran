import SwiftUI

/// One surah in the Library list: its number, its English name with the
/// revelation place, ayah count and best score under it, its Arabic name and
/// a disclosure chevron. The surah the user left off at (`resume`) carries a
/// bookmark.
struct SurahRow: View {
  let surah: SurahSummary
  let bestScore: Int?
  var resume: Bool = false

  var body: some View {
    HStack(spacing: AppTheme.Spacing.space3) {
      Text(verbatim: "\(surah.id)")
        .font(AppTheme.Typography.footnote.weight(.semibold).monospacedDigit())
        .foregroundStyle(AppTheme.Colors.primary)
        .frame(width: 32, height: 32)
        .background(AppTheme.Colors.primary.opacity(0.14), in: Circle())
        .accessibilityHidden(true)
      VStack(alignment: .leading, spacing: 2) {
        HStack(spacing: 6) {
          Text(verbatim: surah.nameEn)
            .font(AppTheme.Typography.body)
            .foregroundStyle(AppTheme.Colors.onSurface)
          if resume {
            Image(systemName: "bookmark.fill")
              .font(AppTheme.Typography.caption)
              .foregroundStyle(AppTheme.Colors.primary)
              .accessibilityLabel(Text("library.resumeA11y", bundle: .module))
          }
        }
        metadata
          .font(AppTheme.Typography.footnote)
          .foregroundStyle(AppTheme.Colors.onSurfaceVariant)
      }
      Spacer(minLength: AppTheme.Spacing.space2)
      SurahNameArabic(name: surah.nameAr)
      Image(systemName: "chevron.forward")
        .font(AppTheme.Typography.footnote.weight(.semibold))
        .foregroundStyle(AppTheme.Colors.outline)
        .accessibilityHidden(true)
    }
    .contentShape(Rectangle())
    .accessibilityElement(children: .combine)
    .accessibilityHint(Text("library.surah.a11yHint", bundle: .module))
    .accessibilityAddTraits(.isButton)
  }

  private var metadata: Text {
    if let bestScore {
      return Text(
        "library.surah.metaBest \(surah.revelationPlace) \(surah.ayahCount) \(bestScore)", bundle: .module)
    }
    return Text("library.surah.meta \(surah.revelationPlace) \(surah.ayahCount)", bundle: .module)
  }
}

/// A surah's Arabic name in Amiri, right to left whatever the interface direction.
struct SurahNameArabic: View {
  let name: String

  var body: some View {
    Text(verbatim: name)
      .font(Self.font)
      .foregroundStyle(AppTheme.Colors.onSurface)
      .environment(\.layoutDirection, .rightToLeft)
  }

  /// Large enough for Amiri's marks to read beside a row's text.
  private static let font = Font.custom(AppTheme.Typography.quranFontName, size: 22, relativeTo: .body)
}
