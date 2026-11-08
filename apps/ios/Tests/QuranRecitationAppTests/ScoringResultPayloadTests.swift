import XCTest
@testable import QuranRecitationApp

final class ScoringResultPayloadTests: XCTestCase {

  func test_scoreOutOf100_convertsFractionToRoundedPercent() {
    XCTAssertEqual(ScoringResultPayload.scoreOutOf100(0.82), 82)
    XCTAssertEqual(ScoringResultPayload.scoreOutOf100(0.825), 83)
    XCTAssertEqual(ScoringResultPayload.scoreOutOf100(0), 0)
    XCTAssertEqual(ScoringResultPayload.scoreOutOf100(1), 100)
  }

  func test_scoreOutOf100_returnsNil_whenScoreIsMissingOrNaN() {
    XCTAssertNil(ScoringResultPayload.scoreOutOf100(nil))
    XCTAssertNil(ScoringResultPayload.scoreOutOf100(.nan))
  }
}
