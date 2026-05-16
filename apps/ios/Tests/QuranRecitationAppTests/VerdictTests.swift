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
    XCTAssertEqual(verdictForScore(90).badge, "MASTERED")
    XCTAssertEqual(verdictForScore(100).badge, "MASTERED")
  }

  func test_greatWork_bandFor70Through89() {
    XCTAssertEqual(verdictForScore(70).badge, "GREAT WORK")
    XCTAssertEqual(verdictForScore(89).badge, "GREAT WORK")
  }

  func test_keepPractising_midBandFor40Through69() {
    XCTAssertEqual(verdictForScore(40).badge, "KEEP PRACTISING")
    XCTAssertEqual(verdictForScore(69).badge, "KEEP PRACTISING")
    XCTAssertTrue(verdictForScore(52).headline.contains("Some work"))
  }

  func test_keepPractising_lowBandBelow40() {
    XCTAssertEqual(verdictForScore(0).badge, "KEEP PRACTISING")
    XCTAssertEqual(verdictForScore(39).badge, "KEEP PRACTISING")
    XCTAssertTrue(verdictForScore(10).headline.contains("Not quite"))
  }

  func test_twoKeepPractisingBands_haveDifferentHeadlines() {
    XCTAssertNotEqual(verdictForScore(50).headline, verdictForScore(20).headline)
  }
}
