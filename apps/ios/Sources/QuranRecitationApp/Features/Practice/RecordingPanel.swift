import SwiftUI

/// Dark recording panel from `docs/design/iOS _ Practice _ recording.png`.
/// Shows the prominent circular record/stop button, live waveform, and
/// elapsed duration. Driven by `PracticeRecordingState` so the same view
/// is used for both `.idle` and `.recording`.
struct RecordingPanel: View {
  let state: PracticeRecordingState
  let onTapRecord: () -> Void
  // Mirrors `@media (prefers-reduced-motion)` on the web. When the
  // system setting is on, the pulse rings stop animating; the static
  // double-circle still communicates "recording" via colour.
  @Environment(\.accessibilityReduceMotion) private var reduceMotion

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
        if isRecording && !reduceMotion {
          // Three rings, 0.4s apart, mirror the CSS keyframes in
          // `apps/web/app/styles/practice.module.css` (`pulseRing`).
          ForEach(0..<3, id: \.self) { index in
            PulseRing(delay: Double(index) * 0.4)
          }
        }
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

/// One ripple ring radiating out from the record button while recording.
/// Three of these are stacked with a 0.4s stagger to match the Web
/// `pulseRing` cascade. The ring is decorative — `allowsHitTesting(false)`
/// keeps the underlying record button hit area intact.
private struct PulseRing: View {
  let delay: Double
  @State private var expanded = false

  var body: some View {
    Circle()
      .strokeBorder(Color.brand.recording.opacity(0.55), lineWidth: 2)
      .frame(width: 76, height: 76)
      .scaleEffect(expanded ? 2.1 : 1.0)
      .opacity(expanded ? 0 : 0.7)
      .animation(
        .easeOut(duration: 1.6).repeatForever(autoreverses: false).delay(delay),
        value: expanded
      )
      .onAppear { expanded = true }
      .allowsHitTesting(false)
      .accessibilityHidden(true)
  }
}
