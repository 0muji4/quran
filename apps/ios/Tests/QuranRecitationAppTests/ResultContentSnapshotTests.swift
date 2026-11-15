import SwiftUI
import XCTest
@testable import QuranRecitationApp

/// Renders the Result screen in each state and score band, in every
/// `RenderVariant` (ADR 0027).
@MainActor
final class ResultContentSnapshotTests: XCTestCase {
  func test_great() {
    snapshot(
      loaded(
        score: 87, accuracy: 0.89, cer: 0.08, completeness: 1, wer: 0.25,
        words: [
          .init(refWord: Self.w1, hypWord: Self.w1, op: "match"),
          .init(refWord: Self.w2, hypWord: Self.w2, op: "match"),
          .init(refWord: Self.w3, hypWord: "رَبِّي", op: "sub"),
          .init(refWord: Self.w4, hypWord: Self.w4, op: "match"),
        ]))
  }

  func test_midway() {
    snapshot(
      loaded(
        score: 58, accuracy: 0.62, cer: 0.29, completeness: 0.75, wer: 0.5,
        words: [
          .init(refWord: Self.w1, hypWord: Self.w1, op: "match"),
          .init(refWord: Self.w2, hypWord: "لِلَّه", op: "sub"),
          .init(refWord: Self.w3, hypWord: nil, op: "del"),
          .init(refWord: Self.w4, hypWord: Self.w4, op: "match"),
        ]))
  }

  func test_beginner() {
    snapshot(
      loaded(
        score: 32, accuracy: 0.35, cer: 0.52, completeness: 0.5, wer: 1,
        words: [
          .init(refWord: Self.w1, hypWord: "الحمد", op: "sub"),
          .init(refWord: Self.w2, hypWord: nil, op: "del"),
          .init(refWord: Self.w3, hypWord: nil, op: "del"),
          .init(refWord: Self.w4, hypWord: Self.w4, op: "match"),
          .init(refWord: nil, hypWord: "يَا", op: "ins"),
        ]))
  }

  func test_loading() { snapshot(.loading) }

  func test_failed() { snapshot(.failed(.network(underlying: URLError(.notConnectedToInternet)))) }

  private func snapshot(
    _ state: ResultDetailViewModel.LoadState,
    testName: String = #function,
    line: UInt = #line
  ) {
    let content = ResultContent(state: state, ayahNumber: 2, onTryAgain: {}, onContinue: {})
    // Pushed onto a navigation stack, as from Practice, so the bar is drawn
    // with the system back button; at the height of the pinned simulator's
    // screen (iPhone 17 Pro), so the buttons sit at the bottom edge as on a
    // device.
    let screen = NavigationStack(path: .constant([1])) {
      Color.clear.navigationDestination(for: Int.self) { _ in content }
    }
    .frame(height: 874)
    .frame(maxHeight: .infinity, alignment: .top)
    for variant in RenderVariant.all {
      assertSnapshot(of: screen, in: variant, testName: testName, line: line)
    }
  }

  private func loaded(
    score: Int,
    accuracy: Double,
    cer: Double,
    completeness: Double,
    wer: Double,
    words: [WordAlignmentPayload]
  ) -> ResultDetailViewModel.LoadState {
    .loaded(
      ScoringResultPayload(
        jobId: "job-1",
        status: .completed,
        score: score,
        verdict: nil,
        segments: [],
        feedback: PronunciationFeedbackPayload(
          accuracy: accuracy,
          completeness: completeness,
          overall: Double(score) / 100,
          referenceAudioUrl: "https://example.com/teacher.mp3",
          transcript: nil,
          wer: wer,
          cer: cer,
          wordAlignments: words
        )
      ))
  }

  // 1:2, "al-ḥamdu lillāhi rabbi l-ʿālamīn".
  private static let w1 = "ٱلْحَمْدُ"
  private static let w2 = "لِلَّهِ"
  private static let w3 = "رَبِّ"
  private static let w4 = "ٱلْعَٰلَمِينَ"
}
