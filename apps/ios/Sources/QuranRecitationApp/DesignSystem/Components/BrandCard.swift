import SwiftUI

/// Visual style for `BrandCard`. Top-level enum so callers can pass
/// the value through helper functions without locking the generic
/// `Content` type to a specific witness.
enum BrandCardStyle {
  case standard
  case inverse
}

/// Rounded card surface used for ayah cards, library rows, and result
/// panels. Default style is cream-on-cream with a subtle shadow;
/// `.inverse` flips to the dark variant used for the Continue card and
/// Recording panel.
struct BrandCard<Content: View>: View {
  private let style: BrandCardStyle
  private let content: Content

  init(style: BrandCardStyle = .standard, @ViewBuilder content: () -> Content) {
    self.style = style
    self.content = content()
  }

  var body: some View {
    content
      .padding(Spacing.lg)
      .background(background)
      .clipShape(RoundedRectangle(cornerRadius: Spacing.cardCornerRadius, style: .continuous))
      .shadow(color: shadowColor, radius: 8, x: 0, y: 2)
  }

  private var background: Color {
    switch style {
    case .standard: return Color.brand.card
    case .inverse:  return Color.brand.cardInverse
    }
  }

  private var shadowColor: Color {
    switch style {
    case .standard: return Color.black.opacity(0.04)
    case .inverse:  return Color.black.opacity(0.12)
    }
  }
}
