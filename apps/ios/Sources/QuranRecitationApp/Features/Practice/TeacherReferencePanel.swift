import SwiftUI

/// Cream card containing the teacher reference player. Mirrors the
/// "Teacher reference · Husary Mu'allim · 0:08 · 1.00×" treatment in
/// `docs/design/iOS _ Practice _ recording.png`. When the reference
/// audio is unavailable the player switches to a quiet empty state so
/// the user can still record their attempt.
struct TeacherReferencePanel: View {
  enum State: Equatable {
    case idle
    case loading
    case ready(duration: TimeInterval, isPlaying: Bool, currentTime: TimeInterval, rate: Float)
    case unavailable
  }

  let reciterName: String
  let state: State
  let onTogglePlayback: () -> Void
  let onChangeRate: () -> Void

  var body: some View {
    BrandCard {
      HStack(alignment: .center, spacing: Spacing.md) {
        playButton
        VStack(alignment: .leading, spacing: 2) {
          Text("practice.teacher.label", bundle: .module)
            .font(Font.brand.body.weight(.semibold))
            .foregroundColor(Color.brand.textPrimary)
          Text(metaText)
            .font(Font.brand.caption)
            .foregroundColor(Color.brand.textSecondary)
        }
        Spacer()
        Image(systemName: state == .unavailable ? "speaker.slash" : "speaker.wave.2")
          .foregroundColor(Color.brand.textSecondary)
      }
    }
  }

  private var playButton: some View {
    Button(action: onTogglePlayback) {
      Group {
        switch state {
        case .loading:
          ProgressView()
        case .unavailable:
          Image(systemName: "play.fill").opacity(0.4)
        case .idle:
          Image(systemName: "play.fill")
        case .ready(_, let isPlaying, _, _):
          Image(systemName: isPlaying ? "pause.fill" : "play.fill")
        }
      }
      .foregroundColor(Color.brand.textOnPrimary)
      .frame(width: Spacing.minTapTarget, height: Spacing.minTapTarget)
      .background(buttonBackground)
      .clipShape(Circle())
    }
    .buttonStyle(.plain)
    .disabled(state == .unavailable || state == .loading)
  }

  private var buttonBackground: Color {
    state == .unavailable ? Color.brand.textSecondary.opacity(0.4) : Color.brand.primary
  }

  private var metaText: String {
    switch state {
    case .idle:
      return reciterName
    case .loading:
      return "loading…"
    case .unavailable:
      return NSLocalizedString("practice.teacher.unavailable", bundle: .module, comment: "")
    case let .ready(duration, _, currentTime, rate):
      return "\(reciterName) · \(format(duration: duration - currentTime)) · \(format(rate: rate))"
    }
  }

  private func format(duration: TimeInterval) -> String {
    let total = Int(max(0, duration))
    return String(format: "%d:%02d", total / 60, total % 60)
  }

  private func format(rate: Float) -> String {
    String(format: "%.2f×", rate)
  }
}
