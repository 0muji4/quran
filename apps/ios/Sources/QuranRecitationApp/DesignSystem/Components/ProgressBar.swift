import SwiftUI

/// Horizontal progress bar with a tile track and a colored fill.
/// Used by the Result screen for the Accuracy / Fluency / Completeness
/// rows. Animates width changes for a satisfying score reveal.
struct ProgressBar: View {
  let value: Double
  let total: Double
  var color: Color = Color.brand.success
  var trackColor: Color = Color.brand.tile
  var height: CGFloat = 6

  var body: some View {
    GeometryReader { proxy in
      ZStack(alignment: .leading) {
        Capsule()
          .fill(trackColor)
        Capsule()
          .fill(color)
          .frame(width: proxy.size.width * progress)
          .animation(.easeOut(duration: 0.6), value: value)
      }
    }
    .frame(height: height)
    .accessibilityElement(children: .ignore)
    .accessibilityValue(Text("\(Int(progress * 100)) percent"))
  }

  private var progress: CGFloat {
    guard total > 0 else { return 0 }
    return CGFloat(max(0, min(value / total, 1)))
  }
}
