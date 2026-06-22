import SwiftUI

/// Practice Preferences card on the Profile tab: reference reciter,
/// default playback speed, and a daily reminder (time picker shown only
/// when enabled). Every control writes through `PreferencesViewModel`,
/// which persists optimistically to `PATCH /me/preferences`.
struct PracticePreferencesCard: View {
  @ObservedObject var viewModel: PreferencesViewModel

  var body: some View {
    VStack(alignment: .leading, spacing: Spacing.md) {
      ProfileSectionLabel("profile.section.preferences")

      VStack(spacing: Spacing.md) {
        reciterRow
        divider
        speedRow
        divider
        reminderRow
        if viewModel.preferences.dailyReminderEnabled {
          divider
          reminderTimeRow
        }
      }
      .padding(Spacing.lg)
      .frame(maxWidth: .infinity, alignment: .leading)
      .background(Color.brand.card)
      .clipShape(RoundedRectangle(cornerRadius: Spacing.cardCornerRadius, style: .continuous))

      if let error = viewModel.errorMessage {
        Text(error)
          .font(Font.brand.caption)
          .foregroundColor(Color.brand.recording)
          .accessibilityIdentifier("profile.preferences.error")
      }
    }
    .task { await viewModel.loadIfNeeded() }
  }

  private var divider: some View { Divider().background(Color.brand.tile) }

  // MARK: - Rows

  /// Reference reciter — a menu over the (currently single-entry)
  /// reciter list. Disclosure style: label on the left, the chosen
  /// value + chevron on the right.
  private var reciterRow: some View {
    Menu {
      ForEach(ReciterOption.all) { option in
        Button {
          Task { await viewModel.setReciter(option.id) }
        } label: {
          if option.id == viewModel.preferences.referenceReciterId {
            Label(option.label, systemImage: "checkmark")
          } else {
            Text(option.label)
          }
        }
      }
    } label: {
      PreferenceDisclosureRow(
        labelKey: "profile.preferences.reciter.label",
        value: ReciterOption.option(for: viewModel.preferences.referenceReciterId).label
      )
    }
  }

  /// Default playback speed — a menu over the discrete speed steps.
  private var speedRow: some View {
    Menu {
      ForEach(PlaybackSpeedOption.all, id: \.self) { speed in
        Button {
          Task { await viewModel.setPlaybackSpeed(speed) }
        } label: {
          if speed == viewModel.preferences.defaultPlaybackSpeed {
            Label(PlaybackSpeedOption.label(speed), systemImage: "checkmark")
          } else {
            Text(PlaybackSpeedOption.label(speed))
          }
        }
      }
    } label: {
      PreferenceDisclosureRow(
        labelKey: "profile.preferences.speed.label",
        value: PlaybackSpeedOption.label(viewModel.preferences.defaultPlaybackSpeed)
      )
    }
  }

  private var reminderRow: some View {
    Toggle(isOn: reminderEnabledBinding) {
      VStack(alignment: .leading, spacing: Spacing.xs) {
        Text("profile.preferences.reminder.label", bundle: .module)
          .font(Font.brand.body)
          .foregroundColor(Color.brand.textPrimary)
        Text("profile.preferences.reminder.helper", bundle: .module)
          .font(Font.brand.caption)
          .foregroundColor(Color.brand.textSecondary)
          .fixedSize(horizontal: false, vertical: true)
      }
    }
    .tint(Color.brand.primary)
  }

  private var reminderTimeRow: some View {
    DatePicker(
      selection: reminderTimeBinding,
      displayedComponents: .hourAndMinute
    ) {
      Text("profile.preferences.reminderTime.label", bundle: .module)
        .font(Font.brand.body)
        .foregroundColor(Color.brand.textPrimary)
    }
  }

  // MARK: - Bindings

  private var reminderEnabledBinding: Binding<Bool> {
    Binding(
      get: { viewModel.preferences.dailyReminderEnabled },
      set: { isOn in Task { await viewModel.setReminderEnabled(isOn) } }
    )
  }

  /// Bridges the stored "HH:mm" string and the `DatePicker`'s `Date`.
  /// Only the hour/minute components matter, so the date portion is
  /// anchored to "today" — the picker ignores everything but the clock.
  private var reminderTimeBinding: Binding<Date> {
    Binding(
      get: {
        let (hour, minute) = ReminderClock.parse(viewModel.preferences.dailyReminderTime)
        return Calendar.current.date(
          bySettingHour: hour, minute: minute, second: 0, of: Date()
        ) ?? Date()
      },
      set: { date in
        let components = Calendar.current.dateComponents([.hour, .minute], from: date)
        let time = ReminderClock.format(
          hour: components.hour ?? 8,
          minute: components.minute ?? 0
        )
        Task { await viewModel.setReminderTime(time) }
      }
    )
  }
}

/// A label-left / value-right disclosure row used by the menu-backed
/// preferences (reciter, speed). The trailing chevron signals "tap to
/// choose", matching the Android `ChevronRow`.
private struct PreferenceDisclosureRow: View {
  let labelKey: String
  let value: String

  var body: some View {
    HStack(spacing: Spacing.md) {
      Text(LocalizedStringKey(labelKey), bundle: .module)
        .font(Font.brand.body)
        .foregroundColor(Color.brand.textPrimary)
      Spacer(minLength: Spacing.md)
      Text(value)
        .font(Font.brand.body)
        .foregroundColor(Color.brand.textSecondary)
      Image(systemName: "chevron.right")
        .font(.system(size: 13, weight: .semibold))
        .foregroundColor(Color.brand.textSecondary)
    }
    .contentShape(Rectangle())
  }
}
