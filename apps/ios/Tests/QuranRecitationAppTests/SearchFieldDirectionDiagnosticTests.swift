import SwiftUI
import XCTest

/// Temporary diagnostic, not for merging. In right-to-left captures the system search field
/// (`.searchable`, `.navigationBarDrawer(displayMode: .always)`) shows no magnifying glass.
/// The harness sets the direction through `traitOverrides.layoutDirection` and the SwiftUI
/// environment only, while the app itself stays left-to-right.
///
/// For each way of setting the direction, this lays the screen out, logs the search bar's and
/// the search text field's directions, alignment, left and right views and every view inside
/// the field, and writes the capture. CI runs it twice: once in the app as it is, and once in
/// the app launched in Arabic, right-to-left, which is the reference.
///
/// Writes `report.txt` and the captures to
/// `$SNAPSHOT_ARTIFACTS/SearchFieldDirectionDiagnostic/<appLTR|appRTL>`.
@MainActor
final class SearchFieldDirectionDiagnosticTests: XCTestCase {
  enum Setup: String, CaseIterable {
    /// The harness as it is: traits and environment only.
    case traitsOnly
    /// Also `semanticContentAttribute` on the window.
    case windowSemantic
    /// Also `semanticContentAttribute` on the hosting controller's view.
    case rootViewSemantic
    /// Also `UIView.appearance().semanticContentAttribute` while the screen is installed.
    case appearanceView
    /// Also `UISearchBar.appearance().semanticContentAttribute`.
    case appearanceSearchBar
    /// Also `UISearchTextField.appearance().semanticContentAttribute`.
    case appearanceSearchTextField
    /// Also `semanticContentAttribute` set on the bar and the field after the first layout.
    case directAfterLayout
  }

  func test_searchFieldDirection() throws {
    let root = ProcessInfo.processInfo.environment["SNAPSHOT_ARTIFACTS"]
      .map { URL(fileURLWithPath: $0) } ?? FileManager.default.temporaryDirectory
    let app = UIApplication.shared.userInterfaceLayoutDirection == .rightToLeft ? "appRTL" : "appLTR"
    let out = root.appendingPathComponent("SearchFieldDirectionDiagnostic/\(app)")
    try FileManager.default.createDirectory(at: out, withIntermediateDirectories: true)
    var report: [String] = [
      "app.userInterfaceLayoutDirection=\(UIApplication.shared.userInterfaceLayoutDirection.rawValue)"
        + " UIView.direction(for: .unspecified)=\(UIView.userInterfaceLayoutDirection(for: .unspecified).rawValue)"
        + " preferredLanguages=\(Locale.preferredLanguages)"
        + " args=\(ProcessInfo.processInfo.arguments.dropFirst())",
      "(direction 0 = LTR, 1 = RTL; semantic 0 unspecified, 3 forceLTR, 4 forceRTL)",
    ]
    let window = snapshotWindow()

    for variant in RenderVariant.all where !variant.largeText {
      for setup in Setup.allCases {
        if !variant.rightToLeft && setup != .traitsOnly { continue }
        let rtl: UISemanticContentAttribute = .forceRightToLeft
        switch setup {
        case .appearanceView: UIView.appearance().semanticContentAttribute = rtl
        case .appearanceSearchBar: UISearchBar.appearance().semanticContentAttribute = rtl
        case .appearanceSearchTextField: UISearchTextField.appearance().semanticContentAttribute = rtl
        case .windowSemantic: window.semanticContentAttribute = rtl
        default: break
        }
        defer {
          UIView.appearance().semanticContentAttribute = .unspecified
          UISearchBar.appearance().semanticContentAttribute = .unspecified
          UISearchTextField.appearance().semanticContentAttribute = .unspecified
          window.semanticContentAttribute = .unspecified
        }

        let controller = UIHostingController(rootView: Self.screen(variant))
        variant.apply(to: controller)
        if setup == .rootViewSemantic { controller.view.semanticContentAttribute = rtl }
        let previousRoot = window.rootViewController
        defer { window.rootViewController = previousRoot }
        window.rootViewController = controller
        window.frame = CGRect(origin: .zero, size: CGSize(width: 402, height: 600))
        window.layoutIfNeeded()
        if setup == .directAfterLayout {
          for bar in Self.views(in: window).compactMap({ $0 as? UISearchBar }) {
            bar.semanticContentAttribute = rtl
            bar.searchTextField.semanticContentAttribute = rtl
            bar.setNeedsLayout()
            bar.searchTextField.setNeedsLayout()
          }
          window.layoutIfNeeded()
        }

        let format = UIGraphicsImageRendererFormat()
        format.scale = 1
        format.preferredRange = .standard
        let image = UIGraphicsImageRenderer(bounds: window.bounds, format: format).image { _ in
          _ = window.drawHierarchy(in: window.bounds, afterScreenUpdates: true)
        }
        let name = "\(variant)-\(setup.rawValue)"
        try XCTUnwrap(image.pngData()).write(to: out.appendingPathComponent("\(name).png"))

        report.append("")
        report.append("== \(name)")
        report.append(
          "controller trait=\(controller.traitCollection.layoutDirection.rawValue)"
            + " view.semantic=\(controller.view.semanticContentAttribute.rawValue)"
            + " view.effective=\(controller.view.effectiveUserInterfaceLayoutDirection.rawValue)")
        guard let bar = Self.views(in: window).compactMap({ $0 as? UISearchBar }).first else {
          report.append("no UISearchBar")
          continue
        }
        let field = bar.searchTextField
        report.append(
          "bar \(type(of: bar)) frame=\(bar.convert(bar.bounds, to: window))"
            + " semantic=\(bar.semanticContentAttribute.rawValue)"
            + " trait=\(bar.traitCollection.layoutDirection.rawValue)"
            + " effective=\(bar.effectiveUserInterfaceLayoutDirection.rawValue)"
            + " forSemantic=\(UIView.userInterfaceLayoutDirection(for: bar.semanticContentAttribute).rawValue)")
        report.append(
          "field \(type(of: field)) frame=\(field.convert(field.bounds, to: window))"
            + " semantic=\(field.semanticContentAttribute.rawValue)"
            + " trait=\(field.traitCollection.layoutDirection.rawValue)"
            + " effective=\(field.effectiveUserInterfaceLayoutDirection.rawValue)"
            + " forSemantic=\(UIView.userInterfaceLayoutDirection(for: field.semanticContentAttribute).rawValue)"
            + " textAlignment=\(field.textAlignment.rawValue)"
            + " leftViewMode=\(field.leftViewMode.rawValue) rightViewMode=\(field.rightViewMode.rawValue)")
        report.append(
          "field.leftView=\(Self.describe(field.leftView, in: window))"
            + " field.rightView=\(Self.describe(field.rightView, in: window))")
        report.append(
          "leftViewRect=\(field.leftViewRect(forBounds: field.bounds))"
            + " rightViewRect=\(field.rightViewRect(forBounds: field.bounds))"
            + " textRect=\(field.textRect(forBounds: field.bounds))"
            + " placeholderRect=\(field.placeholderRect(forBounds: field.bounds))")
        for view in Self.views(in: field).dropFirst() where !view.isHidden && view.alpha > 0 {
          report.append("  - \(Self.describe(view, in: window))")
        }
      }
    }
    try report.joined(separator: "\n").write(
      to: out.appendingPathComponent("report.txt"), atomically: true, encoding: .utf8)
    XCTFail("Diagnostic run: the snapshot artifacts hold the report and the captures.")
  }

  private static func screen(_ variant: RenderVariant) -> some View {
    NavigationStack {
      List { Text(verbatim: "Row") }
        .navigationTitle(Text(verbatim: "Library"))
        .searchable(
          text: .constant(""), placement: .navigationBarDrawer(displayMode: .always),
          prompt: Text(verbatim: "Search"))
    }
    .environment(\.locale, Locale(identifier: variant.rightToLeft ? "ar" : "en"))
    .environment(\.layoutDirection, variant.rightToLeft ? .rightToLeft : .leftToRight)
  }

  private static func describe(_ view: UIView?, in window: UIWindow) -> String {
    guard let view else { return "nil" }
    var text = "\(type(of: view)) \(view.convert(view.bounds, to: window))"
      + " semantic=\(view.semanticContentAttribute.rawValue)"
      + " effective=\(view.effectiveUserInterfaceLayoutDirection.rawValue)"
    if let image = (view as? UIImageView)?.image {
      text += " image=\(image.description.prefix(120))"
    }
    if let label = view as? UILabel {
      text += " text=\(label.text ?? "") alignment=\(label.textAlignment.rawValue)"
    }
    return text
  }

  private static func views(in root: UIView) -> [UIView] {
    [root] + root.subviews.flatMap(views(in:))
  }
}
