// @generated
// This file was automatically generated and should not be edited.

@_exported import ApolloAPI

public extension QuranSchema {
  class GetSignedUploadUrlMutation: GraphQLMutation {
    public static let operationName: String = "GetSignedUploadUrl"
    public static let operationDocument: ApolloAPI.OperationDocument = .init(
      definition: .init(
        #"mutation GetSignedUploadUrl($input: SignedUploadInput!) { getSignedUploadUrl(input: $input) { __typename url expiresAt } }"#
      ))

    public var input: SignedUploadInput

    public init(input: SignedUploadInput) {
      self.input = input
    }

    public var __variables: Variables? { ["input": input] }

    public struct Data: QuranSchema.SelectionSet {
      public let __data: DataDict
      public init(_dataDict: DataDict) { __data = _dataDict }

      public static var __parentType: any ApolloAPI.ParentType { QuranSchema.Objects.Mutation }
      public static var __selections: [ApolloAPI.Selection] { [
        .field("getSignedUploadUrl", GetSignedUploadUrl.self, arguments: ["input": .variable("input")]),
      ] }
      public static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
        GetSignedUploadUrlMutation.Data.self
      ] }

      public var getSignedUploadUrl: GetSignedUploadUrl { __data["getSignedUploadUrl"] }

      /// GetSignedUploadUrl
      ///
      /// Parent Type: `SignedUploadUrl`
      public struct GetSignedUploadUrl: QuranSchema.SelectionSet {
        public let __data: DataDict
        public init(_dataDict: DataDict) { __data = _dataDict }

        public static var __parentType: any ApolloAPI.ParentType { QuranSchema.Objects.SignedUploadUrl }
        public static var __selections: [ApolloAPI.Selection] { [
          .field("__typename", String.self),
          .field("url", String.self),
          .field("expiresAt", QuranSchema.DateTime.self),
        ] }
        public static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
          GetSignedUploadUrlMutation.Data.GetSignedUploadUrl.self
        ] }

        public var url: String { __data["url"] }
        public var expiresAt: QuranSchema.DateTime { __data["expiresAt"] }
      }
    }
  }

}