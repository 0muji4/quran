import SwiftUI

/// Danger-zone card on the Profile tab. Soft-delete CTA placeholder
/// per ADR-0024 — wired up to the confirm sheet in PR-H6.
struct DangerZoneCard: View {
  /// `nil` keeps the CTA disabled with its "coming soon" a11y label.
  /// A closure makes the button tappable and opens the type-to-
  /// confirm sheet.
  let onDelete: (() -> Void)?

  init(onDelete: (() -> Void)? = nil) {
    self.onDelete = onDelete
  }

  var body: some View {
    VStack(alignment: .leading, spacing: Spacing.sm) {
      Text("profile.dangerZone.eyebrow", bundle: .module)
        .font(.system(size: 11, weight: .semibold))
        .textCase(.uppercase)
        .tracking(0.6)
        .foregroundColor(Color.brand.recording)

      Text("profile.dangerZone.title", bundle: .module)
        .font(Font.brand.sectionTitle)
        .foregroundColor(Color.brand.textPrimary)

      Text("profile.dangerZone.helper", bundle: .module)
        .font(Font.brand.caption)
        .foregroundColor(Color.brand.textSecondary)
        .fixedSize(horizontal: false, vertical: true)

      Button {
        onDelete?()
      } label: {
        Text("profile.dangerZone.cta", bundle: .module)
          .font(Font.brand.body.weight(.semibold))
          .foregroundColor(Color.brand.recording)
          .frame(maxWidth: .infinity, minHeight: Spacing.minTapTarget)
      }
      .disabled(onDelete == nil)
      .accessibilityLabel(
        onDelete == nil
          ? Text("profile.dangerZone.cta.a11yDisabled", bundle: .module)
          : Text("profile.dangerZone.cta", bundle: .module)
      )
      .padding(.top, Spacing.xs)
    }
    .padding(Spacing.lg)
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(Color.brand.card)
    .overlay(
      RoundedRectangle(cornerRadius: Spacing.cardCornerRadius, style: .continuous)
        .stroke(Color.brand.recording.opacity(0.25), lineWidth: 1)
    )
    .clipShape(RoundedRectangle(cornerRadius: Spacing.cardCornerRadius, style: .continuous))
  }
}
