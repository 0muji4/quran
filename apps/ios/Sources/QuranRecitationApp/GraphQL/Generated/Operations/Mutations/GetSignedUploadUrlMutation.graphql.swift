// @generated
// This file was automatically generated and should not be edited.

@_exported import ApolloAPI
@_spi(Execution) @_spi(Unsafe) import ApolloAPI

public extension QuranSchema {
  nonisolated struct GetSignedUploadUrlMutation: GraphQLMutation {
    public static let operationName: String = "GetSignedUploadUrl"
    public static let operationDocument: ApolloAPI.OperationDocument = .init(
      definition: .init(
        #"mutation GetSignedUploadUrl($input: SignedUploadInput!) { getSignedUploadUrl(input: $input) { __typename url expiresAt } }"#
      ))

    public var input: SignedUploadInput

    public init(input: SignedUploadInput) {
      self.input = input
    }

    @_spi(Unsafe) public var __variables: Variables? { ["input": input] }

    nonisolated public struct Data: QuranSchema.SelectionSet {
      @_spi(Unsafe) public let __data: DataDict
      @_spi(Unsafe) public init(_dataDict: DataDict) { __data = _dataDict }

      @_spi(Execution) public static var __parentType: any ApolloAPI.ParentType { QuranSchema.Objects.Mutation }
      @_spi(Execution) public static var __selections: [ApolloAPI.Selection] { [
        .field("getSignedUploadUrl", GetSignedUploadUrl.self, arguments: ["input": .variable("input")]),
      ] }
      @_spi(Execution) public static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
        GetSignedUploadUrlMutation.Data.self
      ] }

      public var getSignedUploadUrl: GetSignedUploadUrl { __data["getSignedUploadUrl"] }

      /// GetSignedUploadUrl
      ///
      /// Parent Type: `SignedUploadUrl`
      nonisolated public struct GetSignedUploadUrl: QuranSchema.SelectionSet {
        @_spi(Unsafe) public let __data: DataDict
        @_spi(Unsafe) public init(_dataDict: DataDict) { __data = _dataDict }

        @_spi(Execution) public static var __parentType: any ApolloAPI.ParentType { QuranSchema.Objects.SignedUploadUrl }
        @_spi(Execution) public static var __selections: [ApolloAPI.Selection] { [
          .field("__typename", String.self),
          .field("url", String.self),
          .field("expiresAt", QuranSchema.DateTime.self),
        ] }
        @_spi(Execution) public static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
          GetSignedUploadUrlMutation.Data.GetSignedUploadUrl.self
        ] }

        public var url: String { __data["url"] }
        public var expiresAt: QuranSchema.DateTime { __data["expiresAt"] }
      }
    }
  }

}