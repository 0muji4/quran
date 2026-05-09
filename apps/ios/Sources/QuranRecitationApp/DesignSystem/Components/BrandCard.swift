import SwiftUI

/// Rounded card surface used for ayah cards, library rows, and result
/// panels. Default style is cream-on-cream with a subtle shadow;
/// `.inverse` flips to the dark variant used for the Continue card and
/// Recording panel.
struct BrandCard<Content: View>: View {
  enum Style {
    case standard
    case inverse
  }

  private let style: Style
  private let content: Content

  init(style: Style = .standard, @ViewBuilder content: () -> Content) {
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
