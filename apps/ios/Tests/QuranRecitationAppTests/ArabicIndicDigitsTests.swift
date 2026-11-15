import XCTest
@testable import QuranRecitationApp

final class ArabicIndicDigitsTests: XCTestCase {
  func test_writesEachDigitInArabicIndicDigits() {
    XCTAssertEqual(arabicIndicDigits(0), "٠")
    XCTAssertEqual(arabicIndicDigits(7), "٧")
    XCTAssertEqual(arabicIndicDigits(255), "٢٥٥")
    XCTAssertEqual(arabicIndicDigits(286), "٢٨٦")
  }
}
