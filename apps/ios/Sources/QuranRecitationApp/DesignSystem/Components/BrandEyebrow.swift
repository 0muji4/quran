import SwiftUI

/// Page/section "eyebrow": a gold ✦ glyph followed by an uppercase,
/// letter-spaced label. One component so the ornament and spacing don't
/// drift per call site. The glyph is decorative and hidden from
/// VoiceOver — only the label is announced.
struct BrandEyebrow: View {
  private let key: LocalizedStringKey
  private let tint: Color

  init(_ key: LocalizedStringKey, tint: Color = Color.brand.accent) {
    self.key = key
    self.tint = tint
  }

  var body: some View {
    HStack(spacing: Spacing.xs) {
      Text(verbatim: "✦")
        .accessibilityHidden(true)
      Text(key, bundle: .module)
        .textCase(.uppercase)
        .tracking(0.6)
    }
    .font(Font.brand.eyebrow)
    .foregroundColor(tint)
  }
}
