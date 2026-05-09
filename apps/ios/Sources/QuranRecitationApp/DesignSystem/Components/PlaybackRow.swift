import SwiftUI

/// One row of the listen-back section. A circular play button + label
/// + duration. Tint is parameterised so the Teacher row uses the
/// primary teal and the You row uses the gold accent.
struct PlaybackRow: View {
  let title: LocalizedStringKey
  let duration: TimeInterval?
  let isPlaying: Bool
  let tint: Color
  let onToggle: () -> Void

  var body: some View {
    HStack(spacing: Spacing.md) {
      Button(action: onToggle) {
        Image(systemName: isPlaying ? "pause.fill" : "play.fill")
          .foregroundColor(.white)
          .frame(width: Spacing.minTapTarget, height: Spacing.minTapTarget)
          .background(tint)
          .clipShape(Circle())
      }
      .buttonStyle(.plain)
      Text(title, bundle: .module)
        .font(Font.brand.body.weight(.semibold))
        .foregroundColor(Color.brand.textPrimary)
      Spacer()
      if let duration {
        Text(format(duration: duration))
          .font(Font.brand.caption)
          .foregroundColor(Color.brand.textSecondary)
          .monospacedDigit()
      }
    }
    .padding(.vertical, Spacing.sm)
    .padding(.horizontal, Spacing.md)
    .background(Color.brand.surface.opacity(0.5))
    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
  }

  private func format(duration: TimeInterval) -> String {
    let total = Int(max(0, duration))
    return String(format: "%d:%02d", total / 60, total % 60)
  }
}
