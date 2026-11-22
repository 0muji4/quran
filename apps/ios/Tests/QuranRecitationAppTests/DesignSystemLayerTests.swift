import Foundation
import XCTest

/// Enforces the ADR 0026 dependency rule on iOS: components and views read
/// tokens through `AppTheme`, so the generated types are named only by the
/// generated files and the theme binding.
final class DesignSystemLayerTests: XCTestCase {
  func test_onlyTheThemeBindingNamesGeneratedTokens() throws {
    // This file is Tests/QuranRecitationAppTests/DesignSystemLayerTests.swift,
    // so the package root is three levels up.
    let sourceRoot = URL(fileURLWithPath: #filePath)
      .deletingLastPathComponent()
      .deletingLastPathComponent()
      .deletingLastPathComponent()
      .appendingPathComponent("Sources/QuranRecitationApp")
    let generatedTypes = try NSRegularExpression(pattern: #"\bToken(Color|Spacing|Shape)\b"#)

    guard let paths = FileManager.default.enumerator(atPath: sourceRoot.path) else {
      return XCTFail("Sources not found at \(sourceRoot.path)")
    }

    var offenders: [String] = []
    var scanned = 0
    for case let path as String in paths where path.hasSuffix(".swift") {
      if path.hasPrefix("DesignSystem/Generated/") || path == "DesignSystem/AppTheme.swift" {
        continue
      }
      scanned += 1
      let contents = try String(
        contentsOf: sourceRoot.appendingPathComponent(path), encoding: .utf8)
      let range = NSRange(contents.startIndex..., in: contents)
      if generatedTypes.firstMatch(in: contents, range: range) != nil {
        offenders.append(path)
      }
    }

    XCTAssertGreaterThan(scanned, 0, "No Swift sources scanned under \(sourceRoot.path)")
    XCTAssertEqual(
      offenders, [],
      "Read tokens through AppTheme instead of naming TokenColor, TokenSpacing or TokenShape")
  }
}
