import SwiftUI

/// Provider for the social sign-in buttons.
enum SocialProvider {
  case google
  case apple

  var titleKey: LocalizedStringKey {
    switch self {
    case .google: return "auth.social.google"
    case .apple:  return "auth.social.apple"
    }
  }
}

/// Full-width "Continue with Google / Apple" button: provider glyph
/// plus a centered label on the `.brandSecondary` white pill. Enabled
/// only when wired with an `action` (Google, once configured); Apple
/// stays disabled (deferred, ADR 0010).
struct SocialButton: View {
  let provider: SocialProvider
  var isEnabled: Bool = false
  var action: () -> Void = {}

  var body: some View {
    Button(action: action) {
      HStack(spacing: Spacing.sm) {
        glyph
          .frame(width: 20, height: 20)
        Text(provider.titleKey, bundle: .module)
      }
    }
    .buttonStyle(.brandSecondary)
    .disabled(!isEnabled)
    .opacity(isEnabled ? 1.0 : 0.55)
    .accessibilityHint(Text(isEnabled ? "" : "Coming soon"))
  }

  @ViewBuilder
  private var glyph: some View {
    switch provider {
    case .google:
      GoogleGlyph()
    case .apple:
      Image(systemName: "applelogo")
        .font(.system(size: 17))
        .foregroundColor(Color.brand.textPrimary)
    }
  }
}

/// The four-colour Google "G", drawn as stroked arcs plus the inner
/// bar. An approximation — good enough for a disabled placeholder, and
/// it keeps the package free of an asset catalog.
private struct GoogleGlyph: View {
  private static let blue = Color(red: 0.259, green: 0.522, blue: 0.957)
  private static let red = Color(red: 0.918, green: 0.263, blue: 0.208)
  private static let yellow = Color(red: 0.984, green: 0.737, blue: 0.020)
  private static let green = Color(red: 0.204, green: 0.659, blue: 0.325)

  var body: some View {
    Canvas { context, size in
      let lineWidth = size.width * 0.26
      let center = CGPoint(x: size.width / 2, y: size.height / 2)
      let radius = (size.width - lineWidth) / 2

      func arc(from start: Double, to end: Double, _ color: Color) {
        var path = Path()
        path.addArc(
          center: center,
          radius: radius,
          startAngle: .degrees(start),
          endAngle: .degrees(end),
          clockwise: false
        )
        context.stroke(
          path,
          with: .color(color),
          style: StrokeStyle(lineWidth: lineWidth, lineCap: .butt)
        )
      }

      // SwiftUI angles: 0° = 3 o'clock, increasing clockwise. The gap
      // around 0° is where the inner bar meets the ring.
      arc(from: 22, to: 95, Self.green)    // bottom-right
      arc(from: 95, to: 168, Self.yellow)  // bottom-left
      arc(from: 168, to: 256, Self.red)    // top-left → top
      arc(from: 256, to: 338, Self.blue)   // top-right → right

      // Inner blue bar, from the centre to the right edge.
      let barHeight = lineWidth
      let bar = CGRect(
        x: center.x,
        y: center.y - barHeight / 2,
        width: radius + lineWidth / 2,
        height: barHeight
      )
      context.fill(Path(bar), with: .color(Self.blue))
    }
  }
}
