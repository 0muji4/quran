import XCTest
@testable import QuranRecitationApp

/// Verifies that `SignedUploadPayload.derivedUploadKey(from:)` strips
/// only the bucket segment from a presigned URL and keeps any object
/// prefix (e.g. `uploads/`) intact. Mirrors Android PR #439's
/// regression tests; the Swift implementation used to call
/// `URL.lastPathComponent`, which kept only the filename and broke
/// `createScoringJob` against S3-style buckets that store keys under a
/// prefix.
final class SignedUploadPayloadTests: XCTestCase {

  func test_keepsPrefixedKey_whenURLHasBucketAndPrefix() {
    let url = "https://r2.cloudflarestorage.com/tilawah-dev-uploads/uploads/1718717062-recitation.opus?X-Amz-Signature=abc"

    let key = SignedUploadPayload.derivedUploadKey(from: url)

    XCTAssertEqual(key, "uploads/1718717062-recitation.opus")
  }

  func test_keepsKeyWithoutPrefix_whenObjectSitsAtBucketRoot() {
    let url = "https://example.com/some-bucket/just-a-filename.opus"

    let key = SignedUploadPayload.derivedUploadKey(from: url)

    XCTAssertEqual(key, "just-a-filename.opus")
  }

  func test_keepsDeepPrefix_whenObjectSitsUnderMultipleSegments() {
    let url = "https://example.com/bucket/a/b/c/file.opus"

    let key = SignedUploadPayload.derivedUploadKey(from: url)

    XCTAssertEqual(key, "a/b/c/file.opus")
  }

  func test_returnsEmpty_whenPathOnlyHasBucketSegment() {
    let url = "https://example.com/bucket-only"

    let key = SignedUploadPayload.derivedUploadKey(from: url)

    XCTAssertEqual(key, "", "A path with no further slashes after the bucket has no object key to extract")
  }

  func test_returnsEmpty_whenStringIsNotAValidURL() {
    let key = SignedUploadPayload.derivedUploadKey(from: "")

    XCTAssertEqual(key, "")
  }

  func test_stripsLeadingSlash_andHandlesQueryString() {
    let url = "https://example.com/bucket/uploads/file.opus?X-Amz-Expires=900&X-Amz-Signature=def"

    let key = SignedUploadPayload.derivedUploadKey(from: url)

    XCTAssertEqual(
      key, "uploads/file.opus",
      "Query string must not leak into the upload key — URL.path strips it"
    )
  }
}
