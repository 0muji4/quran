import SwiftUI

/// Edit profile: drives `PATCH /auth/me` through `EditProfileViewModel`.
/// Cancel dismisses without persisting; Save persists, then dismisses on
/// success and stays open with the error on failure.
struct EditProfileSheet: View {
  let viewModel: EditProfileViewModel
  let onDismiss: () -> Void

  var body: some View {
    EditProfileForm(
      displayName: Binding(
        get: { viewModel.displayName },
        set: { viewModel.displayName = $0; viewModel.clearError() }),
      level: Binding(
        get: { viewModel.level },
        set: { viewModel.level = $0; viewModel.clearError() }),
      canSubmit: viewModel.canSubmit,
      isSubmitting: viewModel.isSubmitting,
      error: viewModel.status.errorMessage,
      onCancel: onDismiss,
      onSubmit: { Task { if await viewModel.submit() { onDismiss() } } }
    )
  }
}

/// The edit-profile form drawn from values, so any state renders without a
/// ViewModel: the display name and a skill-level menu in one section, with
/// where to change everything else in the footer.
struct EditProfileForm: View {
  @Binding var displayName: String
  @Binding var level: String?
  let canSubmit: Bool
  let isSubmitting: Bool
  let error: String?
  let onCancel: () -> Void
  let onSubmit: () -> Void

  var body: some View {
    ProfileSheetForm(
      title: "profile.edit.title", confirm: "profile.edit.save",
      canSubmit: canSubmit, isSubmitting: isSubmitting, error: error,
      onCancel: onCancel, onSubmit: onSubmit
    ) {
      Section {
        TextField(text: $displayName, prompt: Text("profile.edit.displayName.placeholder", bundle: .module)) {
          Text("profile.edit.displayName.label", bundle: .module)
        }
        .textContentType(.name)
        .textInputAutocapitalization(.words)
        .disabled(isSubmitting)
        .profileSheetRow()
        Picker(selection: $level) {
          Text("profile.edit.level.unset", bundle: .module).tag(String?.none)
          ForEach(EditProfileViewModel.levelOptions, id: \.self) { option in
            Text(LocalizedStringKey(Self.levelLabelKey(option)), bundle: .module).tag(String?.some(option))
          }
        } label: {
          Text("profile.edit.level.label", bundle: .module)
        }
        .disabled(isSubmitting)
        .profileSheetRow()
      } footer: {
        VStack(alignment: .leading, spacing: AppTheme.Spacing.space3) {
          Text("profile.edit.displayName.helper", bundle: .module)
          elsewhere
        }
      }
    }
  }

  /// Where to change everything not edited here. Informational: the sheet is
  /// modal, so the section names are emphasised, not links.
  private var elsewhere: Text {
    Text("profile.edit.footer.lead", bundle: .module)
      + Text("profile.edit.footer.account", bundle: .module).fontWeight(.semibold)
      + Text("profile.edit.footer.mid", bundle: .module)
      + Text("profile.edit.footer.prefs", bundle: .module).fontWeight(.semibold)
      + Text(verbatim: ".")
  }

  private static func levelLabelKey(_ raw: String) -> String {
    switch raw {
    case "beginner": return "profile.badge.level.beginner"
    case "intermediate": return "profile.badge.level.intermediate"
    case "advanced": return "profile.badge.level.advanced"
    default: return "profile.edit.level.unset"
    }
  }
}

extension EditProfileViewModel.Status {
  /// The message of a failed save, or nil.
  var errorMessage: String? {
    if case .error(let message) = self { return message }
    return nil
  }
}
