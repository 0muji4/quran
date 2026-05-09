import SwiftUI

/// "Couldn't hear that" card from
/// `docs/design/iOS _ Practice _ error.png`. Renders a dashed-circle
/// mic icon, the localized AppError title + recovery copy, and two
/// CTAs: "Replay" (visible only when the error is retriable) and a
/// primary "Record again" that resets the state machine.
struct PracticeErrorPanel: View {
  let error: AppError
  let onReplay: () -> Void
  let onRecordAgain: () -> Void

  var body: some View {
    BrandCard {
      VStack(alignment: .leading, spacing: Spacing.lg) {
        header
        VStack(spacing: Spacing.md) {
          dashedMicIcon
          if let suggestion = error.recoverySuggestion {
            Text(suggestion)
              .font(Font.brand.caption)
              .foregroundColor(Color.brand.textSecondary)
              .multilineTextAlignment(.center)
          }
          actions
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, Spacing.md)
      }
    }
  }

  private var header: some View {
    HStack(alignment: .center, spacing: Spacing.md) {
      Image(systemName: "mic.slash.fill")
        .foregroundColor(Color.brand.recording)
        .frame(width: Spacing.minTapTarget, height: Spacing.minTapTarget)
        .background(Color.brand.recording.opacity(0.12))
        .clipShape(Circle())
      VStack(alignment: .leading, spacing: 2) {
        Text(error.errorDescription ?? "")
          .font(Font.brand.body.weight(.semibold))
          .foregroundColor(Color.brand.textPrimary)
        Text("practice.error.subtitle", bundle: .module)
          .font(Font.brand.caption)
          .foregroundColor(Color.brand.textSecondary)
      }
      Spacer()
    }
  }

  private var dashedMicIcon: some View {
    ZStack {
      Circle()
        .strokeBorder(
          Color.brand.recording,
          style: StrokeStyle(lineWidth: 2, lineCap: .round, dash: [4, 6])
        )
        .frame(width: 96, height: 96)
      Image(systemName: "mic.fill")
        .foregroundColor(Color.brand.recording)
        .font(.system(size: 28))
    }
  }

  private var actions: some View {
    HStack(spacing: Spacing.md) {
      if error.isRetriable {
        Button(action: onReplay) {
          Text("practice.error.replay", bundle: .module)
            .font(Font.brand.body.weight(.semibold))
            .foregroundColor(Color.brand.textPrimary)
            .padding(.vertical, Spacing.sm)
            .padding(.horizontal, Spacing.lg)
            .background(Color.brand.card)
            .overlay(Capsule().strokeBorder(Color.brand.textSecondary.opacity(0.3)))
            .clipShape(Capsule())
        }
        .buttonStyle(.plain)
      }
      Button(action: onRecordAgain) {
        Text("practice.error.recordAgain", bundle: .module)
      }
      .buttonStyle(.brandPrimary)
      .frame(minWidth: 160)
    }
  }
}
