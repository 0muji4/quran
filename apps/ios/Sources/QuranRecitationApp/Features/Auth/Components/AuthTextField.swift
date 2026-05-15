import SwiftUI
import UIKit

/// Labelled text field used across the auth screens: an uppercase
/// eyebrow label above a white, rounded, hairline-bordered field, with
/// an optional helper line below. Matches `docs/design/iOS _ Sign *`.
///
/// `AuthPasswordField` reuses the same chrome via `AuthFieldContainer`
/// so the email / name / password fields stay visually identical.
struct AuthTextField: View {
  let label: LocalizedStringKey
  @Binding var text: String
  var keyboardType: UIKeyboardType = .default
  var textContentType: UITextContentType? = nil
  var autocapitalization: TextInputAutocapitalization = .never
  var helperText: LocalizedStringKey? = nil

  var body: some View {
    AuthFieldContainer(label: label, helperText: helperText) {
      TextField("", text: $text)
        .font(Font.brand.body)
        .foregroundColor(Color.brand.textPrimary)
        .keyboardType(keyboardType)
        .textContentType(textContentType)
        .textInputAutocapitalization(autocapitalization)
        .autocorrectionDisabled()
    }
  }
}

/// Shared chrome for the auth fields: eyebrow label, white field
/// surface, optional helper text. Keeps `AuthTextField` and
/// `AuthPasswordField` pixel-identical.
struct AuthFieldContainer<Content: View>: View {
  let label: LocalizedStringKey
  var helperText: LocalizedStringKey? = nil
  @ViewBuilder let content: Content

  var body: some View {
    VStack(alignment: .leading, spacing: Spacing.sm) {
      Text(label, bundle: .module)
        .font(Font.brand.eyebrow)
        .foregroundColor(Color.brand.textSecondary)
        .textCase(.uppercase)

      content
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, Spacing.lg)
        .frame(minHeight: Spacing.minTapTarget + Spacing.sm)
        .background(Color.white)
        .clipShape(RoundedRectangle(cornerRadius: Spacing.cardCornerRadius, style: .continuous))
        .overlay(
          RoundedRectangle(cornerRadius: Spacing.cardCornerRadius, style: .continuous)
            .stroke(Color.brand.textSecondary.opacity(0.18), lineWidth: 1)
        )

      if let helperText {
        Text(helperText, bundle: .module)
          .font(Font.brand.caption)
          .foregroundColor(Color.brand.textSecondary)
      }
    }
  }
}
