import SwiftUI

/// "Account & data" card on the Profile tab: Email and Password rows.
struct AccountDataCard: View {
  let email: String
  let passwordChangedAt: String?
  let onChangeEmail: (() -> Void)?
  let onUpdatePassword: (() -> Void)?

  init(
    email: String,
    passwordChangedAt: String? = nil,
    onChangeEmail: (() -> Void)? = nil,
    onUpdatePassword: (() -> Void)? = nil
  ) {
    self.email = email
    self.passwordChangedAt = passwordChangedAt
    self.onChangeEmail = onChangeEmail
    self.onUpdatePassword = onUpdatePassword
  }

  var body: some View {
    VStack(alignment: .leading, spacing: Spacing.md) {
      ProfileSectionLabel("profile.section.account")

      VStack(alignment: .leading, spacing: Spacing.md) {
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
          helperText: Self.lastChangedText(passwordChangedAt),
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

  private static func lastChangedText(_ iso: String?) -> String? {
    guard let iso, let date = parseISO(iso) else { return nil }
    let formatter = DateFormatter()
    formatter.locale = Locale.current
    formatter.setLocalizedDateFormatFromTemplate("MMM d, y")
    let template = Bundle.module.localizedString(
      forKey: "profile.section.password.lastChanged",
      value: "Last changed %@",
      table: nil
    )
    return String(format: template, formatter.string(from: date))
  }

  private static func parseISO(_ value: String) -> Date? {
    let fractional = ISO8601DateFormatter()
    fractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    if let date = fractional.date(from: value) { return date }
    let plain = ISO8601DateFormatter()
    plain.formatOptions = [.withInternetDateTime]
    return plain.date(from: value)
  }
}

/// One row inside the Account card. Two-column layout: a left stack
/// (eyebrow / value / helper) and a trailing link button that is
/// disabled until a per-row `action` closure is wired in.
private struct AccountRow: View {
  let eyebrowKey: String
  let primary: String
  let helperKey: String
  var helperText: String? = nil
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

        Group {
          if let helperText {
            Text(helperText)
          } else {
            Text(LocalizedStringKey(helperKey), bundle: .module)
          }
        }
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
          .foregroundColor(Color.brand.primary)
      }
      .disabled(action == nil)
      .opacity(action == nil ? 0.4 : 1)
      .accessibilityLabel(
        action == nil
          ? Text(LocalizedStringKey(actionA11yKey), bundle: .module)
          : Text(LocalizedStringKey(actionKey), bundle: .module)
      )
    }
  }
}
