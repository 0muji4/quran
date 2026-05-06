# iOS

Swift Package + SwiftUI client. Talks to the BFF (`:4000`) over GraphQL through Apollo iOS. Entry point is `apps/ios/Package.swift`.

## Prerequisites

- macOS with Xcode 15+ (Swift 5.9)
- iOS 16+ SDK

## Build (Xcode CLI)

```bash
xcodebuild \
  -scheme QuranRecitationApp \
  -destination "platform=iOS Simulator,name=iPhone 15,OS=latest" \
  build
```

## Test (Xcode CLI)

```bash
xcodebuild \
  -scheme QuranRecitationApp \
  -destination "platform=iOS Simulator,name=iPhone 15,OS=latest" \
  test
```

## Build (Xcode UI)

Open `apps/ios/Package.swift` in Xcode, select the `QuranRecitationApp` scheme, and run.

## GraphQL Code Generation

Regenerate Apollo types from `schemas/graphql/schema.graphql`. `apollo-ios-cli` must be installed on the host (or its path provided via `APOLLO_CLI`).

```bash
make -C apps/ios codegen         # regenerate
make -C apps/ios codegen-check   # verify generated code is up to date (used in CI)
```

Configuration: `apps/ios/apollo-codegen-config.json`. Generated output: `apps/ios/Sources/QuranRecitationApp/GraphQL/Generated/`.
