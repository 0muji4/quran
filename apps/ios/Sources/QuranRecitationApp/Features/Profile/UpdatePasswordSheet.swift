import SwiftUI

/// Modal sheet that drives `POST /auth/me/password`. Three secure
/// fields (current, new, confirm) + client-side preflight that runs
/// before the network call. Successful submit dismisses; failure
/// leaves the sheet open with an error banner.
struct UpdatePasswordSheet: View {
  @ObservedObject var viewModel: UpdatePasswordViewModel
  let onDismiss: () -> Void

  var body: some View {
    NavigationStack {
      Form {
        Section {
          SecureField(
            "profile.updatePassword.field.current.placeholder",
            text: Binding(
              get: { viewModel.currentPassword },
              set: { newValue in
                viewModel.currentPassword = newValue
                viewModel.clearError()
              }
            )
          )
          .textContentType(.password)
          .disabled(viewModel.isSubmitting)
        } header: {
          Text("profile.updatePassword.field.current", bundle: .module)
        }

        Section {
          SecureField(
            "profile.updatePassword.field.new.placeholder",
            text: Binding(
              get: { viewModel.newPassword },
              set: { newValue in
                viewModel.newPassword = newValue
                viewModel.clearError()
              }
            )
          )
          .textContentType(.newPassword)
          .disabled(viewModel.isSubmitting)
        } header: {
          Text("profile.updatePassword.field.new", bundle: .module)
        } footer: {
          Text("profile.updatePassword.helper", bundle: .module)
        }

        Section {
          SecureField(
            "profile.updatePassword.field.confirm.placeholder",
            text: Binding(
              get: { viewModel.confirmPassword },
              set: { newValue in
                viewModel.confirmPassword = newValue
                viewModel.clearError()
              }
            )
          )
          .textContentType(.newPassword)
          .disabled(viewModel.isSubmitting)
        } header: {
          Text("profile.updatePassword.field.confirm", bundle: .module)
        }

        if case let .error(message) = viewModel.status {
          Section {
            Text(message)
              .font(Font.brand.caption)
              .foregroundColor(Color.brand.recording)
              .accessibilityIdentifier("profile.updatePassword.error")
          }
        }
      }
      .navigationTitle(Text("profile.updatePassword.title", bundle: .module))
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button {
            onDismiss()
          } label: {
            Text("profile.updatePassword.cancel", bundle: .module)
          }
          .disabled(viewModel.isSubmitting)
        }
        ToolbarItem(placement: .confirmationAction) {
          Button {
            Task {
              if await viewModel.submit() {
                onDismiss()
              }
            }
          } label: {
            if viewModel.isSubmitting {
              ProgressView()
            } else {
              Text("profile.updatePassword.save", bundle: .module)
            }
          }
          .disabled(!viewModel.canSubmit)
        }
      }
    }
  }
}
