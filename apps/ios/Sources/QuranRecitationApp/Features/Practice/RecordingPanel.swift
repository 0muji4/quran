import SwiftUI

/// Dark recording panel from `docs/design/iOS _ Practice _ recording.png`.
/// Shows the prominent circular record/stop button, live waveform, and
/// elapsed duration. Driven by `PracticeRecordingState` so the same view
/// is used for both `.idle` and `.recording`.
struct RecordingPanel: View {
  let state: PracticeRecordingState
  let onTapRecord: () -> Void

  var body: some View {
    BrandCard(style: .inverse) {
      VStack(spacing: Spacing.lg) {
        topRow
        WaveformView(
          meters: meters,
          color: Color.brand.recording.opacity(isRecording ? 1.0 : 0.4)
        )
        recordButton
      }
      .frame(maxWidth: .infinity)
      .padding(.vertical, Spacing.lg)
    }
  }

  private var topRow: some View {
    HStack(alignment: .center, spacing: Spacing.md) {
      Image(systemName: isRecording ? "mic.fill" : "mic")
        .foregroundColor(Color.brand.recording)
        .frame(width: Spacing.minTapTarget, height: Spacing.minTapTarget)
        .background(Color.brand.recording.opacity(0.15))
        .clipShape(Circle())
      VStack(alignment: .leading, spacing: 2) {
        Text(label, bundle: .module)
          .font(Font.brand.body.weight(.semibold))
          .foregroundColor(Color.brand.textOnInverse)
        if let secondary {
          Text(secondary, bundle: .module)
            .font(Font.brand.caption)
            .foregroundColor(Color.brand.textOnInverse.opacity(0.75))
        }
      }
      Spacer()
      if isRecording {
        HStack(spacing: 6) {
          Circle()
            .fill(Color.brand.recording)
            .frame(width: 6, height: 6)
          Text(formattedDuration)
            .font(Font.brand.caption)
            .foregroundColor(Color.brand.textOnInverse)
            .monospacedDigit()
        }
      }
    }
    .padding(.horizontal, Spacing.lg)
  }

  private var recordButton: some View {
    Button(action: onTapRecord) {
      ZStack {
        Circle()
          .strokeBorder(Color.brand.recording.opacity(0.4), lineWidth: 4)
          .frame(width: 100, height: 100)
        Circle()
          .fill(Color.brand.recording)
          .frame(width: 76, height: 76)
        if isRecording {
          RoundedRectangle(cornerRadius: 4)
            .fill(Color.white)
            .frame(width: 22, height: 22)
        } else {
          Image(systemName: "mic.fill")
            .foregroundColor(Color.white)
        }
      }
    }
    .buttonStyle(.plain)
    .accessibilityLabel(Text(isRecording ? "practice.record.stopA11y" : "practice.record.startA11y", bundle: .module))
  }

  // MARK: - Derived state

  private var isRecording: Bool {
    if case .recording = state { return true } else { return false }
  }

  private var meters: [Float] {
    if case let .recording(values, _) = state { return values }
    return []
  }

  private var formattedDuration: String {
    if case let .recording(_, duration) = state {
      let total = Int(duration)
      return String(format: "%d:%02d", total / 60, total % 60)
    }
    return "0:00"
  }

  private var label: LocalizedStringKey {
    isRecording ? "practice.record.recordingTitle" : "practice.record.idleTitle"
  }

  private var secondary: LocalizedStringKey? {
    isRecording ? "practice.record.recordingSubtitle" : "practice.record.idleSubtitle"
  }
}
