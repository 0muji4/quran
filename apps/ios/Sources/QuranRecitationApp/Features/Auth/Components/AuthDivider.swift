import SwiftUI

/// Hairline rule with a centered uppercase label — "OR" on sign-in,
/// "OR WITH EMAIL" on sign-up. Mirrors the web `Divider` component.
struct AuthDivider: View {
  let label: LocalizedStringKey

  var body: some View {
    HStack(spacing: Spacing.md) {
      line
      Text(label, bundle: .module)
        .font(Font.brand.eyebrow)
        .foregroundColor(Color.brand.textSecondary)
        .textCase(.uppercase)
        .fixedSize()
      line
    }
  }

  private var line: some View {
    Rectangle()
      .fill(Color.brand.textSecondary.opacity(0.25))
      .frame(height: 1)
  }
}
