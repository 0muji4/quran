import XCTest
import CoreGraphics
@testable import QuranRecitationApp

/// Pure-helper tests for the Practice progress bar indicator position.
/// Replaces the old 10-dot row which silently went all-grey for any
/// surah > 10 ayahs.
final class PracticeProgressIndicatorTests: XCTestCase {
  private let trackWidth: CGFloat = 250
  private let diameter: CGFloat = 10  // mirrors PracticeContent.indicatorDiameter

  func test_firstAyah_pinnedToLeftEdge() {
    let offset = PracticeContent.indicatorOffset(
      currentAyahNumber: 1,
      ayahCount: 7,
      trackWidth: trackWidth
    )
    XCTAssertEqual(offset, 0, "ayah 1 sits at the track's left edge")
  }

  func test_finalAyah_flushAgainstRightEdge() {
    // The indicator's leading edge stops at `trackWidth - diameter`
    // so the circle sits *inside* the bar instead of clipping past
    // the right end.
    let offset = PracticeContent.indicatorOffset(
      currentAyahNumber: 286,
      ayahCount: 286,
      trackWidth: trackWidth
    )
    XCTAssertEqual(offset, trackWidth - diameter)
  }

  func test_longSurah_midPoint_lands_between_edges() {
    // The old dot row would have rendered all-grey here because no
    // index ∈ [0,9] satisfied `index + 1 == 47`. Bar version places
    // the indicator at a deterministic fraction along the track.
    let offset = PracticeContent.indicatorOffset(
      currentAyahNumber: 47,
      ayahCount: 286,
      trackWidth: trackWidth
    )
    let expected = CGFloat(46) / CGFloat(285) * (trackWidth - diameter)
    XCTAssertEqual(offset, expected, accuracy: 0.0001)
    XCTAssertGreaterThan(offset, 0)
    XCTAssertLessThan(offset, trackWidth - diameter)
  }

  func test_singleAyahSurah_pinnedToLeft() {
    // ayahCount == 1 would divide by zero in the linear-scale
    // formula. Pin to the left and bail out cleanly.
    let offset = PracticeContent.indicatorOffset(
      currentAyahNumber: 1,
      ayahCount: 1,
      trackWidth: trackWidth
    )
    XCTAssertEqual(offset, 0)
  }

  func test_ayahPastFinal_clampsToTheRight() {
    // Defensive: a stale ViewModel that somehow surfaces an
    // out-of-range ayah must not push the indicator past the bar.
    let offset = PracticeContent.indicatorOffset(
      currentAyahNumber: 999,
      ayahCount: 286,
      trackWidth: trackWidth
    )
    XCTAssertEqual(offset, trackWidth - diameter)
  }

  func test_ayahBeforeFirst_clampsToTheLeft() {
    let offset = PracticeContent.indicatorOffset(
      currentAyahNumber: 0,
      ayahCount: 7,
      trackWidth: trackWidth
    )
    XCTAssertEqual(offset, 0)
  }

  func test_tinyTrackWidth_pinsToLeft() {
    // If a layout pass hands us a track narrower than the
    // indicator, fall back to the left edge so the math stays
    // non-negative.
    let offset = PracticeContent.indicatorOffset(
      currentAyahNumber: 5,
      ayahCount: 7,
      trackWidth: 4
    )
    XCTAssertEqual(offset, 0)
  }

  // MARK: - Segmented vs. continuous threshold

  func test_shortSurah_usesSegments() {
    // Al-Fatihah (7) and any surah up to the 12-ayah cutoff render
    // as discrete pill segments.
    XCTAssertTrue(PracticeContent.usesSegmentedProgress(ayahCount: 7))
    XCTAssertTrue(PracticeContent.usesSegmentedProgress(ayahCount: 1))
  }

  func test_atThreshold_stillSegmented() {
    // The boundary is inclusive (≤ 12), matching Android's
    // `ayahCount <= MAX_SEGMENTS`.
    XCTAssertEqual(PracticeContent.maxSegments, 12)
    XCTAssertTrue(PracticeContent.usesSegmentedProgress(ayahCount: 12))
  }

  func test_longSurah_usesContinuousBar() {
    // One past the threshold flips to the bar; Al-Baqarah (286) too.
    XCTAssertFalse(PracticeContent.usesSegmentedProgress(ayahCount: 13))
    XCTAssertFalse(PracticeContent.usesSegmentedProgress(ayahCount: 286))
  }
}
