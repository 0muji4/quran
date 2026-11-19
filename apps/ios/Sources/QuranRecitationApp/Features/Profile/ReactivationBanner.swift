import SwiftUI

/// The one-shot "Welcome back" message above the Profile content after a
/// sign-in that reactivated a soft-deleted account (ADR 0024 §4). It sits on
/// the pass container colour, as a good outcome. The close button
/// acknowledges it on `SessionStore`, so it does not come back on a tab
/// switch.
struct ReactivationBanner: View {
  let onDismiss: () -> Void

  var body: some View {
    HStack(alignment: .top, spacing: AppTheme.Spacing.space3) {
      Image(systemName: "checkmark.circle")
        .font(AppTheme.Typography.title3)
        .accessibilityHidden(true)
      VStack(alignment: .leading, spacing: AppTheme.Spacing.space1) {
        Text("profile.reactivation.title", bundle: .module)
          .font(AppTheme.Typography.headline)
        Text("profile.reactivation.body", bundle: .module)
          .font(AppTheme.Typography.subheadline)
          .fixedSize(horizontal: false, vertical: true)
      }
      .frame(maxWidth: .infinity, alignment: .leading)
      .accessibilityElement(children: .combine)
      Button(action: onDismiss) {
        Image(systemName: "xmark")
          .font(AppTheme.Typography.footnote.weight(.semibold))
          .frame(width: 44, height: 44)
      }
      .buttonStyle(.borderless)
      .padding(.top, -10)
      .padding(.trailing, -10)
      .accessibilityLabel(Text("profile.reactivation.dismiss.a11y", bundle: .module))
    }
    .foregroundStyle(AppTheme.Colors.onPassContainer)
  }
}
