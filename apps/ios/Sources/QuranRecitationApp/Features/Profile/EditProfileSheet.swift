import SwiftUI

/// Modal sheet that drives `PATCH /auth/me`. Brand-styled: a cream
/// surface (not the default grouped-table grey), a centred gradient
/// avatar with a "Change photo" affordance, "PROFILE"-overlined
/// disclosure rows for the two editable fields, and a footer that points
/// at the other Profile sections for everything not edited here. Cancel
/// dismisses without persisting; Save persists then dismisses on success,
/// leaving the sheet open with an error banner on failure.
struct EditProfileSheet: View {
  @ObservedObject var viewModel: EditProfileViewModel
  let onDismiss: () -> Void

  var body: some View {
    NavigationStack {
      ScrollView {
        VStack(spacing: Spacing.xl) {
          avatarSection

          VStack(alignment: .leading, spacing: Spacing.md) {
            ProfileSectionLabel("profile.edit.section")
            fieldsCard
            crossLinkFooter
          }

          if case let .error(message) = viewModel.status {
            Text(message)
              .font(Font.brand.caption)
              .foregroundColor(Color.brand.recording)
              .frame(maxWidth: .infinity, alignment: .leading)
              .accessibilityIdentifier("profile.edit.error")
          }
        }
        .padding(.horizontal, Spacing.screenHorizontal)
        .padding(.vertical, Spacing.lg)
        .frame(maxWidth: .infinity, alignment: .leading)
      }
      .background(Color.brand.surface.ignoresSafeArea())
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
                .fontWeight(.semibold)
            }
          }
          .tint(Color.brand.primary)
          .disabled(!viewModel.canSubmit)
        }
      }
    }
  }

  // MARK: - Sections

  private var avatarSection: some View {
    VStack(spacing: Spacing.sm) {
      BrandAvatar(initial: viewModel.avatarInitial, size: 96, showsCompass: true)
      // Photo upload isn't built yet (no avatar storage on the backend).
      // TODO(profile-photo): wire to an image picker + upload once the
      // avatar-asset endpoint lands; until then the affordance is shown
      // per the design but inert.
      Text("profile.edit.changePhoto", bundle: .module)
        .font(Font.brand.caption.weight(.semibold))
        .foregroundColor(Color.brand.primary)
    }
  }

  private var fieldsCard: some View {
    VStack(spacing: Spacing.md) {
      displayNameRow
      Divider().background(Color.brand.tile)
      levelRow
    }
    .padding(Spacing.lg)
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(Color.brand.card)
    .clipShape(RoundedRectangle(cornerRadius: Spacing.cardCornerRadius, style: .continuous))
  }

  /// Display name — overline + inline-editable value. Directly editable
  /// (rather than pushing a sub-screen) keeps the single PATCH flow the
  /// ViewModel already owns.
  private var displayNameRow: some View {
    VStack(alignment: .leading, spacing: Spacing.xs) {
      fieldOverline("profile.edit.displayName.label")
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
      .font(Font.brand.body)
      .foregroundColor(Color.brand.textPrimary)
      .textContentType(.name)
      .autocapitalization(.words)
      .disabled(viewModel.isSubmitting)
    }
    .frame(maxWidth: .infinity, alignment: .leading)
  }

  /// Skill level — overline + a menu showing the current value and a
  /// disclosure chevron, matching the mock's value+chevron row.
  private var levelRow: some View {
    Menu {
      Button {
        viewModel.level = nil
        viewModel.clearError()
      } label: {
        Text("profile.edit.level.unset", bundle: .module)
      }
      ForEach(EditProfileViewModel.levelOptions, id: \.self) { option in
        Button {
          viewModel.level = option
          viewModel.clearError()
        } label: {
          Text(LocalizedStringKey(Self.levelLabelKey(option)), bundle: .module)
        }
      }
    } label: {
      VStack(alignment: .leading, spacing: Spacing.xs) {
        fieldOverline("profile.edit.level.label")
        HStack {
          Text(LocalizedStringKey(Self.levelLabelKey(viewModel.level ?? "")), bundle: .module)
            .font(Font.brand.body)
            .foregroundColor(Color.brand.textPrimary)
          Spacer()
          Image(systemName: "chevron.right")
            .font(.system(size: 13, weight: .semibold))
            .foregroundColor(Color.brand.textSecondary)
        }
      }
      .frame(maxWidth: .infinity, alignment: .leading)
      .contentShape(Rectangle())
    }
    .disabled(viewModel.isSubmitting)
  }

  /// Footer pointing at the sibling Profile sections for everything not
  /// edited here. Informational (the sheet is modal, so these aren't
  /// navigable links) — the destination names are tinted to read as
  /// references, matching the design.
  private var crossLinkFooter: some View {
    (
      Text("profile.edit.footer.lead", bundle: .module)
        + Text("profile.edit.footer.account", bundle: .module).foregroundColor(Color.brand.primary)
        + Text("profile.edit.footer.mid", bundle: .module)
        + Text("profile.edit.footer.prefs", bundle: .module).foregroundColor(Color.brand.primary)
        + Text(verbatim: ".")
    )
    .font(Font.brand.caption)
    .foregroundColor(Color.brand.textSecondary)
    .fixedSize(horizontal: false, vertical: true)
  }

  private func fieldOverline(_ key: String) -> some View {
    Text(LocalizedStringKey(key), bundle: .module)
      .font(.system(size: 11, weight: .semibold))
      .textCase(.uppercase)
      .tracking(0.6)
      .foregroundColor(Color.brand.textSecondary)
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
