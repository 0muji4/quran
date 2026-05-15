import Foundation
import XCTest
@testable import QuranRecitationApp

/// Records every `URLRequest` handed to it and replays canned outcomes
/// in FIFO order. Used to drive `AuthHTTPClient` (and clients built on
/// top of it) without touching the network — each test enqueues the
/// exact response sequence it wants to exercise.
final class TransportSpy: @unchecked Sendable {
  private let lock = NSLock()
  private var responses: [() throws -> (Data, HTTPURLResponse)]
  private var recordedRequests: [URLRequest] = []

  init(responses: [() throws -> (Data, HTTPURLResponse)]) {
    self.responses = responses
  }

  /// Snapshot of every `URLRequest` the spy has observed so far. The
  /// lock-protected read lets tests assert from the main actor after
  /// `await` returns without racing the transport closure.
  var requests: [URLRequest] {
    lock.lock()
    defer { lock.unlock() }
    return recordedRequests
  }

  /// Captured `Authorization` header values, one per call (or `nil`
  /// when the header was missing). Convenient for asserting the
  /// Bearer-attach + post-refresh re-attach without indexing into the
  /// raw `URLRequest` array.
  var authorizationHeaders: [String?] {
    requests.map { $0.value(forHTTPHeaderField: "Authorization") }
  }

  func transport(file: StaticString = #filePath, line: UInt = #line) -> AuthHTTPClient.Transport {
    { [self] request in
      self.lock.lock()
      self.recordedRequests.append(request)
      guard !self.responses.isEmpty else {
        self.lock.unlock()
        XCTFail("TransportSpy called more times than canned responses", file: file, line: line)
        throw AppError.backendUnavailable(operation: "spy.exhausted")
      }
      let next = self.responses.removeFirst()
      self.lock.unlock()
      return try next()
    }
  }
}

/// Sugar for building an HTTP response with no body wiring boilerplate.
func httpResponse(status: Int, url: URL = URL(string: "https://api.example.com")!) -> HTTPURLResponse {
  HTTPURLResponse(url: url, statusCode: status, httpVersion: nil, headerFields: nil)!
}
