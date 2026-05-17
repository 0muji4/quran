import SwiftUI

/// Modal sheet that drives `PATCH /auth/me`. Two fields — display name
/// and skill level — mirror the web `EditProfileButton` modal. Cancel
/// dismisses without persisting; Save persists then dismisses on
/// success, leaving the sheet open with an error banner on failure.
struct EditProfileSheet: View {
  @ObservedObject var viewModel: EditProfileViewModel
  let onDismiss: () -> Void

  var body: some View {
    NavigationStack {
      Form {
        Section {
          TextField(
            "profile.edit.displayName.placeholder",
            text: Binding(
              get: { viewModel.displayName },
              set: { newValue in
                viewModel.displayName = newValue
                viewModel.clearError()
              }
            )
          )
          .textContentType(.name)
          .autocapitalization(.words)
          .disabled(viewModel.isSubmitting)
        } header: {
          Text("profile.edit.displayName.label", bundle: .module)
        } footer: {
          Text("profile.edit.displayName.helper", bundle: .module)
        }

        Section {
          Picker(
            selection: Binding(
              get: { viewModel.level ?? "" },
              set: { newValue in
                viewModel.level = newValue.isEmpty ? nil : newValue
                viewModel.clearError()
              }
            )
          ) {
            Text("profile.edit.level.unset", bundle: .module).tag("")
            ForEach(EditProfileViewModel.levelOptions, id: \.self) { option in
              Text(LocalizedStringKey(Self.levelLabelKey(option)), bundle: .module).tag(option)
            }
          } label: {
            Text("profile.edit.level.label", bundle: .module)
          }
          .pickerStyle(.segmented)
          .disabled(viewModel.isSubmitting)
        } header: {
          Text("profile.edit.level.label", bundle: .module)
        }

        if case let .error(message) = viewModel.status {
          Section {
            Text(message)
              .font(Font.brand.caption)
              .foregroundColor(Color.brand.recording)
              .accessibilityIdentifier("profile.edit.error")
          }
        }
      }
      .navigationTitle(Text("profile.edit.title", bundle: .module))
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button {
            onDismiss()
          } label: {
            Text("profile.edit.cancel", bundle: .module)
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
              Text("profile.edit.save", bundle: .module)
            }
          }
          .disabled(!viewModel.canSubmit)
        }
      }
    }
  }

  private static func levelLabelKey(_ raw: String) -> String {
    switch raw {
    case "beginner": return "profile.badge.level.beginner"
    case "intermediate": return "profile.badge.level.intermediate"
    case "advanced": return "profile.badge.level.advanced"
    default: return raw
    }
  }
}
