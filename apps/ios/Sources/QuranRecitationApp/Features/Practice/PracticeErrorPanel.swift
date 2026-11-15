import SwiftUI

/// The panel for a failed recording or scoring: what went wrong, what to try,
/// then Replay (when the error is retriable) and Record again.
struct PracticeErrorPanel: View {
  let error: AppError
  let onReplay: () -> Void
  let onRecordAgain: () -> Void

  var body: some View {
    AppPanel(tone: .error) {
      HStack(alignment: .top, spacing: AppTheme.Spacing.space3) {
        Image(systemName: "exclamationmark.circle")
          .font(AppTheme.Typography.title3)
          .accessibilityHidden(true)
        VStack(alignment: .leading, spacing: AppTheme.Spacing.space1) {
          Text(error.errorDescription ?? "")
            .font(AppTheme.Typography.headline)
          if showsMicHint {
            Text("practice.error.subtitle", bundle: .module)
              .font(AppTheme.Typography.subheadline)
          }
          if let suggestion = error.recoverySuggestion {
            Text(suggestion)
              .font(AppTheme.Typography.subheadline)
          }
        }
      }
      .foregroundStyle(AppTheme.Colors.onErrorContainer)
      HStack(spacing: AppTheme.Spacing.space2) {
        Spacer(minLength: 0)
        if error.isRetriable {
          Button(action: onReplay) {
            Text("practice.error.replay", bundle: .module)
          }
          .buttonStyle(.bordered)
        }
        Button(action: onRecordAgain) {
          Text("practice.error.recordAgain", bundle: .module)
        }
        .buttonStyle(.appProminent)
      }
    }
  }

  /// "Move closer to the mic" does not help when the scoring limit is used up.
  private var showsMicHint: Bool {
    if case .scoringLimitReached = error { return false }
    return true
  }
}
