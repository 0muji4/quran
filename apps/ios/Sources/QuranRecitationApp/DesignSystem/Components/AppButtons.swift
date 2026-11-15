import SwiftUI

/// The main action of a panel: the system's `.borderedProminent` style with its
/// label in `onPrimary`. The system draws the label white whatever the tint,
/// and white on the dark-mode primary is 1.7:1, below WCAG AA; `onPrimary` is
/// the role made for text on `primary` in both modes (ADR 0030).
///
/// The other buttons use the system styles directly: `.bordered` beside the
/// main action and `.borderless` for a low-emphasis action. Screens set
/// `.controlSize(.large)`, `.buttonBorderShape(.capsule)` and the primary
/// `tint` once, around their content.
struct AppProminentButtonStyle: PrimitiveButtonStyle {
  func makeBody(configuration: Configuration) -> some View {
    Button(configuration)
      .buttonStyle(.borderedProminent)
      .foregroundStyle(AppTheme.Colors.onPrimary)
  }
}

extension PrimitiveButtonStyle where Self == AppProminentButtonStyle {
  static var appProminent: AppProminentButtonStyle { AppProminentButtonStyle() }
}

/// The button that starts and stops a recording: the system's bordered-prominent
/// button with a circle shape at the extra-large control size. It is tinted
/// with the primary colour, and with the recording colour while `recording`;
/// the icon takes the matching on-colour for the same reason as
/// `AppProminentButtonStyle`.
struct AppRecordButton: View {
  let recording: Bool
  let accessibilityLabel: Text
  let action: () -> Void

  var body: some View {
    Button(action: action) {
      Image(systemName: recording ? "stop.fill" : "mic.fill")
        .font(.system(size: 30, weight: .semibold))
        .frame(width: 60, height: 60)
    }
    .buttonStyle(.borderedProminent)
    .buttonBorderShape(.circle)
    .controlSize(.extraLarge)
    .tint(recording ? AppTheme.Colors.recording : AppTheme.Colors.primary)
    .foregroundStyle(recording ? AppTheme.Colors.onRecording : AppTheme.Colors.onPrimary)
    .accessibilityLabel(accessibilityLabel)
  }
}

/// The button styles in every state the screens use, the record button, a
/// circular play button and the speed menu, for `#Preview` and the snapshot tests.
struct AppButtonsSpecimen: View {
  var body: some View {
    HStack(spacing: AppTheme.Spacing.space2) {
      Button("Details") {}.buttonStyle(.appProminent)
      Button("Details") {}.buttonStyle(.appProminent).disabled(true)
    }
    HStack(spacing: AppTheme.Spacing.space2) {
      Button("Again") {}.buttonStyle(.bordered)
      Button("Again") {}.buttonStyle(.bordered).disabled(true)
    }
    HStack(spacing: AppTheme.Spacing.space2) {
      Button("Translation") {}.buttonStyle(.borderless)
      Button("Translation") {}.buttonStyle(.borderless).disabled(true)
    }
    HStack(spacing: AppTheme.Spacing.space2) {
      Button {} label: { Text(verbatim: "Record again").frame(maxWidth: .infinity) }
        .buttonStyle(.bordered)
      Button {} label: { Text(verbatim: "See details").frame(maxWidth: .infinity) }
        .buttonStyle(.appProminent)
    }
    AppPanel(tone: .error) {
      HStack(spacing: AppTheme.Spacing.space2) {
        Button("Play mine") {}.buttonStyle(.bordered)
        Button("Record again") {}.buttonStyle(.appProminent)
      }
    }
    HStack(spacing: AppTheme.Spacing.space4) {
      AppRecordButton(recording: false, accessibilityLabel: Text(verbatim: "Start recording")) {}
      AppRecordButton(recording: true, accessibilityLabel: Text(verbatim: "Stop recording")) {}
      Button {} label: { Image(systemName: "play.fill") }
        .buttonStyle(.bordered)
        .buttonBorderShape(.circle)
        .accessibilityLabel(Text(verbatim: "Play"))
      Menu {
        Button("0.75×") {}
        Button("1×") {}
      } label: {
        HStack(spacing: AppTheme.Spacing.space1) {
          Text(verbatim: "1×")
          Image(systemName: "chevron.up.chevron.down")
            .imageScale(.small)
        }
      }
      .buttonStyle(.bordered)
      .controlSize(.small)
    }
  }
}

#Preview("Light") {
  AppSpecimenSurface { AppButtonsSpecimen() }
}

#Preview("Dark") {
  AppSpecimenSurface { AppButtonsSpecimen() }
    .preferredColorScheme(.dark)
}
