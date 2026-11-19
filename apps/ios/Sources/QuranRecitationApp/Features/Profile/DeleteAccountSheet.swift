import SwiftUI

/// Delete account: drives the soft delete through `DeleteAccountViewModel`.
/// It leads with what deleting does and enables its red Delete only once
/// DELETE is typed.
struct DeleteAccountSheet: View {
  let viewModel: DeleteAccountViewModel
  let onDismiss: () -> Void

  var body: some View {
    DeleteAccountForm(
      confirmText: Binding(
        get: { viewModel.confirmText },
        set: { viewModel.confirmText = $0; viewModel.clearError() }),
      canSubmit: viewModel.canSubmit,
      isSubmitting: viewModel.isSubmitting,
      error: viewModel.status.errorMessage,
      onCancel: onDismiss,
      onSubmit: { Task { if await viewModel.submit() { onDismiss() } } }
    )
  }
}

/// The delete-account form drawn from values, so any state renders without a
/// ViewModel.
struct DeleteAccountForm: View {
  @Binding var confirmText: String
  let canSubmit: Bool
  let isSubmitting: Bool
  let error: String?
  let onCancel: () -> Void
  let onSubmit: () -> Void

  var body: some View {
    ProfileSheetForm(
      title: "profile.deleteAccount.title", confirm: "profile.deleteAccount.confirm", destructive: true,
      canSubmit: canSubmit, isSubmitting: isSubmitting, error: error,
      onCancel: onCancel, onSubmit: onSubmit
    ) {
      Section {
        HStack(alignment: .top, spacing: AppTheme.Spacing.space3) {
          Image(systemName: "exclamationmark.triangle")
            .font(AppTheme.Typography.title3)
            .foregroundStyle(AppTheme.Colors.error)
            .accessibilityHidden(true)
          VStack(alignment: .leading, spacing: AppTheme.Spacing.space1) {
            Text("profile.deleteAccount.warning.title", bundle: .module)
              .font(AppTheme.Typography.headline)
              .foregroundStyle(AppTheme.Colors.onSurface)
            Text("profile.deleteAccount.warning.body", bundle: .module)
              .font(AppTheme.Typography.subheadline)
              .foregroundStyle(AppTheme.Colors.onSurfaceVariant)
              .fixedSize(horizontal: false, vertical: true)
          }
        }
        .padding(.vertical, AppTheme.Spacing.space1)
        .accessibilityElement(children: .combine)
        .profileSheetRow()
      }
      Section {
        TextField(text: $confirmText, prompt: Text("profile.deleteAccount.confirm.placeholder", bundle: .module)) {
          Text("profile.deleteAccount.confirm.header", bundle: .module)
        }
        .textInputAutocapitalization(.characters)
        .autocorrectionDisabled(true)
        .disabled(isSubmitting)
        .profileSheetRow()
      } header: {
        Text("profile.deleteAccount.confirm.header", bundle: .module)
      } footer: {
        Text("profile.deleteAccount.confirm.helper", bundle: .module)
      }
    }
  }
}

extension DeleteAccountViewModel.Status {
  /// The message of a failed delete, or nil.
  var errorMessage: String? {
    if case .error(let message) = self { return message }
    return nil
  }
}
