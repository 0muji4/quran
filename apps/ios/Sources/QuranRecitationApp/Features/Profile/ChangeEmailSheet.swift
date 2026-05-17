import SwiftUI

/// Modal sheet that drives `POST /auth/me/email`. Two fields:
/// current password (to re-verify intent) and the new address. The
/// BFF returns 422 (not 401) on a wrong current password so a
/// re-verification failure can't be mistaken for an expired access
/// token; `ProfileService.updateEmail` maps the 422 to
/// `AppError.invalidCredentials` for the banner.
struct ChangeEmailSheet: View {
  @ObservedObject var viewModel: ChangeEmailViewModel
  let onDismiss: () -> Void

  var body: some View {
    NavigationStack {
      Form {
        Section {
          SecureField(
            "profile.changeEmail.field.current.placeholder",
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
          Text("profile.changeEmail.field.current", bundle: .module)
        }

        Section {
          TextField(
            "profile.changeEmail.field.new.placeholder",
            text: Binding(
              get: { viewModel.newEmail },
              set: { newValue in
                viewModel.newEmail = newValue
                viewModel.clearError()
              }
            )
          )
          .keyboardType(.emailAddress)
          .textContentType(.emailAddress)
          .autocapitalization(.none)
          .autocorrectionDisabled(true)
          .disabled(viewModel.isSubmitting)
        } header: {
          Text("profile.changeEmail.field.new", bundle: .module)
        } footer: {
          Text("profile.changeEmail.helper", bundle: .module)
        }

        if case let .error(message) = viewModel.status {
          Section {
            Text(message)
              .font(Font.brand.caption)
              .foregroundColor(Color.brand.recording)
              .accessibilityIdentifier("profile.changeEmail.error")
          }
        }
      }
      .navigationTitle(Text("profile.changeEmail.title", bundle: .module))
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button {
            onDismiss()
          } label: {
            Text("profile.changeEmail.cancel", bundle: .module)
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
              Text("profile.changeEmail.save", bundle: .module)
            }
          }
          .disabled(!viewModel.canSubmit)
        }
      }
    }
  }
}
