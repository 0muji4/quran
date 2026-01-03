import Foundation

/// Scoring segment data intended for non-UI use (data processing, analytics, etc.).
struct ScoreSegmentData {
  let label: String
  let score: Double
}

extension ScoringResultPayload {
  /// Returns label/score pairs without tying callers to UI-specific types.
  func segmentLabelScores() -> [ScoreSegmentData] {
    segments.map { ScoreSegmentData(label: $0.label, score: $0.score) }
  }
}
