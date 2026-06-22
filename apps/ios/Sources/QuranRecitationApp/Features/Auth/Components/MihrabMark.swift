import SwiftUI

/// The Tilawah brand mark: concentric mihrab arches framing a gold
/// eight-point sunburst, topped by a four-pointed star, drawn as gold
/// line-art. Matches the emblem at the top of `docs/design/iOS _ Sign in`.
///
/// Drawn with `Canvas` / `Path` rather than a bundled asset — the iOS
/// package has no asset catalog, and a vector keeps it crisp at any
/// size and easy to recolour.
struct MihrabMark: View {
  /// Overall side length of the mark.
  var size: CGFloat = 132

  var body: some View {
    Canvas { context, canvasSize in
      let lineWidth = canvasSize.width * 0.018 + 1
      let stroke = StrokeStyle(lineWidth: lineWidth, lineCap: .round, lineJoin: .round)
      let gold = Color.brand.accent

      // Star sits in the top ~22% of the canvas; arches fill the rest.
      let starBox = CGRect(
        x: canvasSize.width * 0.40,
        y: 0,
        width: canvasSize.width * 0.20,
        height: canvasSize.height * 0.20
      )
      context.fill(Self.starPath(in: starBox), with: .color(gold))

      let archTop = canvasSize.height * 0.24
      let archBottom = canvasSize.height * 0.96
      // Two nested arches, each inset from the last.
      for index in 0..<2 {
        let inset = CGFloat(index) * canvasSize.width * 0.13
        let rect = CGRect(
          x: canvasSize.width * 0.12 + inset,
          y: archTop + inset,
          width: canvasSize.width * 0.76 - inset * 2,
          height: archBottom - archTop - inset
        )
        context.stroke(Self.archPath(in: rect), with: .color(gold), style: stroke)
      }

      // Gold eight-point sunburst framed by the inner arch — the
      // doorway's focal mark, matching the mobile sign-in mock.
      let burstCenter = CGPoint(x: canvasSize.width * 0.50, y: canvasSize.height * 0.62)
      context.fill(
        Self.sunburstPath(center: burstCenter, outerRadius: canvasSize.width * 0.10),
        with: .color(gold)
      )
    }
    .frame(width: size, height: size)
    .accessibilityHidden(true)
  }

  /// An arch: straight sides rising to a semicircular top, open at the
  /// bottom (an inverted "U").
  private static func archPath(in rect: CGRect) -> Path {
    var path = Path()
    let radius = rect.width / 2
    let shoulderY = rect.minY + radius
    path.move(to: CGPoint(x: rect.minX, y: rect.maxY))
    path.addLine(to: CGPoint(x: rect.minX, y: shoulderY))
    path.addArc(
      center: CGPoint(x: rect.midX, y: shoulderY),
      radius: radius,
      startAngle: .degrees(180),
      endAngle: .degrees(0),
      clockwise: false
    )
    path.addLine(to: CGPoint(x: rect.maxX, y: rect.maxY))
    return path
  }

  /// A four-pointed star (sparkle): points at top / bottom / left /
  /// right with concave waists between them.
  private static func starPath(in rect: CGRect) -> Path {
    var path = Path()
    let center = CGPoint(x: rect.midX, y: rect.midY)
    let outerX = rect.width / 2
    let outerY = rect.height / 2
    let waist = min(outerX, outerY) * 0.32

    path.move(to: CGPoint(x: center.x, y: rect.minY))
    path.addQuadCurve(
      to: CGPoint(x: rect.maxX, y: center.y),
      control: CGPoint(x: center.x + waist, y: center.y - waist)
    )
    path.addQuadCurve(
      to: CGPoint(x: center.x, y: rect.maxY),
      control: CGPoint(x: center.x + waist, y: center.y + waist)
    )
    path.addQuadCurve(
      to: CGPoint(x: rect.minX, y: center.y),
      control: CGPoint(x: center.x - waist, y: center.y + waist)
    )
    path.addQuadCurve(
      to: CGPoint(x: center.x, y: rect.minY),
      control: CGPoint(x: center.x - waist, y: center.y - waist)
    )
    path.closeSubpath()
    return path
  }

  /// An eight-point sunburst (filled): sixteen vertices alternating
  /// between the outer tip radius and the inner valley radius.
  private static func sunburstPath(center: CGPoint, outerRadius: CGFloat) -> Path {
    var path = Path()
    let tips = 8
    let innerRadius = outerRadius * 0.42
    for i in 0..<(tips * 2) {
      let radius = i.isMultiple(of: 2) ? outerRadius : innerRadius
      let theta = CGFloat(i) * .pi / CGFloat(tips) - .pi / 2
      let point = CGPoint(
        x: center.x + radius * cos(theta),
        y: center.y + radius * sin(theta)
      )
      if i == 0 { path.move(to: point) } else { path.addLine(to: point) }
    }
    path.closeSubpath()
    return path
  }
}
