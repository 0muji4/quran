import Foundation
import XCTest

/// Enforces the ADR 0026 dependency rule on iOS: components and views read
/// tokens through `AppTheme`, so the generated types are named only by the
/// generated files and the theme binding, and nothing names the old theme
/// the redesign removed (#596).
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

  func test_noSourceNamesTheOldTheme() throws {
    let sourceRoot = URL(fileURLWithPath: #filePath)
      .deletingLastPathComponent()
      .deletingLastPathComponent()
      .deletingLastPathComponent()
      .appendingPathComponent("Sources/QuranRecitationApp")
    // `Color.brand`, `Font.brand`, the `.brand.` shorthands and the
    // `.brandPrimary` / `.brandSecondary` button styles, `Color(brandHex:)`,
    // the `Brand*` components, and the old top-level `Spacing` enum, used or
    // declared (`AppTheme.Spacing` is preceded by a dot, so it does not match).
    let oldTheme = try NSRegularExpression(
      pattern: #"\b(Color|Font)\.brand\b|\.brand(\.|Primary\b|Secondary\b)|\bbrandHex\b|\bBrand[A-Z][A-Za-z]*|(?<![\w.])Spacing\.|\benum Spacing\b"#)

    guard let paths = FileManager.default.enumerator(atPath: sourceRoot.path) else {
      return XCTFail("Sources not found at \(sourceRoot.path)")
    }

    var offenders: [String] = []
    var scanned = 0
    for case let path as String in paths where path.hasSuffix(".swift") {
      scanned += 1
      let contents = try String(
        contentsOf: sourceRoot.appendingPathComponent(path), encoding: .utf8)
      let range = NSRange(contents.startIndex..., in: contents)
      if oldTheme.firstMatch(in: contents, range: range) != nil {
        offenders.append(path)
      }
    }

    XCTAssertGreaterThan(scanned, 0, "No Swift sources scanned under \(sourceRoot.path)")
    XCTAssertEqual(
      offenders.sorted(), [],
      "Read the theme through AppTheme and use the App* components, not Color.brand, Font.brand, Spacing or Brand*")
  }
}
