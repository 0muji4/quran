import SwiftUI

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
/// filled check on the pass colour for each step done, the system activity
/// indicator for the active step, and an empty circle for the steps to come.
/// Progress bars are the system's `ProgressView(value:)`, used as it is
/// (ADR 0030).
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

  /// Grows with the step's text, so a marker keeps its place beside larger type.
  @ScaledMetric(relativeTo: .body) private var size: CGFloat = 24

  var body: some View {
    Group {
      switch status {
      case .done:
        Image(systemName: "checkmark.circle.fill")
          .font(.system(size: size - 2))
          .foregroundStyle(AppTheme.Colors.pass)
      case .active:
        // The regular size, whatever size the screen gives its buttons: a
        // large spinner is wider than the marker and runs into the text.
        ProgressView()
          .controlSize(.regular)
      case .todo:
        Image(systemName: "circle")
          .font(.system(size: size - 2))
          .foregroundStyle(AppTheme.Colors.outlineVariant)
      }
    }
    .frame(width: size, height: size)
    .accessibilityHidden(true)
  }
}

/// The step list in a panel, with the system progress views for the ayah
/// position and the analysing progress, for `#Preview` and the snapshot tests.
struct AppProgressSpecimen: View {
  var body: some View {
    ProgressView(value: 1.0 / 7.0)
    ProgressView(value: 255.0 / 286.0)
    AppPanel {
      AppStepList(steps: [
        AppStep(label: "Transcribing your recitation", status: .done),
        AppStep(label: "Comparing with the teacher", status: .active),
        AppStep(label: "Calculating your score", status: .todo),
      ])
      ProgressView(value: 0.55)
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
