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
  let availableRates: [Float]
  let onTogglePlayback: () -> Void
  let onSelectRate: (Float) -> Void

  var body: some View {
    BrandCard {
      VStack(alignment: .leading, spacing: Spacing.sm) {
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

        if case let .ready(_, _, _, rate) = state {
          rateRow(currentRate: rate)
        }
      }
    }
  }

  /// Pill row that mirrors the web `TeacherPanel` 0.75× / 1× / 1.25×
  /// controls. Only rendered in `.ready` because changing the rate
  /// while loading would be ignored by the player.
  private func rateRow(currentRate: Float) -> some View {
    HStack(spacing: Spacing.xs) {
      ForEach(availableRates, id: \.self) { rate in
        Button {
          onSelectRate(rate)
        } label: {
          Text(Self.format(rate: rate))
            .font(.system(size: 12, weight: .semibold))
            .padding(.horizontal, Spacing.md)
            .padding(.vertical, 6)
            .background(rate == currentRate ? Color.brand.primary : Color.brand.tile)
            .foregroundColor(rate == currentRate ? Color.brand.textOnPrimary : Color.brand.textPrimary)
            .clipShape(Capsule())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(Text("practice.teacher.rate.a11y \(Self.format(rate: rate))", bundle: .module))
        .accessibilityAddTraits(rate == currentRate ? [.isSelected] : [])
      }
    }
    .accessibilityElement(children: .contain)
    .accessibilityLabel(Text("practice.teacher.rate.legend", bundle: .module))
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

  /// Compact pill label: 1×, 0.75×, 1.25× (matches the web pills).
  /// `metaText` uses the verbose `%.2f×` form so the inline meta line
  /// stays alignment-stable.
  static func format(rate: Float) -> String {
    let trimmed = rate.truncatingRemainder(dividingBy: 1) == 0
      ? String(format: "%.0f", rate)
      : String(format: "%g", rate)
    return "\(trimmed)×"
  }
}
