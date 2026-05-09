import SwiftUI

/// Vertical-bar waveform driven by 0…1 amplitude samples published by
/// `AudioRecorder`. Renders right-to-left — the most recent sample is
/// on the right edge — mirroring the live reading in
/// `docs/design/iOS _ Practice _ recording.png`. The shimmer-style
/// disabled mode used by the analysing panel passes a tinted gradient.
struct WaveformView: View {
  let meters: [Float]
  var barWidth: CGFloat = 3
  var barSpacing: CGFloat = 2
  var maxHeight: CGFloat = 80
  var color: Color = Color.brand.recording

  var body: some View {
    HStack(alignment: .center, spacing: barSpacing) {
      ForEach(Array(meters.enumerated()), id: \.offset) { _, level in
        Capsule()
          .fill(color)
          .frame(width: barWidth, height: barHeight(for: level))
      }
    }
    .frame(maxWidth: .infinity, minHeight: maxHeight, maxHeight: maxHeight)
    .animation(.easeOut(duration: 0.05), value: meters)
  }

  private func barHeight(for level: Float) -> CGFloat {
    let normalized = max(0.05, CGFloat(level))
    return maxHeight * normalized
  }
}
