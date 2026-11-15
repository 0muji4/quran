import SwiftUI

/// The ayah to recite: its number in the ornament ring, the Arabic text, and
/// the transliteration and translation when the ayah has them. An ayah longer
/// than `longAyahLength` characters, such as 2:255, uses the smaller Quran
/// style.
struct AyahCard: View {
  let ayah: AyahDetail

  /// Above this many characters (diacritics included), an ayah takes the long
  /// Quran style. In the snapshot tests' text, 1:2 has 37 and 2:255 has 422.
  static let longAyahLength = 120

  var body: some View {
    AppCard(alignment: .center) {
      AppAyahNumber(
        number: ayah.ayahNumber,
        accessibilityLabel: Text("practice.ayah.a11y \(ayah.ayahNumber)", bundle: .module))
      AppAyahText(text: ayah.textAr, long: ayah.textAr.count > Self.longAyahLength)
      AppAyahGloss(transliteration: ayah.transliteration, translation: ayah.textEn)
    }
  }
}
