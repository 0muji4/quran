/// Layer 5 of the design system (ADR 0026): the entry point between the
/// generated tokens in `DesignSystem/Generated/` and SwiftUI. This is the
/// only source file outside that directory that names a generated type;
/// components and views read colours, spacing and corner radii through
/// `AppTheme`.
///
/// - `AppTheme.Colors`: the Material 3 colour roles plus the roles Material 3
///   has no slot for (recording, verdicts, ornament). Each colour resolves
///   to its light or dark value from the current trait collection, so views
///   need no colour-scheme handling of their own.
/// - `AppTheme.Spacing`: spacing steps on a 4pt grid (`space4` is 16pt).
/// - `AppTheme.Shape`: corner radii on the Material 3 shape scale. Pill
///   shapes use `Capsule`.
///
/// Typography stays with the system text styles, because the type scale is
/// decided per platform rather than shared as tokens.
enum AppTheme {
  typealias Colors = TokenColor
  typealias Spacing = TokenSpacing
  typealias Shape = TokenShape
}
