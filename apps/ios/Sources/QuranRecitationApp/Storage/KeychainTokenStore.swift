import Foundation
import Security

/// Production `TokenStore` backed by the iOS Keychain. Each item is a
/// `kSecClassGenericPassword` keyed by `(service, account)`; the user
/// profile is JSON-encoded. Items use
/// `kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly` so the signed-in
/// session survives relaunches, stays available while the device is
/// locked post-unlock, and is never synced to iCloud.
///
/// `SecItem` failures are swallowed rather than thrown — exactly like
/// `UserDefaultsHistoryStore` drops write failures. A failed write just
/// means the user re-authenticates on the next launch; it must not
/// crash the auth flow. Read failures return `nil`.
final class KeychainTokenStore: TokenStore {
  private let service: String

  init(service: String = TokenStoreConstants.service) {
    self.service = service
  }

  // MARK: - Tokens

  func loadTokens() -> AuthTokens? {
    guard
      let access = readString(account: TokenStoreConstants.Account.accessToken),
      let refresh = readString(account: TokenStoreConstants.Account.refreshToken)
    else {
      return nil
    }
    return AuthTokens(accessToken: access, refreshToken: refresh)
  }

  func saveTokens(_ tokens: AuthTokens) {
    write(Data(tokens.accessToken.utf8), account: TokenStoreConstants.Account.accessToken)
    write(Data(tokens.refreshToken.utf8), account: TokenStoreConstants.Account.refreshToken)
  }

  // MARK: - User

  func loadUser() -> AuthenticatedUser? {
    guard let data = read(account: TokenStoreConstants.Account.user) else { return nil }
    return try? JSONDecoder().decode(AuthenticatedUser.self, from: data)
  }

  func saveUser(_ user: AuthenticatedUser) {
    guard let data = try? JSONEncoder().encode(user) else { return }
    write(data, account: TokenStoreConstants.Account.user)
  }

  // MARK: - Clear

  func clear() {
    delete(account: TokenStoreConstants.Account.accessToken)
    delete(account: TokenStoreConstants.Account.refreshToken)
    delete(account: TokenStoreConstants.Account.user)
  }

  // MARK: - Keychain primitives

  private func baseQuery(account: String) -> [String: Any] {
    [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: service,
      kSecAttrAccount as String: account
    ]
  }

  private func read(account: String) -> Data? {
    var query = baseQuery(account: account)
    query[kSecReturnData as String] = true
    query[kSecMatchLimit as String] = kSecMatchLimitOne

    var item: CFTypeRef?
    let status = SecItemCopyMatching(query as CFDictionary, &item)
    guard status == errSecSuccess else { return nil }
    return item as? Data
  }

  private func readString(account: String) -> String? {
    read(account: account).flatMap { String(data: $0, encoding: .utf8) }
  }

  /// Upsert: try to update an existing item, fall back to add. Both
  /// outcomes are best-effort; a non-success status is intentionally
  /// ignored (see type doc).
  private func write(_ data: Data, account: String) {
    let query = baseQuery(account: account)
    let updateStatus = SecItemUpdate(
      query as CFDictionary,
      [kSecValueData as String: data] as CFDictionary
    )
    if updateStatus == errSecItemNotFound {
      var addQuery = query
      addQuery[kSecValueData as String] = data
      addQuery[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
      _ = SecItemAdd(addQuery as CFDictionary, nil)
    }
  }

  private func delete(account: String) {
    _ = SecItemDelete(baseQuery(account: account) as CFDictionary)
  }
}
