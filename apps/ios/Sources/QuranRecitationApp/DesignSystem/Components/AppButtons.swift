import SwiftUI

/// A pill-shaped text button at Apple's minimum tap height (44pt). Use the
/// `.appFilled`, `.appOutlined`, `.appText`, `.appErrorFilled` and
/// `.appErrorText` styles, or set `fillsWidth` to share a row with another
/// button.
struct AppButtonStyle: ButtonStyle {
  enum Variant {
    /// The main action of a panel, such as "See details".
    case filled
    /// A second action beside a filled one, such as "Record again".
    case outlined
    /// A low-emphasis action, such as "Show translation".
    case text
    /// The main action on an error panel (`AppPanel` with `.error`).
    case errorFilled
    /// A low-emphasis action on an error panel (`AppPanel` with `.error`).
    case errorText
  }

  var variant: Variant
  var fillsWidth = false

  func makeBody(configuration: Configuration) -> some View {
    AppButtonBody(configuration: configuration, variant: variant, fillsWidth: fillsWidth)
  }
}

extension ButtonStyle where Self == AppButtonStyle {
  static var appFilled: AppButtonStyle { AppButtonStyle(variant: .filled) }
  static var appOutlined: AppButtonStyle { AppButtonStyle(variant: .outlined) }
  static var appText: AppButtonStyle { AppButtonStyle(variant: .text) }
  static var appErrorFilled: AppButtonStyle { AppButtonStyle(variant: .errorFilled) }
  static var appErrorText: AppButtonStyle { AppButtonStyle(variant: .errorText) }
}

/// The button's look. A separate view so it can read `isEnabled`.
private struct AppButtonBody: View {
  let configuration: ButtonStyleConfiguration
  let variant: AppButtonStyle.Variant
  let fillsWidth: Bool

  @Environment(\.isEnabled) private var isEnabled

  var body: some View {
    configuration.label
      .font(AppTheme.Typography.subheadline.weight(.medium))
      .foregroundStyle(foreground)
      .multilineTextAlignment(.center)
      .padding(.horizontal, isText ? AppTheme.Spacing.space3 : AppTheme.Spacing.space5)
      .padding(.vertical, AppTheme.Spacing.space2)
      .frame(maxWidth: fillsWidth ? .infinity : nil, minHeight: AppButtonMetrics.height)
      .background(background, in: Capsule())
      .overlay {
        if variant == .outlined {
          Capsule().strokeBorder(AppTheme.Colors.outline, lineWidth: 1)
        }
      }
      .contentShape(Capsule())
      .opacity(isEnabled ? 1 : AppButtonMetrics.disabledOpacity)
      .opacity(configuration.isPressed ? AppButtonMetrics.pressedOpacity : 1)
  }

  private var isText: Bool { variant == .text || variant == .errorText }

  private var foreground: Color {
    switch variant {
    case .filled: AppTheme.Colors.onPrimary
    case .outlined, .text: AppTheme.Colors.primary
    case .errorFilled: AppTheme.Colors.onError
    case .errorText: AppTheme.Colors.onErrorContainer
    }
  }

  private var background: Color {
    switch variant {
    case .filled: AppTheme.Colors.primary
    case .errorFilled: AppTheme.Colors.error
    case .outlined, .text, .errorText: .clear
    }
  }
}

/// The 88pt round button that starts and stops a recording. While
/// `recording`, it shows a stop square on the recording colour inside a ring.
struct AppRecordButton: View {
  let recording: Bool
  let accessibilityLabel: Text
  let action: () -> Void

  @Environment(\.isEnabled) private var isEnabled

  var body: some View {
    Button(action: action) {
      ZStack {
        Circle().fill(recording ? AppTheme.Colors.recording : AppTheme.Colors.primary)
        if recording {
          // The ring has the same light and dark values as errorContainer,
          // the container role that pairs with the recording colour.
          Circle().strokeBorder(AppTheme.Colors.errorContainer, lineWidth: 6)
        }
        Image(systemName: recording ? "stop.fill" : "mic.fill")
          .font(.system(size: recording ? 28 : 34, weight: .medium))
          .foregroundStyle(recording ? AppTheme.Colors.onRecording : AppTheme.Colors.onPrimary)
      }
      .frame(width: 88, height: 88)
      .contentShape(Circle())
    }
    .buttonStyle(.plain)
    .opacity(isEnabled ? 1 : AppButtonMetrics.disabledOpacity)
    .accessibilityLabel(accessibilityLabel)
  }
}

/// A 48pt round icon button on the secondary container, such as the teacher
/// recitation's play button.
struct AppTonalIconButton: View {
  let systemImage: String
  let accessibilityLabel: Text
  let action: () -> Void

  @Environment(\.isEnabled) private var isEnabled

  var body: some View {
    Button(action: action) {
      Image(systemName: systemImage)
        .font(.system(size: 20, weight: .medium))
        .foregroundStyle(AppTheme.Colors.onSecondaryContainer)
        .frame(width: 48, height: 48)
        .background(AppTheme.Colors.secondaryContainer, in: Circle())
        .contentShape(Circle())
    }
    .buttonStyle(.plain)
    .opacity(isEnabled ? 1 : AppButtonMetrics.disabledOpacity)
    .accessibilityLabel(accessibilityLabel)
  }
}

private enum AppButtonMetrics {
  static let height: CGFloat = 44
  static let disabledOpacity = 0.38
  static let pressedOpacity = 0.8
}

/// Every button variant and state, for `#Preview` and the snapshot tests.
struct AppButtonsSpecimen: View {
  var body: some View {
    ForEach(
      [
        (AppButtonStyle.Variant.filled, "Details"),
        (.outlined, "Again"),
        (.text, "Translation"),
      ],
      id: \.1
    ) { variant, title in
      HStack(spacing: AppTheme.Spacing.space2) {
        Button(title) {}.buttonStyle(AppButtonStyle(variant: variant))
        Button(title) {}.buttonStyle(AppButtonStyle(variant: variant)).disabled(true)
      }
    }
    HStack(spacing: AppTheme.Spacing.space2) {
      Button("Record again") {}.buttonStyle(AppButtonStyle(variant: .outlined, fillsWidth: true))
      Button("See details") {}.buttonStyle(AppButtonStyle(variant: .filled, fillsWidth: true))
    }
    AppPanel(tone: .error) {
      HStack(spacing: AppTheme.Spacing.space2) {
        Button("Play mine") {}.buttonStyle(.appErrorText)
        Button("Record again") {}.buttonStyle(.appErrorFilled)
      }
    }
    HStack(spacing: AppTheme.Spacing.space4) {
      AppRecordButton(recording: false, accessibilityLabel: Text(verbatim: "Start recording")) {}
      AppRecordButton(recording: true, accessibilityLabel: Text(verbatim: "Stop recording")) {}
      AppRecordButton(recording: false, accessibilityLabel: Text(verbatim: "Start recording")) {}
        .disabled(true)
      AppTonalIconButton(systemImage: "play.fill", accessibilityLabel: Text(verbatim: "Play")) {}
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
