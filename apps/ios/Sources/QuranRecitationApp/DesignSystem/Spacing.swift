import CoreGraphics

/// Layout spacing scale derived from `docs/design/iOS *.png`. Use these
/// instead of hard-coded floats so a future scale tweak is one edit.
enum Spacing {
  static let xs: CGFloat = 4
  static let sm: CGFloat = 8
  static let md: CGFloat = 12
  static let lg: CGFloat = 16
  static let xl: CGFloat = 24
  static let xxl: CGFloat = 32

  /// Standard horizontal inset for screen content.
  static let screenHorizontal: CGFloat = 16

  /// Default corner radius for cards and tiles.
  static let cardCornerRadius: CGFloat = 16

  /// Minimum tap target per WCAG 2.5.5 (44 × 44 pt).
  static let minTapTarget: CGFloat = 44
}
