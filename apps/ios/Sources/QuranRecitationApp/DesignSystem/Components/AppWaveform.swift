import SwiftUI

/// The live input level as a row of bars, one per entry of `levels` (0 to 1),
/// oldest first. It is 56pt tall; each bar is 4pt wide with a 3pt gap, so 28
/// levels take 193pt. It is drawn only: VoiceOver skips it.
struct AppWaveform: View {
  let levels: [Float]
  var color: Color = AppTheme.Colors.recording

  var body: some View {
    HStack(spacing: 3) {
      ForEach(Array(levels.enumerated()), id: \.offset) { _, level in
        Capsule()
          .fill(color)
          .frame(width: 4, height: barHeight(level))
      }
    }
    .frame(height: Self.height)
    .accessibilityHidden(true)
  }

  private static let height: CGFloat = 56
  private static let minBarHeight: CGFloat = 4

  private func barHeight(_ level: Float) -> CGFloat {
    let clamped = CGFloat(min(max(level, 0), 1))
    return Self.minBarHeight + (Self.height - Self.minBarHeight) * clamped
  }
}

/// A waveform at speech levels and at silence, for `#Preview` and the snapshot tests.
struct AppWaveformSpecimen: View {
  /// Fixed levels that look like speech.
  static let levels: [Float] = (0..<28).map { i in
    let wave = abs(sin(Double(i) * 0.7) * cos(Double(i) * 0.23))
    return Float(0.1 + 0.75 * wave)
  }

  var body: some View {
    AppWaveform(levels: Self.levels)
    AppWaveform(levels: Array(repeating: 0, count: 28))
  }
}

#Preview("Light") {
  AppSpecimenSurface { AppWaveformSpecimen() }
}

#Preview("Dark") {
  AppSpecimenSurface { AppWaveformSpecimen() }
    .preferredColorScheme(.dark)
}
