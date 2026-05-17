import SwiftUI

/// Modal sheet that drives `DELETE /auth/me`. Two-section layout:
/// an explanation of the 30-day grace window, then a type-to-confirm
/// field that gates the destructive button. Mirrors the web Delete
/// Account modal.
struct DeleteAccountSheet: View {
  @ObservedObject var viewModel: DeleteAccountViewModel
  let onDismiss: () -> Void

  var body: some View {
    NavigationStack {
      Form {
        Section {
          VStack(alignment: .leading, spacing: Spacing.sm) {
            Text("profile.deleteAccount.warning.title", bundle: .module)
              .font(Font.brand.body.weight(.semibold))
              .foregroundColor(Color.brand.textPrimary)
            Text("profile.deleteAccount.warning.body", bundle: .module)
              .font(Font.brand.caption)
              .foregroundColor(Color.brand.textSecondary)
              .fixedSize(horizontal: false, vertical: true)
          }
          .padding(.vertical, Spacing.xs)
        }

        Section {
          TextField(
            "profile.deleteAccount.confirm.placeholder",
            text: Binding(
              get: { viewModel.confirmText },
              set: { newValue in
                viewModel.confirmText = newValue
                viewModel.clearError()
              }
            )
          )
          .textInputAutocapitalization(.characters)
          .autocorrectionDisabled(true)
          .disabled(viewModel.isSubmitting)
        } header: {
          Text("profile.deleteAccount.confirm.header", bundle: .module)
        } footer: {
          Text("profile.deleteAccount.confirm.helper", bundle: .module)
        }

        if case let .error(message) = viewModel.status {
          Section {
            Text(message)
              .font(Font.brand.caption)
              .foregroundColor(Color.brand.recording)
              .accessibilityIdentifier("profile.deleteAccount.error")
          }
        }
      }
      .navigationTitle(Text("profile.deleteAccount.title", bundle: .module))
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button {
            onDismiss()
          } label: {
            Text("profile.deleteAccount.cancel", bundle: .module)
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
              Text("profile.deleteAccount.confirm", bundle: .module)
                .foregroundColor(Color.brand.recording)
            }
          }
          .disabled(!viewModel.canSubmit)
        }
      }
    }
  }
}
