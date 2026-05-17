import SwiftUI

/// "Account & data" card on the Profile tab. Two rows: Email and
/// Password. The right-hand "Change" / "Update" CTAs are disabled
/// placeholders in PR-H2 — the actual sheets land in PR-H4 (password)
/// and PR-H5 (email).
struct AccountDataCard: View {
  let email: String
  /// `nil` keeps each row's trailing CTA disabled (the H2 default).
  /// PR-H4 onward wires `onUpdatePassword`; PR-H5 will wire
  /// `onChangeEmail`.
  let onChangeEmail: (() -> Void)?
  let onUpdatePassword: (() -> Void)?

  init(
    email: String,
    onChangeEmail: (() -> Void)? = nil,
    onUpdatePassword: (() -> Void)? = nil
  ) {
    self.email = email
    self.onChangeEmail = onChangeEmail
    self.onUpdatePassword = onUpdatePassword
  }

  var body: some View {
    VStack(alignment: .leading, spacing: Spacing.md) {
      Text("profile.section.accountTitle", bundle: .module)
        .font(Font.brand.sectionTitle)
        .foregroundColor(Color.brand.textPrimary)

      AccountRow(
        eyebrowKey: "profile.section.email.eyebrow",
        primary: email,
        helperKey: "profile.section.email.helper",
        actionKey: "profile.section.email.cta",
        actionA11yKey: "profile.section.email.cta.a11yDisabled",
        action: onChangeEmail
      )

      Divider().background(Color.brand.tile)

      AccountRow(
        eyebrowKey: "profile.section.password.eyebrow",
        primary: "•••••••••••",
        helperKey: "profile.section.password.helper",
        actionKey: "profile.section.password.cta",
        actionA11yKey: "profile.section.password.cta.a11yDisabled",
        action: onUpdatePassword
      )
    }
    .padding(Spacing.lg)
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(Color.brand.card)
    .clipShape(RoundedRectangle(cornerRadius: Spacing.cardCornerRadius, style: .continuous))
  }
}

/// One row inside the Account card. Two-column layout: a left stack
/// (eyebrow / value / helper) and a trailing link button that is
/// disabled until a per-row `action` closure is wired in.
private struct AccountRow: View {
  let eyebrowKey: String
  let primary: String
  let helperKey: String
  let actionKey: String
  let actionA11yKey: String
  let action: (() -> Void)?

  var body: some View {
    HStack(alignment: .top, spacing: Spacing.md) {
      VStack(alignment: .leading, spacing: Spacing.xs) {
        Text(LocalizedStringKey(eyebrowKey), bundle: .module)
          .font(.system(size: 11, weight: .semibold))
          .textCase(.uppercase)
          .tracking(0.6)
          .foregroundColor(Color.brand.textSecondary)

        Text(primary)
          .font(Font.brand.body)
          .foregroundColor(Color.brand.textPrimary)

        Text(LocalizedStringKey(helperKey), bundle: .module)
          .font(Font.brand.caption)
          .foregroundColor(Color.brand.textSecondary)
          .fixedSize(horizontal: false, vertical: true)
      }
      .frame(maxWidth: .infinity, alignment: .leading)

      Button {
        action?()
      } label: {
        Text(LocalizedStringKey(actionKey), bundle: .module)
          .font(Font.brand.caption.weight(.semibold))
      }
      .disabled(action == nil)
      .accessibilityLabel(
        action == nil
          ? Text(LocalizedStringKey(actionA11yKey), bundle: .module)
          : Text(LocalizedStringKey(actionKey), bundle: .module)
      )
    }
  }
}
