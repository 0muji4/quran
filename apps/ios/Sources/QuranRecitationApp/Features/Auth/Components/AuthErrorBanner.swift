import SwiftUI

/// Coral alert box shown at the top of an auth form when a submit
/// fails. The iOS counterpart of the web form's red `role="alert"`
/// box: it surfaces the `AppError`'s localized title and recovery
/// suggestion from the shared error vocabulary.
struct AuthErrorBanner: View {
  let error: AppError

  var body: some View {
    HStack(alignment: .top, spacing: Spacing.sm) {
      Image(systemName: "exclamationmark.triangle.fill")
        .foregroundColor(Color.brand.recording)

      VStack(alignment: .leading, spacing: Spacing.xs) {
        Text(error.errorDescription ?? "")
          .font(Font.brand.body.weight(.semibold))
          .foregroundColor(Color.brand.textPrimary)
        if let recovery = error.recoverySuggestion {
          Text(recovery)
            .font(Font.brand.caption)
            .foregroundColor(Color.brand.textSecondary)
        }
      }
      Spacer(minLength: 0)
    }
    .padding(Spacing.md)
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(Color.brand.recording.opacity(0.10))
    .clipShape(RoundedRectangle(cornerRadius: Spacing.cardCornerRadius, style: .continuous))
    .accessibilityElement(children: .combine)
  }
}
