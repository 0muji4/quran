# ADR 0031: iOS Tests in a Host App

- Status: Accepted
- Date: 2026-11-17
- Author: motoshi.suzuki
- Related: [ADR 0027](./0027-native-snapshot-tests.md), [ADR 0030](./0030-platform-standard-components.md)

## Context

ADR 0027 renders iOS screens into images in unit tests. The tests ran as a Swift package test target, with no app. With no app there is no connected window scene, so swift-snapshot-testing captured views with `CALayer.render(in:)`. That method draws each layer's own contents in the test process. It does not draw what the render server adds:

- iOS 26 glass, such as the segmented control's selection thumb (#638) and the search field, is missing from the images. The platform components that ADR 0030 adopts use it.
- The search field's clear button glyph is an `RBSymbolLayer` with no bitmap contents. `render(in:)` drew it in some runs and not in others, so the Library no-match snapshot was flaky (#636). On screen, the render server does not draw the glyph at all.
- A border with continuous corners was drawn with straight ends. The harness redrew such borders as paths before each capture to work around it.

`drawHierarchy(in:afterScreenUpdates: true)` captures through the render server, but without a scene it returns a blank image. Two diagnostics measured the alternative. #639 found the cause of the flakiness. #640 tried a minimal host app, running twice in CI:

- Captures drew glass, the selection thumb, and the part of a 402×1800 window below the 874-point screen.
- Repeat captures of the glass search field differed by at most 1/255 in a colour channel, only inside the glass. All other pixels were identical, within a run and across runs.

Once every screen ran this way, the glass back button differed by up to 2/255 in a colour channel between runs.

## Decision

**The iOS unit tests run inside `TestHost`, an empty app, and snapshots are captured with `drawHierarchy` in its key window. A colour channel matches when it differs by at most 3/255.**

- `apps/ios/TestHost` holds the app, a SwiftUI `WindowGroup` showing nothing, and `project.yml`. The tests do not launch the real app. They link the `QuranRecitationApp` library and render its views directly, as before.
- The Xcode project is generated from `project.yml` by XcodeGen. The XcodeGen version and its SHA-256 are pinned in `apps/ios/Makefile` (`make test-project`), like the Apollo CLI. The generated project is not committed.
- The app is the `QuranRecitationApp` library plus a `QuranRecitationAppMain` executable that only holds `@main`. An Xcode test bundle can only link a library.
- `assertSnapshot(of:in:)` prepares the capture itself (`captureInKeyWindow`). It sets the screen as the key window's root, applies the rendering through `traitOverrides` on the screen, and captures the window. swift-snapshot-testing only records, loads and compares the files. Its own preparation wraps the screen in a parent view controller, and under that parent a large navigation title loses its leading margin, whatever traits are overridden (#643).
- The comparison is the harness's own: both images are read as 8-bit sRGB, every pixel is compared, and a colour channel matches when it differs by at most 3/255 (`snapshotChannelTolerance`).
- Core Animation time is stopped in the screen's view (`layer.speed = 0`), so an animation such as a spinner is captured at its first frame. The render server would otherwise draw it as it is at the moment of the capture. Stopping time on the key window's own layer has no effect: in CI an animated square reached its end either way.
- The continuous-border workaround is removed. `SnapshotHarnessTests` checks the following, with a baseline for the selection thumb:
  - the tests run in a host app with a key window;
  - a continuous capsule border is drawn with curved ends;
  - an animation is captured at its first frame;
  - a large navigation title sits on the 16pt layout margin, mirrored in right-to-left;
  - the selection thumb is drawn.
- CI builds the app from the package and runs the tests from the generated project.

## Rationale

- **Capture what the user sees.** The platform components rely on glass, and a snapshot that leaves glass out cannot catch a regression in it.
- **Remove the nondeterminism instead of hiding it.** The flaky glyph came from the capture method. The render server draws it the same way every time.
- **A tolerance just above the measured noise.** The only variation left is inside glass, at most 2/255 in a channel. 3/255 passes that noise with a margin of one step, is the same in light and dark colours, and fails any change that matters. No pixel is skipped.
- **An empty host keeps the tests hermetic.** Hosting the tests in the real app would start its sign-in restore, keychain and backend set-up, and would need a "running tests" branch in production code.
- **The standard setup.** Running UI tests in a host app is the usual Xcode configuration. A host-less package test is the exception, and it is what caused these gaps.

## Consequences

- Every iOS baseline is re-recorded once. Glass now appears in them, and layouts include the screen's safe area: the status bar and the home indicator.
- Running the iOS tests needs `make test-project` first, and the CI job builds the package twice: once for the app and once for the tests.
- A change of up to 3/255 in a colour channel passes. A larger change in any channel of any pixel fails.
- XcodeGen is a new pinned tool. Updating it is a change to `apps/ios/Makefile`.

## Alternatives Considered

- **Hide the clear button in the harness.** This fixes only the flaky glyph. Glass would still be missing, and the workaround would be removed again once the tests ran in a host app.
- **The real app as the host.** Rejected for the reasons under Rationale: the tests would not be hermetic, and production code would gain a test-only branch.
- **A handwritten `.xcodeproj`.** Rejected: hard to review and to merge. A generated project keeps the reviewable spec to about 60 lines.
- **swift-snapshot-testing's `perceptualPrecision`.** Rejected. It computes ΔE with colour management off, so sRGB values are treated as linear. The 2/255 glass noise on the dark back button measured 5.2 ΔE that way, against 1.2 ΔE properly converted. 1 ΔE and then 2 ΔE both failed with no change. In light colours it is the other way round: a threshold high enough to pass the noise would also pass a change of about 34/255 in a grey near white.

## Reconsideration Triggers

- Glass noise grows past 3/255 after an Xcode or runtime update. Measure it again before loosening the tolerance.
- The app gets a real Xcode app target. Keep the tests on the empty host, and add the app target next to it.

## References

- [ADR 0027](./0027-native-snapshot-tests.md): the snapshot tests and their rendering environment
- [ADR 0030](./0030-platform-standard-components.md): the platform components whose glass is now captured
- `apps/ios/TestHost/project.yml`, `apps/ios/Makefile` (`test-project`)
- `apps/ios/Tests/QuranRecitationAppTests/SnapshotSupport.swift`, `SnapshotHarnessTests.swift`
