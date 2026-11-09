import CoreText
import SwiftUI

/// Layer 5 of the design system (ADR 0026): the entry point between the
/// generated tokens in `DesignSystem/Generated/` and SwiftUI. This is the
/// only source file outside that directory that names a generated type;
/// components and views read colours, spacing, corner radii and type
/// through `AppTheme`.
///
/// - `AppTheme.Colors`: the Material 3 colour roles plus the roles Material 3
///   has no slot for (recording, verdicts, ornament). Each colour resolves
///   to its light or dark value from the current trait collection, so views
///   need no colour-scheme handling of their own.
/// - `AppTheme.Spacing`: spacing steps on a 4pt grid (`space4` is 16pt).
/// - `AppTheme.Shape`: corner radii on the Material 3 shape scale. Pill
///   shapes use `Capsule`.
/// - `AppTheme.Typography`: Apple's text styles and the Quran text styles
///   (ADR 0028).
enum AppTheme {
  typealias Colors = TokenColor
  typealias Spacing = TokenSpacing
  typealias Shape = TokenShape

  /// The iOS type scale is Apple's text styles. Quran text uses the bundled
  /// Amiri subset and scales with Dynamic Type by the factor of `body`, the
  /// style for reading text. Call `registerFonts()` before the first view
  /// uses it.
  enum Typography {
    static let largeTitle = Font.largeTitle
    static let title = Font.title
    static let title2 = Font.title2
    static let title3 = Font.title3
    static let headline = Font.headline
    static let subheadline = Font.subheadline
    static let body = Font.body
    static let callout = Font.callout
    static let footnote = Font.footnote
    static let caption = Font.caption
    static let caption2 = Font.caption2

    static let ayah = Font.custom(quranFontName, size: 34, relativeTo: .body)
    /// An ayah too long for `ayah`, such as 2:255.
    static let ayahLong = Font.custom(quranFontName, size: 28, relativeTo: .body)
    static let ayahNumber = Font.custom(quranFontName, size: 20, relativeTo: .body)

    /// The subset's PostScript name, which `Font.custom` looks it up by.
    static let quranFontName = "TilawahAmiriQuranSubset-Regular"
  }

  /// Registers the bundled Amiri subset with the process. The app is a Swift
  /// package with no `Info.plist` font list, so the font is registered from
  /// `Bundle.module`. Safe to call more than once.
  static func registerFonts() {
    _ = fontRegistration
  }

  private static let fontRegistration: Void = {
    // `.process("Resources")` copies `Resources/Fonts/` to the bundle's top level.
    guard let url = Bundle.module.url(forResource: Typography.quranFontName, withExtension: "ttf")
    else {
      assertionFailure("\(Typography.quranFontName).ttf is missing from the bundle")
      return
    }
    var error: Unmanaged<CFError>?
    if !CTFontManagerRegisterFontsForURL(url as CFURL, .process, &error) {
      assertionFailure("Registering \(url.lastPathComponent) failed: \(String(describing: error?.takeRetainedValue()))")
    }
  }()
}
