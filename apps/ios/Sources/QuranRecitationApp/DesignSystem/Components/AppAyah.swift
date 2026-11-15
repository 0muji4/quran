import SwiftUI

/// `number` in Arabic-Indic digits (٠ to ٩), whatever the device locale.
func arabicIndicDigits(_ number: Int) -> String {
  String(
    String(number).unicodeScalars.map { scalar -> Character in
      guard let digit = Int(String(scalar)), ("0"..."9").contains(scalar) else {
        return Character(scalar)
      }
      return Character(UnicodeScalar(0x0660 + UInt32(digit))!)
    })
}

/// An ayah number in Arabic-Indic digits inside an ornament ring, 40pt tall
/// at the default text size and wider for three digits. `accessibilityLabel`,
/// such as "Ayah 255", replaces the digits for VoiceOver.
struct AppAyahNumber: View {
  let number: Int
  let accessibilityLabel: Text

  /// Scales with the ayah number's font. The ring's height is fixed to it,
  /// because Amiri's line height is taller than its digits and would
  /// otherwise stretch a one-digit ring into an oval.
  @ScaledMetric(relativeTo: .body) private var diameter: CGFloat = 40

  var body: some View {
    Text(verbatim: arabicIndicDigits(number))
      .font(AppTheme.Typography.ayahNumber)
      .foregroundStyle(AppTheme.Colors.onSurface)
      .padding(.horizontal, AppTheme.Spacing.space2)
      .frame(minWidth: diameter, minHeight: diameter, maxHeight: diameter)
      .overlay(Capsule().strokeBorder(AppTheme.Colors.ornament, lineWidth: 1.5))
      .accessibilityElement(children: .ignore)
      .accessibilityLabel(accessibilityLabel)
  }
}

/// The Arabic text of an ayah, centred and right to left whatever the UI
/// direction. Set `long` for an ayah too long for the regular size, such as
/// 2:255.
struct AppAyahText: View {
  let text: String
  var long = false

  var body: some View {
    Text(verbatim: text)
      .font(long ? AppTheme.Typography.ayahLong : AppTheme.Typography.ayah)
      .foregroundStyle(AppTheme.Colors.onSurface)
      .multilineTextAlignment(.center)
      .frame(maxWidth: .infinity)
      .environment(\.layoutDirection, .rightToLeft)
  }
}

/// The transliteration, in italics, and the translation of an ayah, centred.
/// Either may be missing, as not every ayah has both.
struct AppAyahGloss: View {
  let transliteration: String?
  let translation: String?

  var body: some View {
    VStack(spacing: AppTheme.Spacing.space1) {
      if let transliteration {
        Text(verbatim: transliteration).italic()
      }
      if let translation {
        Text(verbatim: translation)
      }
    }
    .font(AppTheme.Typography.subheadline)
    .foregroundStyle(AppTheme.Colors.onSurfaceVariant)
    .multilineTextAlignment(.center)
    .frame(maxWidth: .infinity)
  }
}

/// A short ayah with its gloss and a long ayah, for `#Preview` and the snapshot tests.
struct AppAyahSpecimen: View {
  init() {
    AppTheme.registerFonts()
  }

  var body: some View {
    AppCard(alignment: .center) {
      AppAyahNumber(number: 1, accessibilityLabel: Text(verbatim: "Ayah 1"))
      AppAyahText(text: "بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ")
      AppAyahGloss(
        transliteration: "Bismillāhi r-raḥmāni r-raḥīm",
        translation: "In the name of God, the Most Gracious, the Most Merciful.")
    }
    AppCard(alignment: .center) {
      AppAyahNumber(number: 255, accessibilityLabel: Text(verbatim: "Ayah 255"))
      AppAyahText(
        text: "ٱللَّهُ لَآ إِلَٰهَ إِلَّا هُوَ ٱلۡحَيُّ ٱلۡقَيُّومُۚ لَا تَأۡخُذُهُۥ سِنَةٞ وَلَا نَوۡمٞۚ "
          + "لَّهُۥ مَا فِي ٱلسَّمَٰوَٰتِ وَمَا فِي ٱلۡأَرۡضِۗ",
        long: true)
    }
  }
}

#Preview("Light") {
  AppSpecimenSurface { AppAyahSpecimen() }
}

#Preview("Dark") {
  AppSpecimenSurface { AppAyahSpecimen() }
    .preferredColorScheme(.dark)
}
