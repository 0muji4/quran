import SwiftUI

/// The three scoring steps while the backend scores a recording, with a
/// progress bar that advances one step at a time. The bar never reaches the
/// end: the screen moves on to the result when scoring finishes.
struct AnalysingPanel: View {
  let step: AnalysingStep

  private static let steps: [(AnalysingStep, String.LocalizationValue)] = [
    (.transcribing, "practice.analysing.step.transcribing"),
    (.comparing, "practice.analysing.step.comparing"),
    (.calculating, "practice.analysing.step.calculating"),
  ]

  var body: some View {
    AppPanel {
      Text("practice.analysing.title", bundle: .module)
        .font(AppTheme.Typography.headline)
        .foregroundStyle(AppTheme.Colors.onSurface)
      AppStepList(
        steps: Self.steps.map { row, label in
          AppStep(label: String(localized: label, bundle: .module), status: status(of: row))
        })
      ProgressView(value: Double(index(of: step) + 1), total: Double(Self.steps.count + 1))
    }
  }

  private func status(of row: AnalysingStep) -> AppStepStatus {
    if row == step { return .active }
    return index(of: row) < index(of: step) ? .done : .todo
  }

  private func index(of step: AnalysingStep) -> Int {
    Self.steps.firstIndex { $0.0 == step } ?? 0
  }
}
