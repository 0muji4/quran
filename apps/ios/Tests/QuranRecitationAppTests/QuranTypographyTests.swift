import SwiftUI
import UIKit
import XCTest
@testable import QuranRecitationApp

@MainActor
final class QuranTypographyTests: XCTestCase {
  override func setUp() {
    super.setUp()
    AppTheme.registerFonts()
  }

  // `Font.custom` falls back to the system font without an error, so check the name resolves.
  func test_registerFonts_makesTheAmiriSubsetAvailableByName() {
    let font = UIFont(name: AppTheme.Typography.quranFontName, size: 34)
    XCTAssertEqual(font?.fontName, AppTheme.Typography.quranFontName)
  }

  func test_quranStyles() {
    let specimen = VStack(alignment: .leading, spacing: 16) {
      Text("ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ").font(AppTheme.Typography.ayah)
      Text("ٱللَّهُ لَآ إِلَٰهَ إِلَّا هُوَ ٱلْحَىُّ ٱلْقَيُّومُ ۚ لَا تَأْخُذُهُۥ سِنَةٌ وَلَا نَوْمٌ")
        .font(AppTheme.Typography.ayahLong)
      Text("٢٥٥").font(AppTheme.Typography.ayahNumber)
    }
    .foregroundStyle(AppTheme.Colors.onSurface)
    .padding(16)
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    .background(AppTheme.Colors.surface)

    for variant in RenderVariant.all {
      assertSnapshot(of: specimen, in: variant)
    }
  }
}
