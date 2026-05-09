import Foundation

/// State machine for the Practice screen. Replaces the legacy
/// `statusText: String` with a typed enum so the View switches
/// exhaustively and the analysing sub-steps have first-class
/// representation. See ADR 0005.
enum PracticeRecordingState: Equatable {
  case idle
  case recording(meters: [Float], duration: TimeInterval)
  case uploading
  case analysing(step: AnalysingStep)
  case done(score: Double?, jobId: String)
  case error(AppError)

  var isBusy: Bool {
    switch self {
    case .uploading, .analysing: return true
    default: return false
    }
  }

  static func == (lhs: PracticeRecordingState, rhs: PracticeRecordingState) -> Bool {
    switch (lhs, rhs) {
    case (.idle, .idle), (.uploading, .uploading): return true
    case let (.recording(lm, ld), .recording(rm, rd)):
      return lm == rm && ld == rd
    case let (.analysing(l), .analysing(r)): return l == r
    case let (.done(ls, lj), .done(rs, rj)): return ls == rs && lj == rj
    case let (.error(l), .error(r)): return l.telemetryCode == r.telemetryCode
    default: return false
    }
  }
}

/// Three-step progress shown while the worker scores a recording.
enum AnalysingStep: Hashable {
  case transcribing
  case comparing
  case calculating
}
