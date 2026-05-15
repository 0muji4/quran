import SwiftUI

/// Pill-shaped secondary action button: white fill with a hairline
/// border, used for the "Continue with Google / Apple" social buttons
/// on the auth screens. The counterpart to `PrimaryButtonStyle` —
/// same pill geometry and WCAG-compliant tap height, lower visual
/// weight. Pair with `.disabled(true)` for the deferred-OAuth
/// placeholders (see ADR 0010).
struct SecondaryButtonStyle: ButtonStyle {
  func makeBody(configuration: Configuration) -> some View {
    configuration.label
      .font(Font.brand.body.weight(.semibold))
      .foregroundColor(Color.brand.textPrimary)
      .frame(minHeight: Spacing.minTapTarget)
      .frame(maxWidth: .infinity)
      .padding(.horizontal, Spacing.lg)
      .background(Color.brand.card)
      .clipShape(Capsule())
      .overlay(
        Capsule().stroke(Color.brand.textSecondary.opacity(0.25), lineWidth: 1)
      )
      .opacity(configuration.isPressed ? 0.92 : 1.0)
      .animation(.easeOut(duration: 0.12), value: configuration.isPressed)
  }
}

extension ButtonStyle where Self == SecondaryButtonStyle {
  static var brandSecondary: SecondaryButtonStyle { SecondaryButtonStyle() }
}
