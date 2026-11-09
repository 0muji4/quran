# ADR 0027: Snapshot Tests for the Android and iOS Screens

- Status: Accepted
- Date: 2026-11-09
- Author: motoshi.suzuki
- Related: [ADR 0004](./0004-visual-regression-playwright.md), [ADR 0005](./0005-ios-app-architecture.md), [ADR 0014](./0014-ci-path-scoped-workflows.md), [ADR 0026](./0026-single-design-token-source.md)

## Context

ADR 0026 migration step 4 rebuilds every Android and iOS screen on the new theme, one screen at a time. Each rebuild changes only the look: ViewModels and state types stay the same. The changes reviewers have to judge are visual, and they multiply:

- Each screen has several states. Practice alone has `Idle`, `Recording`, `Uploading`, three `Analysing` steps, `Done` and `Error`.
- Every state must work in light and dark (ADR 0026 makes dark mode a requirement), at the default and a large text size, and left-to-right and right-to-left.

That is 8 renderings per state per platform. Today none of them is tested. Web has Playwright screenshots (ADR 0004), but the native apps do not:

- ADR 0005 Decision 5 deliberately left snapshot tests out of iOS while the UI was verified by hand.
- ADR 0026 lists "no visual regression test on mobile" as a negative consequence.

A reviewer cannot open 8 renderings × every state × 2 platforms in an emulator and a simulator for every pull request.

## Decision

**Android and iOS render each screen state into images in their unit tests and compare them with baseline images committed to git. CI fails on any difference and uploads the images it rendered.**

### Tools

| Platform | Library                                                                         | Runs in                                                  |
| -------- | ------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Android  | [Roborazzi](https://github.com/takahirom/roborazzi)                             | `testDebugUnitTest`, on Robolectric with native graphics |
| iOS      | [swift-snapshot-testing](https://github.com/pointfreeco/swift-snapshot-testing) | `xcodebuild test`, on the iOS Simulator                  |

### What is captured

- **Screens**: every state of the screen's state type. A screen is split into a content part that takes state and callbacks and a part that reads the ViewModel, so a test renders any state without a ViewModel. Variants that change layout are added per screen, such as a long surah on Practice.
- **Components**: each new design-system component (item A4 of the redesign plan, [#596](https://github.com/0muji4/quran/issues/596)), in the states it can show.
- **Combinations**: each state is rendered 8 times.

| Axis      | Values                       | Android            | iOS                                                  |
| --------- | ---------------------------- | ------------------ | ---------------------------------------------------- |
| Theme     | light, dark                  | `+night` qualifier | `userInterfaceStyle` trait                           |
| Text size | default, large               | `fontScale = 1.3`  | `extraExtraExtraLarge` (about 135%, closest to 130%) |
| Direction | left-to-right, right-to-left | `ar` locale        | `ar` locale and `layoutDirection` `.rightToLeft`     |

The right-to-left rendering uses the Arabic locale, so it also shows Arabic UI strings where they exist.

A screen still drawn with the light-only current theme (`BrandTheme` on Android, `Color.brand` on iOS) is rendered in the 4 light combinations, because its dark renderings would be identical to the light ones. It gets all 8 once it moves to `AppTheme`.

The first screen captured is Practice, on the current theme, before it is rebuilt. The Practice rebuild in step 4 then shows a before/after diff for every state and combination.

### Rendering environment

A baseline is only comparable with an image rendered in the same environment.

- **Android**: Robolectric at SDK 35 on JDK 17, the JDK CI and the work machines already use. Robolectric renders SDK 36 from [4.16](https://github.com/robolectric/robolectric/releases/tag/robolectric-4.16) and the app's compile SDK, 37, from [4.17](https://github.com/robolectric/robolectric/releases/tag/robolectric-4.17), but both require JDK 21. The 4.16 release notes state this for SDK 36. For SDK 37, Robolectric 4.17 on JDK 17 fails with "Android SDK 37 requires Java 21 (have Java 17)". CI renders on Linux, and images recorded on macOS match it: the first Android baselines were recorded on macOS and passed CI's comparison unchanged.
- **iOS**: rendering depends on the device model and the simulator runtime. CI pins the runner image, the Xcode version, the device and the runtime instead of picking the first available iPhone. The pinned values are in `apps/ios/README.md`, and a work machine records baselines on the same values.
- **Scale**: images are rendered at 1x (Android `mdpi`, iOS display scale 1). Layout, colour and type differences stay visible, and each image has a ninth of the pixels of a 3x image.
- **Determinism**: animations are stopped, and inputs that vary are fixed in the test, such as the recording duration and waveform levels.

### Baselines and CI

- Baselines are PNG files committed next to the tests: `apps/android/src/test/snapshots/` and `__Snapshots__/` folders under `apps/ios/Tests/`.
- The existing `mobile-android` and `mobile-ios` jobs run the comparison as part of their unit tests. No new job is needed: the snapshot tests are unit tests, and the path filters (ADR 0014) already route `apps/android/**` and `apps/ios/**` to these jobs.
- When the comparison fails, the job uploads the images it rendered and the diff images as a workflow artifact.
- A pull request that changes the UI on purpose commits the new baselines. They can be recorded locally on the pinned environment, or taken from the failed CI run's artifact. The reviewer reviews the image diff in the pull request.

## Rationale

- **Unit tests, not UI tests.** Rendering a view in a unit test needs no running app, no backend and no navigation to reach a state. A state that is hard to reach by hand, such as an error or a single analysing step, is a constructor argument.
- **Baselines in git.** As in ADR 0004, the change and the images it produces are reviewed in the same pull request, with no external service.
- **1x scale.** At 3x, Practice alone would be roughly 10–20 MB per platform, and all six screens would pass ADR 0004's 50 MB reconsideration threshold. Hairline detail lost at 1x is not what this layer is for.
- **CI as the comparison point.** CI runs on a fixed image. Work machines differ, and the redesign plan (#596) expects work on more than one machine, so a baseline is valid when it matches what CI renders.
- **The existing jobs.** A separate job would repeat the JDK, Android SDK and Xcode setup, and the iOS job runs on a metered macOS runner.

## Consequences

Positive:

- Every redesign pull request shows each state in every combination as images, including dark, large text and right-to-left, which are the renderings most often skipped when checking by hand.
- A token or component change that alters a screen fails CI until its new baselines are committed.

Negative:

- The repository grows with every baseline change. At 1x, one screen is a few MB per platform.
- Splitting each screen into a content part and a ViewModel part touches the screens before they are rebuilt.
- Android renders on SDK 35, not the app's target SDK. Behaviour that differs between SDK 35 and 37 is not covered.
- Updating the pinned Xcode or simulator runtime changes iOS rendering, so the iOS baselines are re-recorded in the same pull request as the update.
- Baselines depend on two pinned environments: a JVM on Linux for Android and a macOS simulator for iOS.

## Alternatives Considered

- **Paparazzi (Android).** Renders with layoutlib without Robolectric and supports the same theme, font scale and direction settings. Not chosen: Roborazzi runs through Compose's test APIs (`createComposeRule`), the same API that interaction tests use, so a snapshot test can also reach a state by interaction when a constructor argument is not enough.
- **Compose Preview Screenshot Testing (Android).** Turns `@Preview` functions into screenshot tests. Not chosen: it is still in alpha, and its standalone plugin is being replaced by AGP test suites ([release notes](https://developer.android.com/studio/preview/compose-screenshot-testing-release-notes), [test suites](https://developer.android.com/studio/preview/compose-screenshot-testing-with-testsuites)).
- **XCUITest screenshots (iOS).** Captures the running app. Not chosen: each state has to be reached through the app with a stubbed backend, which is slower and less deterministic than rendering the view directly.
- **Git LFS for baselines.** Not chosen while images are rendered at 1x. It adds `lfs: true` to every checkout and metered LFS bandwidth. Listed as a reconsideration trigger.
- **Checking by hand.** Rejected: 8 renderings per state on two platforms is not reviewed consistently by hand, which is the situation ADR 0005 Decision 5 accepted for a smaller UI.

## Reconsideration Triggers

- The committed baselines pass 50 MB. Move them to Git LFS.
- The project moves to JDK 21. Render at the app's compile SDK.
- Compose Preview Screenshot Testing becomes stable. Re-evaluate it, since components already need `@Preview` functions.
- Taking baselines from CI artifacts becomes a frequent round trip. Add a workflow that records baselines and commits them to the pull request branch.

## References

- [ADR 0004](./0004-visual-regression-playwright.md): the Web counterpart and its baseline policy
- [ADR 0005](./0005-ios-app-architecture.md) Decision 5: snapshot tests deferred on iOS, now superseded by this ADR
- [ADR 0026](./0026-single-design-token-source.md): the redesign this layer gates
- `.github/workflows/ci.yml`: the `mobile-android` and `mobile-ios` jobs
