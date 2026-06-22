import SwiftUI

/// Gradient circle avatar showing the user's initial — the olive→emerald
/// disc used on the Profile header and Edit-profile sheet. Optionally
/// overlays a faint compass ✦ behind the initial (the Edit-profile
/// treatment). Decorative, so it's hidden from VoiceOver; the
/// surrounding name carries the meaning.
struct BrandAvatar: View {
  let initial: String
  var size: CGFloat = 80
  var showsCompass = false

  var body: some View {
    Circle()
      .fill(
        RadialGradient(
          colors: [Color.brand.accent, Color.brand.primary],
          center: UnitPoint(x: 0.35, y: 0.3),
          startRadius: 4,
          endRadius: size
        )
      )
      .frame(width: size, height: size)
      .overlay {
        if showsCompass {
          Text(verbatim: "✦")
            .font(.system(size: size * 0.85, weight: .light))
            .foregroundColor(Color.brand.textOnInverse.opacity(0.3))
        }
      }
      .overlay {
        Text(initial)
          .font(.system(size: size * 0.36, design: .serif))
          .foregroundColor(Color.brand.textOnInverse)
      }
      .accessibilityHidden(true)
  }
}
