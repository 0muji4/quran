import SwiftUI

/// Pill-shaped primary action button. Used for "Resume ayah",
/// "Continue to ayah", "Record again", and similar calls-to-action.
/// Ensures WCAG-compliant tap height via `Spacing.minTapTarget`.
struct PrimaryButtonStyle: ButtonStyle {
  enum Tint {
    case primary
    case accent
  }

  var tint: Tint = .primary

  func makeBody(configuration: Configuration) -> some View {
    configuration.label
      .font(Font.brand.body.weight(.semibold))
      .foregroundColor(Color.brand.textOnPrimary)
      .frame(minHeight: Spacing.minTapTarget)
      .frame(maxWidth: .infinity)
      .padding(.horizontal, Spacing.lg)
      .background(background(pressed: configuration.isPressed))
      .clipShape(Capsule())
      .opacity(configuration.isPressed ? 0.92 : 1.0)
      .animation(.easeOut(duration: 0.12), value: configuration.isPressed)
  }

  private func background(pressed: Bool) -> Color {
    let base: Color = (tint == .primary) ? .brand.primary : .brand.accent
    return pressed ? base.opacity(0.85) : base
  }
}

extension ButtonStyle where Self == PrimaryButtonStyle {
  static var brandPrimary: PrimaryButtonStyle { PrimaryButtonStyle(tint: .primary) }
  static var brandAccent: PrimaryButtonStyle { PrimaryButtonStyle(tint: .accent) }
}
