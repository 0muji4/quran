import XCTest
import SwiftUI
@testable import QuranRecitationApp

final class AttemptRowTests: XCTestCase {
  func test_verdict_followsTheResultBands() {
    // The Result screen's bands: 70 and up pass, 40 to 69 warn, below 40 fail.
    // Boundaries are inclusive at the lower edge of each band.
    XCTAssertEqual(AttemptRow.verdict(for: 92), .pass)
    XCTAssertEqual(AttemptRow.verdict(for: 70), .pass)
    XCTAssertEqual(AttemptRow.verdict(for: 69), .warn)
    XCTAssertEqual(AttemptRow.verdict(for: 40), .warn)
    XCTAssertEqual(AttemptRow.verdict(for: 39), .fail)
  }

  func test_relativeText_today_includesTodayPrefix() {
    var calendar = Calendar(identifier: .gregorian)
    calendar.timeZone = TimeZone(identifier: "UTC")!
    let now = Date(timeIntervalSince1970: 1_762_596_000)  // some fixed instant
    let earlierToday = now.addingTimeInterval(-3600)

    let text = AttemptRow.relativeText(for: earlierToday, now: now, calendar: calendar)

    XCTAssertTrue(text.contains("Today"), "expected 'Today' prefix in '\(text)'")
  }

  func test_relativeText_yesterday() {
    var calendar = Calendar(identifier: .gregorian)
    calendar.timeZone = TimeZone(identifier: "UTC")!
    let now = Date(timeIntervalSince1970: 1_762_596_000)
    let yesterday = calendar.date(byAdding: .day, value: -1, to: now)!

    let text = AttemptRow.relativeText(for: yesterday, now: now, calendar: calendar)

    XCTAssertEqual(text, "Yesterday")
  }

  func test_relativeText_olderUsesMonthDay_notTodayOrYesterday() {
    var calendar = Calendar(identifier: .gregorian)
    calendar.timeZone = TimeZone(identifier: "UTC")!
    let now = Date(timeIntervalSince1970: 1_762_596_000)
    let lastWeek = calendar.date(byAdding: .day, value: -7, to: now)!

    let text = AttemptRow.relativeText(for: lastWeek, now: now, calendar: calendar)

    XCTAssertFalse(text.contains("Today"))
    XCTAssertNotEqual(text, "Yesterday")
    XCTAssertFalse(text.isEmpty)
  }
}
