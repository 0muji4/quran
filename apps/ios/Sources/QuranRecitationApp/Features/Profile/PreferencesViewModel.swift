import Foundation

/// Drives the Practice Preferences card with an optimistic-write model:
/// each edit applies locally at once, fires a single-field `PATCH`, and
/// rolls back with an error banner if the server rejects it.
@MainActor
final class PreferencesViewModel: ObservableObject {
  @Published private(set) var preferences: PracticePreferences
  /// Tracks whether the first GET has resolved so the card can show a
  /// spinner instead of flashing the optimistic defaults as if loaded.
  @Published private(set) var isLoaded = false
  @Published var errorMessage: String?

  private let meClient: MeClient

  init(meClient: MeClient, preferences: PracticePreferences = .default) {
    self.meClient = meClient
    self.preferences = preferences
  }

  /// Loads once per instance. A failed load keeps the defaults rather
  /// than blocking the card — the user has no row yet is the common
  /// case, and the BFF itself returns defaults for that, so a transient
  /// fetch error degrades to the same place.
  func loadIfNeeded() async {
    guard !isLoaded else { return }
    if let loaded = try? await meClient.preferences() {
      preferences = loaded
    }
    isLoaded = true
  }

  func setReciter(_ id: String) async {
    await apply(PracticePreferencesPatch(referenceReciterId: id)) { $0.referenceReciterId = id }
  }

  func setPlaybackSpeed(_ speed: Double) async {
    await apply(PracticePreferencesPatch(defaultPlaybackSpeed: speed)) { $0.defaultPlaybackSpeed = speed }
  }

  func setReminderEnabled(_ isOn: Bool) async {
    await apply(PracticePreferencesPatch(dailyReminderEnabled: isOn)) { $0.dailyReminderEnabled = isOn }
  }

  func setReminderTime(_ time: String) async {
    await apply(PracticePreferencesPatch(dailyReminderTime: time)) { $0.dailyReminderTime = time }
  }

  /// Apply `optimistic` locally, PATCH `patch`, and reconcile against
  /// the server's echo — or roll back to the pre-edit snapshot on
  /// failure. The echo (not the local guess) becomes the source of
  /// truth so a server-side normalisation (e.g. `1` → `1.00`) sticks.
  private func apply(
    _ patch: PracticePreferencesPatch,
    _ optimistic: (inout PracticePreferences) -> Void
  ) async {
    let previous = preferences
    optimistic(&preferences)
    errorMessage = nil
    do {
      preferences = try await meClient.updatePreferences(patch)
    } catch {
      preferences = previous
      errorMessage = Self.saveFailedMessage
    }
  }

  static let saveFailedMessage = "Couldn't save preference. Try again."
}
