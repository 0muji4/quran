import SwiftUI

/// An empty app that hosts the unit tests. It only gives them a connected window scene,
/// so snapshots go through the render server (`drawHierarchy`) and capture what it draws,
/// such as iOS 26 glass. The app under test is not launched: tests link the
/// `QuranRecitationApp` library and render its views directly.
@main
struct TestHostApp: App {
  var body: some Scene {
    WindowGroup { Color.clear }
  }
}
