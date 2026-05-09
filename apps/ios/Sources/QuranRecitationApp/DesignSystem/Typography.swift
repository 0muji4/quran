import SwiftUI

/// Brand typography. Latin copy uses SF Pro (system); Arabic uses SF
/// Arabic, which iOS selects automatically when an Arabic codepoint is
/// rendered. Serif faces fall back to system serif if SF Serif (New
/// York) is unavailable. See ADR 0009 for the i18n contract.
extension Font {
  enum brand {}
}

extension Font.brand {
  /// Page-level serif title ("Choose a surah to recite").
  static let pageTitle = Font.system(.largeTitle, design: .serif).weight(.regular)

  /// Section title ("Word comparison", "Listen back").
  static let sectionTitle = Font.system(.title3).weight(.semibold)

  /// Eyebrow / overline label (e.g. "CONTINUE YOUR PRACTICE").
  static let eyebrow = Font.system(.caption).weight(.semibold)

  /// Body copy on cards and rows.
  static let body = Font.system(.body)

  /// Secondary / metadata copy.
  static let caption = Font.system(.subheadline)

  /// Arabic ayah text. iOS picks SF Arabic for Arabic codepoints.
  static let arabicAyah = Font.system(size: 32, design: .serif).weight(.regular)

  /// Score dial numerals on the Result hero.
  static let scoreDisplay = Font.system(size: 56, design: .serif).weight(.regular)
}
