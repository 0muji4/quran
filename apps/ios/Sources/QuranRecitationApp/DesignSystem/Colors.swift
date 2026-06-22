import SwiftUI

/// Brand palette extracted from `docs/design/iOS *.png`. Hex values are
/// hand-picked from the mockups; if a shared token source (asset catalog,
/// JSON exported from Figma) is added later, this enum becomes the single
/// migration point. Dark mode is deferred — the design is light-only at
/// this stage. When dark mode is needed, swap each value to a dynamic
/// `Color(uiColor:)` initializer or move into an asset catalog.
extension Color {
  enum brand {}
}

extension Color.brand {
  /// Page background — warm cream.
  static let surface = Color(brandHex: 0xF5EFE2)

  /// Card surface on top of the page background.
  static let card = Color(brandHex: 0xFAF6EC)

  /// Inverted (dark) card surface, repointed from warm brown to forest
  /// green by the #462 design refresh. Cream `textOnInverse` stays WCAG
  /// AA on it.
  static let cardInverse = Color(brandHex: 0x0E3D2B)

  /// Primary action color (emerald).
  static let primary = Color(brandHex: 0x106840)

  /// Continue / accent (warm gold).
  static let accent = Color(brandHex: 0xC0894A)

  /// Recording state (coral).
  static let recording = Color(brandHex: 0xC75736)

  /// Success / completed state (forest green).
  static let success = Color(brandHex: 0x4F7C5C)

  /// Subtle tile fill on cream backgrounds (word-comparison tiles).
  static let tile = Color(brandHex: 0xEADBC5)

  /// Decorative star / divider gold.
  static let decorative = Color(brandHex: 0xB98B3D)

  /// Pure-white card surface.
  static let paper = Color(brandHex: 0xFFFFFF)

  /// Pale tan badge fill on cream surfaces.
  static let tanSoft = Color(brandHex: 0xF3EAD4)

  /// AA-safe gold ink on light surfaces.
  static let goldOnLight = Color(brandHex: 0x6E4F1E)

  /// Hairline border on light cards.
  static let border = Color(brandHex: 0xE5DCC9)

  // MARK: - Text

  static let textPrimary = Color(brandHex: 0x1A1311)
  static let textSecondary = Color(brandHex: 0x6B6258)
  static let textOnInverse = Color(brandHex: 0xF5EFE2)
  static let textOnPrimary = Color.white
}

private extension Color {
  init(brandHex hex: UInt32) {
    let r = Double((hex >> 16) & 0xFF) / 255.0
    let g = Double((hex >> 8) & 0xFF) / 255.0
    let b = Double(hex & 0xFF) / 255.0
    self.init(red: r, green: g, blue: b)
  }
}
