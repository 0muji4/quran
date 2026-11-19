import SwiftUI

/// The frame every Profile sheet shares on `AppTheme` (ADR 0030): a form in a
/// navigation stack with an inline title, Cancel, and the confirm action, which
/// is prominent (red when `destructive`) and becomes a spinner while
/// submitting. A failed save shows under the fields in the error colour.
struct ProfileSheetForm<Fields: View>: View {
  let title: LocalizedStringKey
  let confirm: LocalizedStringKey
  var destructive = false
  let canSubmit: Bool
  let isSubmitting: Bool
  let error: String?
  let onCancel: () -> Void
  let onSubmit: () -> Void
  @ViewBuilder let fields: () -> Fields

  var body: some View {
    NavigationStack {
      Form {
        fields()
        if let error {
          Section {
            Label {
              Text(verbatim: error)
            } icon: {
              Image(systemName: "exclamationmark.circle")
            }
            .font(AppTheme.Typography.subheadline)
            .foregroundStyle(AppTheme.Colors.error)
            .accessibilityAddTraits(.updatesFrequently)
          }
          .listRowBackground(Color.clear)
        }
      }
      .scrollContentBackground(.hidden)
      .background(AppTheme.Colors.surface.ignoresSafeArea())
      .tint(AppTheme.Colors.primary)
      .navigationTitle(Text(title, bundle: .module))
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button(action: onCancel) {
            Text("profile.sheet.cancel", bundle: .module)
          }
          .disabled(isSubmitting)
        }
        ToolbarItem(placement: .confirmationAction) {
          if isSubmitting {
            ProgressView()
          } else {
            Button(action: onSubmit) {
              Text(confirm, bundle: .module)
            }
            .buttonStyle(.borderedProminent)
            .tint(destructive ? AppTheme.Colors.error : AppTheme.Colors.primary)
            .disabled(!canSubmit)
          }
        }
      }
    }
  }
}

extension View {
  /// The row background every Profile sheet field sits on.
  func profileSheetRow() -> some View {
    listRowBackground(AppTheme.Colors.surfaceContainer)
  }
}
