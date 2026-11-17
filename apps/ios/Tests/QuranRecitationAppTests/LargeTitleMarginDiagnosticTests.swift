import SwiftUI
import XCTest

/// Temporary diagnostic, not for merging. swift-snapshot-testing's key-window capture draws
/// a large navigation title at x 0 whatever traits it overrides, while the same screen set
/// directly as the key window's root draws it at the 16pt margin. This tries the direct
/// path with the traits applied through `traitOverrides` on the root view controller:
/// light and dark, default and large text, left-to-right and right-to-left, each captured
/// twice. The images show whether the margin holds and whether captures repeat.
///
/// Writes the captures and `report.txt` to `$SNAPSHOT_ARTIFACTS/LargeTitleMarginDiagnostic`.
@MainActor
final class LargeTitleMarginDiagnosticTests: XCTestCase {
  func test_largeTitleMargins() throws {
    let root = ProcessInfo.processInfo.environment["SNAPSHOT_ARTIFACTS"]
      .map { URL(fileURLWithPath: $0) } ?? FileManager.default.temporaryDirectory
    let out = root.appendingPathComponent("LargeTitleMarginDiagnostic")
    try FileManager.default.createDirectory(at: out, withIntermediateDirectories: true)
    var report: [String] = []
    let window = try XCTUnwrap(
      UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
        .flatMap(\.windows).first(where: \.isKeyWindow))
    report.append("window before=\(window.frame) safeArea=\(window.safeAreaInsets)")

    for variant in RenderVariant.all {
      var images: [Data] = []
      for attempt in 0..<2 {
        let screen = Self.screen
          .environment(\.locale, Locale(identifier: variant.rightToLeft ? "ar" : "en"))
          .environment(\.layoutDirection, variant.rightToLeft ? .rightToLeft : .leftToRight)
        let controller = UIHostingController(rootView: screen)
        controller.traitOverrides.displayScale = 1
        controller.traitOverrides.userInterfaceStyle = variant.dark ? .dark : .light
        controller.traitOverrides.preferredContentSizeCategory =
          variant.largeText ? .extraExtraExtraLarge : .large
        controller.traitOverrides.layoutDirection = variant.rightToLeft ? .rightToLeft : .leftToRight
        window.rootViewController = controller
        window.frame = CGRect(x: 0, y: 0, width: 402, height: 1800)
        window.layoutIfNeeded()

        let format = UIGraphicsImageRendererFormat()
        format.scale = 1
        let image = UIGraphicsImageRenderer(bounds: window.bounds, format: format).image { _ in
          _ = window.drawHierarchy(in: window.bounds, afterScreenUpdates: true)
        }
        let png = try XCTUnwrap(image.pngData())
        images.append(png)
        try png.write(to: out.appendingPathComponent("\(variant)-\(attempt).png"))
        if attempt == 0 {
          let bar = Self.views(in: controller.view).compactMap { $0 as? UINavigationBar }.first
          report.append(
            "\(variant): safeArea=\(controller.view.safeAreaInsets)"
              + " barMargins=\(bar.map { "\($0.directionalLayoutMargins)" } ?? "nil")"
              + " scale=\(controller.traitCollection.displayScale)"
              + " direction=\(controller.traitCollection.layoutDirection.rawValue)"
              + " style=\(controller.traitCollection.userInterfaceStyle.rawValue)")
        }
      }
      report.append("\(variant): repeat \(images[0] == images[1] ? "SAME" : "DIFFERENT")")
    }
    window.rootViewController = nil
    try report.joined(separator: "\n").write(
      to: out.appendingPathComponent("report.txt"), atomically: true, encoding: .utf8)
    XCTFail("Diagnostic run: the snapshot artifacts hold the report and the captures.")
  }

  private static var screen: some View {
    NavigationStack {
      List { Text(verbatim: "Row") }
        .navigationTitle(Text(verbatim: "Library"))
        .searchable(
          text: .constant(""), placement: .navigationBarDrawer(displayMode: .always),
          prompt: Text(verbatim: "Search"))
    }
  }

  private static func views(in root: UIView) -> [UIView] {
    [root] + root.subviews.flatMap(views(in:))
  }
}
