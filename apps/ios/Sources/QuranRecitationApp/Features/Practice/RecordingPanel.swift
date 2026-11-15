import SwiftUI

/// The record button and what goes with it. Before recording: a prompt above
/// and a hint below. While recording: the elapsed time beside a recording
/// dot, the live waveform, and the button as a stop button.
struct RecordingPanel: View {
  let state: PracticeRecordingState
  let onTapRecord: () -> Void

  /// The most recent levels the waveform shows, oldest first.
  private static let waveformBars = 28

  var body: some View {
    VStack(spacing: AppTheme.Spacing.space3) {
      if case let .recording(meters, duration) = state {
        HStack(spacing: AppTheme.Spacing.space2) {
          Circle()
            .fill(AppTheme.Colors.recording)
            .frame(width: 8, height: 8)
          Text("practice.record.recordingTitle", bundle: .module)
          Text(Self.format(duration: duration))
            .monospacedDigit()
        }
        .font(AppTheme.Typography.subheadline.weight(.medium))
        .foregroundStyle(AppTheme.Colors.recording)
        AppWaveform(levels: Array(meters.suffix(Self.waveformBars)))
        AppRecordButton(
          recording: true,
          accessibilityLabel: Text("practice.record.stopA11y", bundle: .module),
          action: onTapRecord)
        Text("practice.record.recordingSubtitle", bundle: .module)
          .font(AppTheme.Typography.footnote)
          .foregroundStyle(AppTheme.Colors.onSurfaceVariant)
      } else {
        Text("practice.record.idleTitle", bundle: .module)
          .font(AppTheme.Typography.body)
          .foregroundStyle(AppTheme.Colors.onSurfaceVariant)
        AppRecordButton(
          recording: false,
          accessibilityLabel: Text("practice.record.startA11y", bundle: .module),
          action: onTapRecord)
        Text("practice.record.idleSubtitle", bundle: .module)
          .font(AppTheme.Typography.footnote)
          .foregroundStyle(AppTheme.Colors.onSurfaceVariant)
      }
    }
    .multilineTextAlignment(.center)
    .frame(maxWidth: .infinity)
  }

  private static func format(duration: TimeInterval) -> String {
    let total = Int(duration)
    return String(format: "%d:%02d", total / 60, total % 60)
  }
}
