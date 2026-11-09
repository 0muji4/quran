import SwiftUI
import XCTest
@testable import QuranRecitationApp

@MainActor
final class PracticeContentSnapshotTests: XCTestCase {
  func test_idle() { snapshot(.idle) }

  func test_recording() {
    let meters: [Float] = (0..<48).map { (i: Int) -> Float in
      let level = Float((i * 37) % 11) / 10
      return 0.2 + 0.6 * level
    }
    snapshot(.recording(meters: meters, duration: 4.2))
  }

  func test_uploading() { snapshot(.uploading) }

  func test_analysingTranscribing() { snapshot(.analysing(step: .transcribing)) }

  func test_analysingComparing() { snapshot(.analysing(step: .comparing)) }

  func test_analysingCalculating() { snapshot(.analysing(step: .calculating)) }

  func test_done() { snapshot(.done(score: 87, jobId: "job-1")) }

  func test_error() { snapshot(.error(.network(underlying: URLError(.notConnectedToInternet)))) }

  func test_idleLongSurah() { snapshot(.idle, surah: Self.baqarah, ayah: Self.baqarah255) }

  private func snapshot(
    _ state: PracticeRecordingState,
    surah: SurahSummary? = nil,
    ayah: AyahDetail? = nil,
    testName: String = #function,
    line: UInt = #line
  ) {
    let surah = surah ?? Self.fatihah
    let ayah = ayah ?? Self.fatihah2
    let content = PracticeContent(
      state: state,
      ayah: ayah,
      surah: surah,
      currentAyahNumber: ayah.ayahNumber,
      reciterName: "Husary Mu'allim",
      teacherState: .ready(duration: 12, isPlaying: false, currentTime: 0, rate: 1),
      isLoopEnabled: false,
      canGoToPreviousAyah: ayah.ayahNumber > 1,
      canGoToNextAyah: ayah.ayahNumber < surah.ayahCount,
      onClose: {},
      onTogglePlayback: {},
      onSelectRate: { _ in },
      onToggleLoop: {},
      onTapRecord: {},
      onReplay: {},
      onRecordAgain: {},
      onPreviousAyah: {},
      onNextAyah: {}
    )
    // Color.brand has no dark colours, so dark would repeat the light images.
    // The dark variants return when this screen moves to AppTheme.
    for variant in RenderVariant.all where !variant.dark {
      assertSnapshot(of: content, in: variant, testName: testName, line: line)
    }
  }

  private static let fatihah = SurahSummary(
    id: "1", nameAr: "الفاتحة", nameEn: "Al-Fatihah", ayahCount: 7, revelationPlace: "makkah"
  )

  private static let fatihah2 = AyahDetail(
    id: "1:2",
    surahId: "1",
    ayahNumber: 2,
    textAr: "ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ",
    textEn: "All praise is for Allah, Lord of all worlds.",
    transliteration: nil
  )

  private static let baqarah = SurahSummary(
    id: "2", nameAr: "البقرة", nameEn: "Al-Baqarah", ayahCount: 286, revelationPlace: "madinah"
  )

  private static let baqarah255 = AyahDetail(
    id: "2:255",
    surahId: "2",
    ayahNumber: 255,
    textAr: "ٱللَّهُ لَآ إِلَٰهَ إِلَّا هُوَ ٱلْحَىُّ ٱلْقَيُّومُ ۚ لَا تَأْخُذُهُۥ سِنَةٌ وَلَا نَوْمٌ ۚ "
      + "لَّهُۥ مَا فِى ٱلسَّمَٰوَٰتِ وَمَا فِى ٱلْأَرْضِ ۗ مَن ذَا ٱلَّذِى يَشْفَعُ عِندَهُۥٓ إِلَّا بِإِذْنِهِۦ ۚ "
      + "يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ ۖ وَلَا يُحِيطُونَ بِشَىْءٍ مِّنْ عِلْمِهِۦٓ إِلَّا بِمَا شَآءَ ۚ "
      + "وَسِعَ كُرْسِيُّهُ ٱلسَّمَٰوَٰتِ وَٱلْأَرْضَ ۖ وَلَا يَـُٔودُهُۥ حِفْظُهُمَا ۚ وَهُوَ ٱلْعَلِىُّ ٱلْعَظِيمُ",
    textEn: "Allah! There is no god except Him, the Ever-Living, All-Sustaining.",
    transliteration: nil
  )
}
