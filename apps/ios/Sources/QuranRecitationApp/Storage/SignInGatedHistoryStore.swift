import Foundation

/// Decorator that gates every `HistoryStore` operation by the signed-in
/// state of the current session. Reads return nil / empty for
/// anonymous users, writes are silently dropped, and `clear()` always
/// delegates to the base so callers can wipe the cache irrespective
/// of session state (used on sign-out — see `AppRoot`).
///
/// Why a decorator rather than inline gates at each ViewModel call
/// site: a new write path could be added later and forget the
/// `session.isSignedIn` check; centralising the gate at the storage
/// seam prevents that drift. ADR 0021 §"Decision (1)" defines the
/// invariant the gate enforces.
///
/// `isSignedIn` is a closure rather than a `SessionStore` reference
/// so the gate keeps no opinion on how signed-in state is observed —
/// tests pass `{ false }` / `{ true }` directly, and production
/// captures `session.isSignedIn`. The closure runs on whatever actor
/// the caller is on; in practice ViewModels are `@MainActor` and the
/// captured `SessionStore` is `@MainActor`, so the access is already
/// linearised.
final class SignInGatedHistoryStore: HistoryStore {
  private let base: HistoryStore
  private let isSignedIn: () -> Bool

  init(base: HistoryStore, isSignedIn: @escaping () -> Bool) {
    self.base = base
    self.isSignedIn = isSignedIn
  }

  // MARK: - LastPracticed

  func lastPracticed() -> LastPracticed? {
    guard isSignedIn() else { return nil }
    return base.lastPracticed()
  }

  func setLastPracticed(_ entry: LastPracticed) {
    guard isSignedIn() else { return }
    base.setLastPracticed(entry)
  }

  // MARK: - BestScores

  func bestScore(surahId: String, ayahNumber: Int) -> BestScoreEntry? {
    guard isSignedIn() else { return nil }
    return base.bestScore(surahId: surahId, ayahNumber: ayahNumber)
  }

  func bestScore(forSurah surahId: String) -> Double? {
    guard isSignedIn() else { return nil }
    return base.bestScore(forSurah: surahId)
  }

  func recordBestScore(surahId: String, ayahNumber: Int, score: Double, achievedAt: Date) {
    guard isSignedIn() else { return }
    base.recordBestScore(surahId: surahId, ayahNumber: ayahNumber, score: score, achievedAt: achievedAt)
  }

  // MARK: - Attempts

  func recentAttempts(limit: Int) -> [Attempt] {
    guard isSignedIn() else { return [] }
    return base.recentAttempts(limit: limit)
  }

  func recordAttempt(_ attempt: Attempt) {
    guard isSignedIn() else { return }
    base.recordAttempt(attempt)
  }

  // MARK: - Clear

  /// Always delegates to the base — callers (sign-out) need to wipe
  /// the cache **regardless** of the current session state, otherwise
  /// a race where `isSignedIn` flips before `clear()` lands would
  /// strand the previous user's records.
  func clear() {
    base.clear()
  }

  /// Delegates without gating. AppRoot calls this exactly when the
  /// gate is about to flip to signed-in, so a guard here would race
  /// the bridge that flips it.
  @MainActor
  func refreshFromRemote() async {
    await base.refreshFromRemote()
  }
}
