import SwiftUI

/// Personalised "Suggested for you" card shown on the Library tab when
/// the BFF's `/me/suggestions` endpoint (ADR 0015) returns a surah the
/// signed-in user has not just practised. Sits between Continue and
/// the chip filter, mirrors the web client's recommendation surface
/// (`apps/web/app/(app)/library/SuggestedCard.tsx`).
///
/// Resolves the suggested `surahId` against the already-loaded surah
/// list rather than fetching the surah separately — the Library view
/// always renders this AFTER the surah list is loaded, so the lookup
/// is free. If the id is not present (e.g. server returned an id the
/// client does not know about yet), the card renders nothing rather
/// than crash or show a placeholder.
struct SuggestedCard: View {
  let suggestion: SurahSuggestion
  let surahs: [SurahSummary]
  let onBegin: (SurahSummary) -> Void

  private var picked: SurahSummary? {
    surahs.first { $0.id == suggestion.surahId }
  }

  var body: some View {
    if let picked {
      BrandCard {
        VStack(alignment: .leading, spacing: Spacing.md) {
          Text("library.suggestedEyebrow", bundle: .module)
            .font(Font.brand.eyebrow)
            .foregroundColor(Color.brand.accent)
            .textCase(.uppercase)

          Text(picked.nameEn)
            .font(Font.brand.sectionTitle)
            .foregroundColor(Color.brand.textPrimary)

          Text(metaLabel(for: picked))
            .font(Font.brand.caption)
            .foregroundColor(Color.brand.textSecondary)

          Button {
            onBegin(picked)
          } label: {
            HStack(spacing: Spacing.xs) {
              Text("library.suggestedBegin", bundle: .module)
              Image(systemName: "arrow.right")
            }
          }
          .buttonStyle(.brandPrimary)
        }
      }
    }
  }

  private func metaLabel(for picked: SurahSummary) -> LocalizedStringKey {
    "library.suggestedMeta \(picked.ayahCount) \(picked.revelationPlace)"
  }
}
