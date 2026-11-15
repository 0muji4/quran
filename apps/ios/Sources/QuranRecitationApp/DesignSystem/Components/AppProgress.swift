import SwiftUI

/// A row of `total` short bars, the first `completed` of them filled, such as
/// the ayah position in a short surah. It is drawn only: say the position in
/// text next to it, as VoiceOver skips it.
struct AppSegmentedProgress: View {
  let completed: Int
  let total: Int

  var body: some View {
    HStack(spacing: 4) {
      ForEach(0..<max(total, 0), id: \.self) { index in
        Capsule()
          .fill(index < completed ? AppTheme.Colors.primary : AppTheme.Colors.outlineVariant)
          .frame(height: AppProgressMetrics.barHeight)
      }
    }
    .accessibilityHidden(true)
  }
}

/// The colour behind an `AppLinearProgress` bar.
enum AppProgressTrack {
  /// The outline variant, on a surface, such as the position in a long surah.
  case outline
  /// The primary container, inside a panel, such as the analysing progress.
  case container
}

/// A 4pt bar filled to `fraction` (0 to 1).
struct AppLinearProgress: View {
  let fraction: Double
  var track: AppProgressTrack = .outline

  var body: some View {
    let clamped = min(max(fraction, 0), 1)
    GeometryReader { geometry in
      ZStack(alignment: .leading) {
        Capsule()
          .fill(track == .container ? AppTheme.Colors.primaryContainer : AppTheme.Colors.outlineVariant)
        Capsule()
          .fill(AppTheme.Colors.primary)
          .frame(width: geometry.size.width * clamped)
      }
    }
    .frame(height: AppProgressMetrics.barHeight)
    .accessibilityElement()
    .accessibilityValue(Text(clamped, format: .percent.precision(.fractionLength(0))))
  }
}

/// Where an `AppStep` is in a sequence.
enum AppStepStatus {
  case done
  case active
  case todo
}

/// One step of an `AppStepList`.
struct AppStep {
  let label: String
  let status: AppStepStatus
}

/// Steps that run in order, such as transcribing, comparing and scoring: a
/// check for each step done, a spinning ring for the active step, and an
/// empty ring for the steps to come.
struct AppStepList: View {
  let steps: [AppStep]

  var body: some View {
    VStack(alignment: .leading, spacing: AppTheme.Spacing.space1) {
      ForEach(Array(steps.enumerated()), id: \.offset) { _, step in
        HStack(spacing: AppTheme.Spacing.space3) {
          AppStepMarker(status: step.status)
          Text(verbatim: step.label)
            .font(AppTheme.Typography.body)
            .foregroundStyle(
              step.status == .todo ? AppTheme.Colors.onSurfaceVariant : AppTheme.Colors.onSurface)
        }
        .frame(minHeight: 40)
        .accessibilityElement(children: .combine)
      }
    }
  }
}

private struct AppStepMarker: View {
  let status: AppStepStatus

  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @State private var spinning = false

  var body: some View {
    ZStack {
      switch status {
      case .done:
        Circle().fill(AppTheme.Colors.passContainer)
        Image(systemName: "checkmark")
          .font(.system(size: 12, weight: .bold))
          .foregroundStyle(AppTheme.Colors.onPassContainer)
      case .active:
        Circle()
          .strokeBorder(AppTheme.Colors.primaryContainer, lineWidth: 3)
          .frame(width: 20, height: 20)
        Circle()
          .trim(from: 0, to: 0.25)
          .stroke(AppTheme.Colors.primary, style: StrokeStyle(lineWidth: 3, lineCap: .round))
          .frame(width: 17, height: 17)
          .rotationEffect(.degrees(spinning ? 360 : 0))
          .animation(
            reduceMotion ? nil : .linear(duration: 1).repeatForever(autoreverses: false),
            value: spinning
          )
          .onAppear { spinning = true }
      case .todo:
        Circle()
          .strokeBorder(AppTheme.Colors.outlineVariant, lineWidth: 2)
          .frame(width: 20, height: 20)
      }
    }
    .frame(width: 24, height: 24)
    .accessibilityHidden(true)
  }
}

private enum AppProgressMetrics {
  static let barHeight: CGFloat = 4
}

/// Each progress component in its states, for `#Preview` and the snapshot tests.
struct AppProgressSpecimen: View {
  var body: some View {
    AppSegmentedProgress(completed: 1, total: 7)
    AppSegmentedProgress(completed: 5, total: 7)
    AppLinearProgress(fraction: 255.0 / 286.0)
    AppPanel {
      AppStepList(steps: [
        AppStep(label: "Transcribing your recitation", status: .done),
        AppStep(label: "Comparing with the teacher", status: .active),
        AppStep(label: "Calculating your score", status: .todo),
      ])
      AppLinearProgress(fraction: 0.55, track: .container)
        .padding(.top, AppTheme.Spacing.space2)
    }
  }
}

#Preview("Light") {
  AppSpecimenSurface { AppProgressSpecimen() }
}

#Preview("Dark") {
  AppSpecimenSurface { AppProgressSpecimen() }
    .preferredColorScheme(.dark)
}
