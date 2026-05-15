import SwiftUI
import UIKit

/// Password field with an inline "Show" / "Hide" toggle, matching the
/// design. Shares `AuthFieldContainer` chrome with `AuthTextField` so
/// the password field is visually identical to the email / name
/// fields. The toggle swaps between `SecureField` and `TextField`
/// rather than silently changing a content type, and is exposed to
/// assistive tech via an accessibility label.
struct AuthPasswordField: View {
  let label: LocalizedStringKey
  @Binding var text: String
  @Binding var isVisible: Bool
  var textContentType: UITextContentType = .password
  var helperText: LocalizedStringKey? = nil

  var body: some View {
    AuthFieldContainer(label: label, helperText: helperText) {
      HStack(spacing: Spacing.sm) {
        Group {
          if isVisible {
            TextField("", text: $text)
          } else {
            SecureField("", text: $text)
          }
        }
        .font(Font.brand.body)
        .foregroundColor(Color.brand.textPrimary)
        .textContentType(textContentType)
        .textInputAutocapitalization(.never)
        .autocorrectionDisabled()

        Button {
          isVisible.toggle()
        } label: {
          Text(isVisible ? "auth.password.hide" : "auth.password.show", bundle: .module)
            .font(Font.brand.caption.weight(.semibold))
            .foregroundColor(Color.brand.primary)
        }
        .buttonStyle(.plain)
        .accessibilityLabel(Text("auth.password.toggle.a11y", bundle: .module))
      }
    }
  }
}
