import XCTest
@testable import QuranRecitationApp

/// Mirrors `apps/web/app/(app)/practice/result/__tests__/verdict.test.ts`
/// so a divergence between the two clients' verdict tables shows up as
/// a failing test on the platform that drifted.
final class VerdictTests: XCTestCase {
  func test_nilScore_returnsAwaitingBadge() {
    XCTAssertEqual(verdictForScore(nil).badge, "Awaiting score")
  }

  func test_mastered_bandFor90AndAbove() {
    XCTAssertEqual(verdictForScore(90).badge, "Mashallah — mastered")
    XCTAssertEqual(verdictForScore(100).badge, "Mashallah — mastered")
  }

  func test_great_bandFor70Through89() {
    XCTAssertEqual(verdictForScore(70).badge, "Mashallah — well recited")
    XCTAssertEqual(verdictForScore(89).badge, "Mashallah — well recited")
  }

  func test_keepPractising_midBandFor40Through69() {
    XCTAssertEqual(verdictForScore(40).badge, "Keep practising")
    XCTAssertEqual(verdictForScore(69).badge, "Keep practising")
    XCTAssertTrue(verdictForScore(52).headline.contains("Some work"))
  }

  func test_keepGoing_lowBandBelow40() {
    XCTAssertEqual(verdictForScore(0).badge, "Keep going")
    XCTAssertEqual(verdictForScore(39).badge, "Keep going")
    XCTAssertTrue(verdictForScore(10).headline.contains("Not quite"))
  }

  func test_midAndLowBands_haveDifferentHeadlines() {
    XCTAssertNotEqual(verdictForScore(50).headline, verdictForScore(20).headline)
  }
}
