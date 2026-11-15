import SwiftUI
import XCTest
@testable import QuranRecitationApp

/// Renders each component specimen in every `RenderVariant` (ADR 0027).
@MainActor
final class AppComponentsSnapshotTests: XCTestCase {
  func test_buttons() { snapshot(AppButtonsSpecimen()) }

  func test_surfaces() { snapshot(AppSurfacesSpecimen()) }

  func test_chip() { snapshot(AppChipSpecimen()) }

  private func snapshot<V: View>(_ specimen: V, testName: String = #function, line: UInt = #line) {
    for variant in RenderVariant.all {
      assertSnapshot(of: AppSpecimenSurface { specimen }, in: variant, testName: testName, line: line)
    }
  }
}
