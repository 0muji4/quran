import SwiftUI

/// The teacher recitation and the user's own recording, each with a play
/// button and, when known, its length. The parent owns the players; this view
/// only draws their state.
struct ListenBackSection: View {
  let teacherDuration: TimeInterval?
  let youDuration: TimeInterval?
  let teacherIsPlaying: Bool
  let youIsPlaying: Bool
  let onToggleTeacher: () -> Void
  let onToggleYou: () -> Void

  var body: some View {
    AppPanel {
      Text("result.listenBack.title", bundle: .module)
        .font(AppTheme.Typography.headline)
        .foregroundStyle(AppTheme.Colors.onSurface)
      row(
        label: "result.listenBack.teacher",
        duration: teacherDuration,
        isPlaying: teacherIsPlaying,
        onToggle: onToggleTeacher
      )
      row(
        label: "result.listenBack.you",
        duration: youDuration,
        isPlaying: youIsPlaying,
        onToggle: onToggleYou
      )
    }
  }

  private func row(
    label: LocalizedStringKey,
    duration: TimeInterval?,
    isPlaying: Bool,
    onToggle: @escaping () -> Void
  ) -> some View {
    HStack(spacing: AppTheme.Spacing.space3) {
      Button(action: onToggle) {
        Image(systemName: isPlaying ? "pause.fill" : "play.fill")
      }
      .buttonStyle(.bordered)
      .buttonBorderShape(.circle)
      .accessibilityLabel(Text(label, bundle: .module))
      .accessibilityValue(
        Text(isPlaying ? "result.listenBack.playing" : "result.listenBack.paused", bundle: .module))
      Text(label, bundle: .module)
        .font(AppTheme.Typography.body)
        .foregroundStyle(AppTheme.Colors.onSurface)
      Spacer(minLength: 0)
      if let duration {
        Text(verbatim: Self.format(duration))
          .font(AppTheme.Typography.footnote.monospacedDigit())
          .foregroundStyle(AppTheme.Colors.onSurfaceVariant)
      }
    }
  }

  private static func format(_ duration: TimeInterval) -> String {
    let total = Int(max(0, duration))
    return String(format: "%d:%02d", total / 60, total % 60)
  }
}
