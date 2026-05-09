import SwiftUI

/// White card containing the Arabic ayah text and an "AYAH N — SURAH"
/// eyebrow label, mirroring the centerpiece of
/// `docs/design/iOS _ Practice _ recording.png`.
struct AyahCard: View {
  let surahNameEn: String
  let ayahNumber: Int
  let textAr: String

  var body: some View {
    BrandCard {
      VStack(spacing: Spacing.lg) {
        Text(eyebrow)
          .font(Font.brand.eyebrow)
          .foregroundColor(Color.brand.textSecondary)
          .textCase(.uppercase)
        Text(textAr)
          .font(Font.brand.arabicAyah)
          .foregroundColor(Color.brand.textPrimary)
          .multilineTextAlignment(.trailing)
          .environment(\.layoutDirection, .rightToLeft)
          .lineSpacing(8)
          .padding(.horizontal, Spacing.sm)
      }
      .frame(maxWidth: .infinity)
    }
  }

  private var eyebrow: String {
    "AYAH \(ayahNumber) — \(surahNameEn.uppercased())"
  }
}
