import XCTest
@testable import QuranRecitationApp

/// Mirrors `apps/web/app/(app)/practice/result/__tests__/verdict.test.ts`
/// so a divergence between the two clients' verdict tables shows up as
/// a failing test on the platform that drifted.
final class VerdictTests: XCTestCase {
  func test_nilScore_returnsAwaitingBadge() {
    XCTAssertEqual(verdictForScore(nil).badge, "AWAITING SCORE")
  }

  func test_nanScore_returnsAwaitingBadge() {
    XCTAssertEqual(verdictForScore(.nan).badge, "AWAITING SCORE")
  }

  func test_mastered_bandFor90AndAbove() {
    XCTAssertEqual(verdictForScore(90).badge, "MASHALLAH — MASTERED")
    XCTAssertEqual(verdictForScore(100).badge, "MASHALLAH — MASTERED")
  }

  func test_great_bandFor70Through89() {
    XCTAssertEqual(verdictForScore(70).badge, "MASHALLAH — WELL RECITED")
    XCTAssertEqual(verdictForScore(89).badge, "MASHALLAH — WELL RECITED")
  }

  func test_keepPractising_midBandFor40Through69() {
    XCTAssertEqual(verdictForScore(40).badge, "KEEP PRACTISING")
    XCTAssertEqual(verdictForScore(69).badge, "KEEP PRACTISING")
    XCTAssertTrue(verdictForScore(52).headline.contains("Some work"))
  }

  func test_keepGoing_lowBandBelow40() {
    XCTAssertEqual(verdictForScore(0).badge, "KEEP GOING")
    XCTAssertEqual(verdictForScore(39).badge, "KEEP GOING")
    XCTAssertTrue(verdictForScore(10).headline.contains("Not quite"))
  }

  func test_midAndLowBands_haveDifferentHeadlines() {
    XCTAssertNotEqual(verdictForScore(50).headline, verdictForScore(20).headline)
  }
}
