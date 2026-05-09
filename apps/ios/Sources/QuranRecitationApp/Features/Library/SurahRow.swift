import SwiftUI

/// One row in the Library list. Mirrors the row treatment in
/// `docs/design/iOS _ Surah library.png` — small index circle, English
/// name + revelation place / ayah count metadata, Arabic name on the
/// trailing side. Tapping the row opens the Practice tab in PR 11.
struct SurahRow: View {
  let index: Int
  let surah: SurahSummary
  let bestScore: Int?

  var body: some View {
    HStack(alignment: .center, spacing: Spacing.md) {
      indexBadge
      VStack(alignment: .leading, spacing: 2) {
        Text(surah.nameEn)
          .font(Font.brand.body.weight(.semibold))
          .foregroundColor(Color.brand.textPrimary)
        Text(metadata)
          .font(Font.brand.caption)
          .foregroundColor(Color.brand.textSecondary)
      }
      Spacer(minLength: Spacing.md)
      Text(surah.nameAr)
        .font(Font.brand.arabicAyah.weight(.regular))
        .foregroundColor(Color.brand.textPrimary)
        .environment(\.layoutDirection, .rightToLeft)
    }
    .padding(.vertical, Spacing.md)
    .padding(.horizontal, Spacing.lg)
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(Color.brand.card)
    .clipShape(RoundedRectangle(cornerRadius: Spacing.cardCornerRadius, style: .continuous))
    .accessibilityElement(children: .combine)
    .accessibilityLabel(accessibilityLabel)
    .accessibilityHint(Text("library.surah.a11yHint", bundle: .module))
    .accessibilityAddTraits(.isButton)
  }

  private var accessibilityLabel: Text {
    if let bestScore {
      return Text("Surah \(surah.nameEn), \(surah.revelationPlace), \(surah.ayahCount) ayahs, best score \(bestScore)")
    }
    return Text("Surah \(surah.nameEn), \(surah.revelationPlace), \(surah.ayahCount) ayahs")
  }

  private var indexBadge: some View {
    Text("\(index)")
      .font(Font.brand.caption.weight(.semibold))
      .foregroundColor(Color.brand.textSecondary)
      .frame(width: 28, height: 28)
      .background(Color.brand.tile)
      .clipShape(Circle())
  }

  private var metadata: String {
    if let bestScore {
      return "\(surah.revelationPlace) · \(surah.ayahCount) ayahs · best \(bestScore)"
    } else {
      return "\(surah.revelationPlace) · \(surah.ayahCount) ayahs"
    }
  }
}
