import SwiftUI

/// The teacher recitation: a play/pause button, the reciter and the time
/// left, a loop toggle, and the playback speed as a menu. When the audio is
/// unavailable, the panel says so and the user can still record on their own.
struct TeacherReferencePanel: View {
  enum State: Equatable {
    case idle
    case loading
    case ready(duration: TimeInterval, isPlaying: Bool, currentTime: TimeInterval, rate: Float)
    case unavailable
  }

  let reciterName: String
  let state: State
  let availableRates: [Float]
  let isLoopEnabled: Bool
  let onTogglePlayback: () -> Void
  let onSelectRate: (Float) -> Void
  let onToggleLoop: () -> Void

  var body: some View {
    AppPanel(padding: AppTheme.Spacing.space3) {
      HStack(spacing: AppTheme.Spacing.space3) {
        playButton
        VStack(alignment: .leading, spacing: 2) {
          Text("practice.teacher.label", bundle: .module)
            .font(AppTheme.Typography.body)
            .foregroundStyle(AppTheme.Colors.onSurface)
          Text(metaText)
            .font(AppTheme.Typography.footnote)
            .foregroundStyle(AppTheme.Colors.onSurfaceVariant)
        }
        Spacer(minLength: 0)
        loopButton
        if case let .ready(_, _, _, rate) = state {
          rateMenu(currentRate: rate)
        }
      }
    }
  }

  private var playButton: some View {
    Button(action: onTogglePlayback) {
      switch state {
      case .loading:
        ProgressView()
      case .ready(_, let isPlaying, _, _):
        Image(systemName: isPlaying ? "pause.fill" : "play.fill")
      case .idle, .unavailable:
        Image(systemName: "play.fill")
      }
    }
    .buttonStyle(.bordered)
    .buttonBorderShape(.circle)
    .disabled(state == .unavailable || state == .loading)
    .accessibilityLabel(Text("practice.teacher.label", bundle: .module))
  }

  /// Repeats the ayah while on; tinted when on so the state shows at a glance.
  private var loopButton: some View {
    Button(action: onToggleLoop) {
      Image(systemName: isLoopEnabled ? "repeat.1" : "repeat")
    }
    .buttonStyle(.borderless)
    .foregroundStyle(isLoopEnabled ? AppTheme.Colors.primary : AppTheme.Colors.onSurfaceVariant)
    .accessibilityLabel(
      Text(
        isLoopEnabled
          ? LocalizedStringKey("practice.teacher.loop.on")
          : LocalizedStringKey("practice.teacher.loop.off"),
        bundle: .module
      )
    )
    .accessibilityAddTraits(isLoopEnabled ? [.isSelected] : [])
  }

  /// The speed as a bordered menu button, shown only when the audio is
  /// ready, since the player ignores a rate change while loading.
  private func rateMenu(currentRate: Float) -> some View {
    Menu {
      ForEach(availableRates, id: \.self) { rate in
        Button {
          onSelectRate(rate)
        } label: {
          if rate == currentRate {
            Label(Self.format(rate: rate), systemImage: "checkmark")
          } else {
            Text(Self.format(rate: rate))
          }
        }
      }
    } label: {
      HStack(spacing: AppTheme.Spacing.space1) {
        Text(Self.format(rate: currentRate))
        Image(systemName: "chevron.up.chevron.down")
          .imageScale(.small)
      }
    }
    .buttonStyle(.bordered)
    .controlSize(.small)
    .accessibilityLabel(Text("practice.teacher.rate.legend", bundle: .module))
    .accessibilityValue(Text(Self.format(rate: currentRate)))
  }

  private var metaText: String {
    switch state {
    case .idle:
      return reciterName
    case .loading:
      return "…"
    case .unavailable:
      return NSLocalizedString("practice.teacher.unavailable", bundle: .module, comment: "")
    case let .ready(duration, _, currentTime, _):
      let left = Int(max(0, duration - currentTime))
      return "\(reciterName) · \(String(format: "%d:%02d", left / 60, left % 60))"
    }
  }

  /// A rate as the menu shows it: "0.75×", "1×", "1.25×".
  static func format(rate: Float) -> String {
    let trimmed = rate.truncatingRemainder(dividingBy: 1) == 0
      ? String(format: "%.0f", rate)
      : String(format: "%g", rate)
    return "\(trimmed)×"
  }
}
