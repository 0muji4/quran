import SwiftUI

/// Circular back chevron shown at the top-left of the sign-in and
/// sign-up screens. Both screens are pushed onto the Profile tab's
/// `NavigationStack` with the system bar hidden, so this is the
/// explicit way back to the profile content. Matches the chevron in
/// `docs/design/iOS _ Sign up`.
struct AuthBackButton: View {
  let action: () -> Void

  var body: some View {
    Button(action: action) {
      Image(systemName: "chevron.left")
        .font(.system(size: 15, weight: .semibold))
        .foregroundColor(Color.brand.textPrimary)
        .frame(width: 36, height: 36)
        .background(Color.brand.card)
        .clipShape(Circle())
        .overlay(
          Circle().stroke(Color.brand.textSecondary.opacity(0.18), lineWidth: 1)
        )
    }
    .buttonStyle(.plain)
    .accessibilityLabel(Text("auth.back.a11y", bundle: .module))
  }
}
