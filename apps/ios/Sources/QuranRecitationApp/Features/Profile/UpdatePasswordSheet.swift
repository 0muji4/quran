import SwiftUI

/// Update password: drives the password update through
/// `UpdatePasswordViewModel`. Cancel dismisses without persisting; Update
/// persists, then dismisses on success and stays open with the error on failure.
struct UpdatePasswordSheet: View {
  let viewModel: UpdatePasswordViewModel
  let onDismiss: () -> Void

  var body: some View {
    UpdatePasswordForm(
      currentPassword: Binding(
        get: { viewModel.currentPassword },
        set: { viewModel.currentPassword = $0; viewModel.clearError() }),
      newPassword: Binding(
        get: { viewModel.newPassword },
        set: { viewModel.newPassword = $0; viewModel.clearError() }),
      confirmPassword: Binding(
        get: { viewModel.confirmPassword },
        set: { viewModel.confirmPassword = $0; viewModel.clearError() }),
      canSubmit: viewModel.canSubmit,
      isSubmitting: viewModel.isSubmitting,
      error: viewModel.status.errorMessage,
      onCancel: onDismiss,
      onSubmit: { Task { if await viewModel.submit() { onDismiss() } } }
    )
  }
}

/// The update-password form drawn from values, so any state renders without a
/// ViewModel.
struct UpdatePasswordForm: View {
  @Binding var currentPassword: String
  @Binding var newPassword: String
  @Binding var confirmPassword: String
  let canSubmit: Bool
  let isSubmitting: Bool
  let error: String?
  let onCancel: () -> Void
  let onSubmit: () -> Void

  var body: some View {
    ProfileSheetForm(
      title: "profile.updatePassword.title", confirm: "profile.updatePassword.save",
      canSubmit: canSubmit, isSubmitting: isSubmitting, error: error,
      onCancel: onCancel, onSubmit: onSubmit
    ) {
      field(
        $currentPassword, label: "profile.updatePassword.field.current",
        prompt: "profile.updatePassword.field.current.placeholder", content: .password)
      field(
        $newPassword, label: "profile.updatePassword.field.new",
        prompt: "profile.updatePassword.field.new.placeholder", content: .newPassword,
        footer: "profile.updatePassword.helper")
      field(
        $confirmPassword, label: "profile.updatePassword.field.confirm",
        prompt: "profile.updatePassword.field.confirm.placeholder", content: .newPassword)
    }
  }

  private func field(
    _ text: Binding<String>, label: LocalizedStringKey, prompt: LocalizedStringKey,
    content: UITextContentType, footer: LocalizedStringKey? = nil
  ) -> some View {
    Section {
      SecureField(text: text, prompt: Text(prompt, bundle: .module)) {
        Text(label, bundle: .module)
      }
      .textContentType(content)
      .disabled(isSubmitting)
      .profileSheetRow()
    } header: {
      Text(label, bundle: .module)
    } footer: {
      if let footer { Text(footer, bundle: .module) }
    }
  }
}

extension UpdatePasswordViewModel.Status {
  /// The message of a failed save, or nil.
  var errorMessage: String? {
    if case .error(let message) = self { return message }
    return nil
  }
}
