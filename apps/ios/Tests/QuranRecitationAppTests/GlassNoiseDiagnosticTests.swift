import SwiftUI
import XCTest
@testable import QuranRecitationApp

/// Temporary diagnostic, not for merging. Repeat captures of glass differed by up to 2/255
/// on the back button and the search field, and then by 4/255 under the search field's
/// clear button. This measures the spread: each Library screen with glass (no match, with
/// the clear button; resume) and the Practice idle screen (back button) is captured 15
/// times in every rendering. For each it reports the largest channel difference from the
/// first capture, how many channels differ, and where.
///
/// Writes `report.txt` and the first capture of each to `$SNAPSHOT_ARTIFACTS/GlassNoiseDiagnostic`.
@MainActor
final class GlassNoiseDiagnosticTests: XCTestCase {
  func test_glassNoise() throws {
    let root = ProcessInfo.processInfo.environment["SNAPSHOT_ARTIFACTS"]
      .map { URL(fileURLWithPath: $0) } ?? FileManager.default.temporaryDirectory
    let out = root.appendingPathComponent("GlassNoiseDiagnostic")
    try FileManager.default.createDirectory(at: out, withIntermediateDirectories: true)
    var report: [String] = []
    var histogram: [Int: Int] = [:]

    let scenes: [(String, () -> AnyView)] = [
      ("noMatch", { AnyView(Self.library(query: "Yasin", visible: [])) }),
      ("resume", { AnyView(Self.library(query: "", visible: Self.surahs)) }),
    ]
    for (name, make) in scenes {
      for variant in RenderVariant.all {
        var reference: [UInt8]?
        var worst = 0
        var differing = 0
        var box = (minX: Int.max, minY: Int.max, maxX: -1, maxY: -1)
        for attempt in 0..<15 {
          let screen = make()
            .environment(\.locale, Locale(identifier: variant.rightToLeft ? "ar" : "en"))
            .environment(\.layoutDirection, variant.rightToLeft ? .rightToLeft : .leftToRight)
          let image = captureInKeyWindow(UIHostingController(rootView: screen), in: variant)
          let bytes = try XCTUnwrap(Self.bytes(of: image))
          guard let first = reference else {
            reference = bytes
            try image.pngData()?.write(to: out.appendingPathComponent("\(name)-\(variant).png"))
            continue
          }
          _ = attempt
          let width = Int(snapshotSize.width)
          for index in bytes.indices where bytes[index] != first[index] {
            let delta = abs(Int(bytes[index]) - Int(first[index]))
            histogram[delta, default: 0] += 1
            worst = max(worst, delta)
            differing += 1
            let pixel = index / 4
            let x = pixel % width
            let y = pixel / width
            box = (min(box.minX, x), min(box.minY, y), max(box.maxX, x), max(box.maxY, y))
          }
        }
        report.append(
          "\(name) \(variant): worst=\(worst)/255 differingChannels=\(differing)"
            + (worst > 0 ? " box=(\(box.minX),\(box.minY))-(\(box.maxX),\(box.maxY))" : ""))
      }
    }
    report.append("histogram of channel differences: \(histogram.sorted { $0.key < $1.key })")
    try report.joined(separator: "\n").write(
      to: out.appendingPathComponent("report.txt"), atomically: true, encoding: .utf8)
    XCTFail("Diagnostic run: the snapshot artifacts hold the report.")
  }

  private static func library(query: String, visible: [SurahSummary]) -> some View {
    NavigationStack {
      LibraryContent(
        state: .loaded(surahs),
        visibleSurahs: visible,
        query: .constant(query),
        filter: .constant(.all),
        lastPracticed: LastPracticed(
          surahId: "1", ayahNumber: 3, surahNameEn: "Al-Fatiha", surahNameAr: "الفاتحة",
          ayahCount: 7, practicedAt: Date(timeIntervalSince1970: 0)),
        bestScores: ["1": 87],
        onResume: { _ in },
        onSurahOpened: { _ in },
        onRetry: {}
      )
    }
    .frame(height: 874)
    .frame(maxHeight: .infinity, alignment: .top)
  }

  private static let surahs = [
    SurahSummary(id: "1", nameAr: "الفاتحة", nameEn: "Al-Fatiha", ayahCount: 7, revelationPlace: "Mecca"),
    SurahSummary(id: "2", nameAr: "البقرة", nameEn: "Al-Baqarah", ayahCount: 286, revelationPlace: "Medina"),
  ]

  private static func bytes(of image: UIImage) -> [UInt8]? {
    guard let cgImage = image.cgImage, let space = CGColorSpace(name: CGColorSpace.sRGB) else {
      return nil
    }
    let width = cgImage.width
    let height = cgImage.height
    var bytes = [UInt8](repeating: 0, count: width * height * 4)
    let drawn = bytes.withUnsafeMutableBytes { buffer -> Bool in
      guard
        let context = CGContext(
          data: buffer.baseAddress, width: width, height: height, bitsPerComponent: 8,
          bytesPerRow: width * 4, space: space,
          bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)
      else { return false }
      context.draw(cgImage, in: CGRect(x: 0, y: 0, width: width, height: height))
      return true
    }
    return drawn ? bytes : nil
  }
}
