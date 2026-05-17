import XCTest
@testable import QuranRecitationApp

/// Pure-helper tests for `ProfileHeader`. The SwiftUI body itself is
/// snapshot-fragile and gets exercised via the build; here we cover the
/// branching that determines what the header *shows*.
final class ProfileHeaderTests: XCTestCase {
  // MARK: - initial(displayName:email:)

  func test_initial_usesDisplayNameFirstLetter() {
    XCTAssertEqual(ProfileHeader.initial(displayName: "Noor", email: "noor@example.com"), "N")
  }

  func test_initial_fallsBackToEmail_whenDisplayNameNil() {
    XCTAssertEqual(ProfileHeader.initial(displayName: nil, email: "ali@example.com"), "A")
  }

  func test_initial_fallsBackToEmail_whenDisplayNameWhitespaceOnly() {
    XCTAssertEqual(ProfileHeader.initial(displayName: "   ", email: "ali@example.com"), "A")
  }

  func test_initial_returnsBulletWhenSourceEmpty() {
    // Both inputs empty: avatar still has to render *something*, and an
    // arbitrary "·" beats an empty circle with no glyph.
    XCTAssertEqual(ProfileHeader.initial(displayName: "", email: ""), "·")
  }

  func test_initial_uppercasesLowerCaseFirstLetter() {
    XCTAssertEqual(ProfileHeader.initial(displayName: "noor", email: "x@example.com"), "N")
  }

  // MARK: - levelKey

  func test_levelKey_mapsKnownValues() {
    XCTAssertEqual(ProfileHeader.levelKey("beginner"), "profile.badge.level.beginner")
    XCTAssertEqual(ProfileHeader.levelKey("intermediate"), "profile.badge.level.intermediate")
    XCTAssertEqual(ProfileHeader.levelKey("advanced"), "profile.badge.level.advanced")
  }

  func test_levelKey_returnsNilForUnknownOrMissing() {
    XCTAssertNil(ProfileHeader.levelKey(nil))
    XCTAssertNil(ProfileHeader.levelKey(""))
    XCTAssertNil(ProfileHeader.levelKey("expert"))
  }

  // MARK: - joinedText

  func test_joinedText_nilISO_returnsNil() {
    XCTAssertNil(ProfileHeader.joinedText(nil))
  }

  func test_joinedText_malformedISO_returnsNil() {
    XCTAssertNil(ProfileHeader.joinedText("not-an-iso-string"))
  }

  func test_joinedText_validISO_containsYear() {
    // We can't pin the month label (it follows the test runner's
    // locale), but the year is locale-stable and proves the parser
    // and formatter ran. The "Joined %@" template comes from
    // Localizable.strings; we only assert on the year component to
    // stay robust to locale and bundle wiring.
    let text = ProfileHeader.joinedText("2026-01-04T12:00:00.000Z")
    XCTAssertNotNil(text)
    XCTAssertTrue(text?.contains("2026") == true, "expected year in '\(text ?? "")'")
  }
}
