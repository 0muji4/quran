import SwiftUI

/// One-shot "Welcome back" banner shown above the Profile content
/// after a sign-in that reactivated a soft-deleted account
/// (ADR-0024 §4). Mirrors the web `WelcomeBackToast` — same copy,
/// same once-per-sign-in semantics. Dismissed via the close button;
/// `SessionStore.acknowledgeReactivationNotice()` flips the flag
/// off so the banner doesn't re-appear on a tab switch.
struct ReactivationBanner: View {
  let onDismiss: () -> Void

  var body: some View {
    HStack(alignment: .top, spacing: Spacing.md) {
      Image(systemName: "checkmark.seal.fill")
        .foregroundColor(Color.brand.success)
        .font(.system(size: 20))
        .accessibilityHidden(true)

      VStack(alignment: .leading, spacing: Spacing.xs) {
        Text("profile.reactivation.title", bundle: .module)
          .font(Font.brand.body.weight(.semibold))
          .foregroundColor(Color.brand.textPrimary)
        Text("profile.reactivation.body", bundle: .module)
          .font(Font.brand.caption)
          .foregroundColor(Color.brand.textSecondary)
          .fixedSize(horizontal: false, vertical: true)
      }
      .frame(maxWidth: .infinity, alignment: .leading)
      .accessibilityElement(children: .combine)

      Button(action: onDismiss) {
        Image(systemName: "xmark")
          .font(.system(size: 13, weight: .semibold))
          .foregroundColor(Color.brand.textSecondary)
          .frame(width: Spacing.minTapTarget, height: Spacing.minTapTarget)
      }
      .accessibilityLabel(Text("profile.reactivation.dismiss.a11y", bundle: .module))
    }
    .padding(Spacing.md)
    .background(Color.brand.success.opacity(0.08))
    .overlay(
      RoundedRectangle(cornerRadius: Spacing.cardCornerRadius, style: .continuous)
        .stroke(Color.brand.success.opacity(0.25), lineWidth: 1)
    )
    .clipShape(RoundedRectangle(cornerRadius: Spacing.cardCornerRadius, style: .continuous))
    .accessibilityAddTraits(.isStaticText)
  }
}
