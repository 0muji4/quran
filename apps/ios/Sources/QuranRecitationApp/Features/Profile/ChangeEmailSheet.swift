import SwiftUI

/// Change email: drives `POST /auth/me/email` through `ChangeEmailViewModel`.
/// Cancel dismisses without persisting; Save persists, then dismisses on
/// success and stays open with the error on failure.
struct ChangeEmailSheet: View {
  let viewModel: ChangeEmailViewModel
  let onDismiss: () -> Void

  var body: some View {
    ChangeEmailForm(
      newEmail: Binding(
        get: { viewModel.newEmail },
        set: { viewModel.newEmail = $0; viewModel.clearError() }),
      currentPassword: Binding(
        get: { viewModel.currentPassword },
        set: { viewModel.currentPassword = $0; viewModel.clearError() }),
      canSubmit: viewModel.canSubmit,
      isSubmitting: viewModel.isSubmitting,
      error: viewModel.status.errorMessage,
      onCancel: onDismiss,
      onSubmit: { Task { if await viewModel.submit() { onDismiss() } } }
    )
  }
}

/// The change-email form drawn from values, so any state renders without a
/// ViewModel: the new address first, then the current password to confirm it.
struct ChangeEmailForm: View {
  @Binding var newEmail: String
  @Binding var currentPassword: String
  let canSubmit: Bool
  let isSubmitting: Bool
  let error: String?
  let onCancel: () -> Void
  let onSubmit: () -> Void

  var body: some View {
    ProfileSheetForm(
      title: "profile.changeEmail.title", confirm: "profile.changeEmail.save",
      canSubmit: canSubmit, isSubmitting: isSubmitting, error: error,
      onCancel: onCancel, onSubmit: onSubmit
    ) {
      Section {
        TextField(text: $newEmail, prompt: Text("profile.changeEmail.field.new.placeholder", bundle: .module)) {
          Text("profile.changeEmail.field.new", bundle: .module)
        }
        .keyboardType(.emailAddress)
        .textContentType(.emailAddress)
        .textInputAutocapitalization(.never)
        .autocorrectionDisabled(true)
        .disabled(isSubmitting)
        .profileSheetRow()
      } header: {
        Text("profile.changeEmail.field.new", bundle: .module)
      } footer: {
        Text("profile.changeEmail.helper", bundle: .module)
      }
      Section {
        SecureField(text: $currentPassword, prompt: Text("profile.changeEmail.field.current.placeholder", bundle: .module)) {
          Text("profile.changeEmail.field.current", bundle: .module)
        }
        .textContentType(.password)
        .disabled(isSubmitting)
        .profileSheetRow()
      } header: {
        Text("profile.changeEmail.field.current", bundle: .module)
      } footer: {
        Text("profile.changeEmail.field.current.helper", bundle: .module)
      }
    }
  }
}

extension ChangeEmailViewModel.Status {
  /// The message of a failed save, or nil.
  var errorMessage: String? {
    if case .error(let message) = self { return message }
    return nil
  }
}
