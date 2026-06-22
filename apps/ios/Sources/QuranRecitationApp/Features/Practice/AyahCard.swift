import SwiftUI

/// White card containing the Arabic ayah text and an "AYAH N — SURAH"
/// eyebrow label, mirroring the centerpiece of
/// `docs/design/iOS _ Practice _ recording.png`.
struct AyahCard: View {
  let surahNameEn: String
  let ayahNumber: Int
  let textAr: String

  var body: some View {
    BrandCard {
      VStack(spacing: Spacing.lg) {
        Text(eyebrow)
          .font(Font.brand.eyebrow)
          .foregroundColor(Color.brand.textSecondary)
          .textCase(.uppercase)
        HStack(alignment: .center, spacing: Spacing.md) {
          medallion
          Text(textAr)
            .font(Font.brand.arabicAyah)
            .foregroundColor(Color.brand.textPrimary)
            .multilineTextAlignment(.trailing)
            .environment(\.layoutDirection, .rightToLeft)
            .lineSpacing(8)
            .frame(maxWidth: .infinity, alignment: .trailing)
        }
        .padding(.horizontal, Spacing.sm)
      }
      .frame(maxWidth: .infinity)
    }
  }

  /// Gold four-point star carrying the ayah number, drawn in the
  /// previously-unused `Color.brand.decorative` gold.
  private var medallion: some View {
    ZStack {
      FourPointStar()
        .stroke(Color.brand.decorative, lineWidth: 1)
        .frame(width: 34, height: 34)
      Text("\(ayahNumber)")
        .font(.system(size: 11, weight: .medium, design: .serif))
        .foregroundColor(Color.brand.decorative)
    }
    .accessibilityHidden(true)
  }

  private var eyebrow: String {
    "AYAH \(ayahNumber) — \(surahNameEn.uppercased())"
  }
}

/// A slim four-pointed star (compass rose) used for the ayah medallion.
/// Outer tips at the cardinal points, recessed inner vertices on the
/// diagonals so the arms read as thin needles like the mock.
private struct FourPointStar: Shape {
  /// Inner-vertex radius as a fraction of the outer radius. Smaller →
  /// sharper, thinner arms.
  var innerRatio: CGFloat = 0.38

  func path(in rect: CGRect) -> Path {
    let center = CGPoint(x: rect.midX, y: rect.midY)
    let outer = min(rect.width, rect.height) / 2
    let inner = outer * innerRatio
    var path = Path()
    for index in 0..<8 {
      let angle = CGFloat(index) * (.pi / 4) - (.pi / 2)  // start at the top tip
      let radius = index.isMultiple(of: 2) ? outer : inner
      let point = CGPoint(
        x: center.x + radius * cos(angle),
        y: center.y + radius * sin(angle)
      )
      if index == 0 {
        path.move(to: point)
      } else {
        path.addLine(to: point)
      }
    }
    path.closeSubpath()
    return path
  }
}
