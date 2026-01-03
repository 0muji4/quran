import Foundation

func uploadDestinationDescription(from payload: SignedUploadPayload) -> String {
  "PUT \(payload.url) (expires \(payload.expiresAt))"
}
