// @generated
// This file was automatically generated and should not be edited.

@_exported import ApolloAPI

public extension QuranSchema {
  class GetSurahQuery: GraphQLQuery {
    public static let operationName: String = "GetSurah"
    public static let operationDocument: ApolloAPI.OperationDocument = .init(
      definition: .init(
        #"query GetSurah($id: ID!) { surah(id: $id) { __typename id nameAr nameEn revelationPlace ayahCount } }"#
      ))

    public var id: ID

    public init(id: ID) {
      self.id = id
    }

    public var __variables: Variables? { ["id": id] }

    public struct Data: QuranSchema.SelectionSet {
      public let __data: DataDict
      public init(_dataDict: DataDict) { __data = _dataDict }

      public static var __parentType: any ApolloAPI.ParentType { QuranSchema.Objects.Query }
      public static var __selections: [ApolloAPI.Selection] { [
        .field("surah", Surah?.self, arguments: ["id": .variable("id")]),
      ] }
      public static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
        GetSurahQuery.Data.self
      ] }

      public var surah: Surah? { __data["surah"] }

      /// Surah
      ///
      /// Parent Type: `Surah`
      public struct Surah: QuranSchema.SelectionSet {
        public let __data: DataDict
        public init(_dataDict: DataDict) { __data = _dataDict }

        public static var __parentType: any ApolloAPI.ParentType { QuranSchema.Objects.Surah }
        public static var __selections: [ApolloAPI.Selection] { [
          .field("__typename", String.self),
          .field("id", QuranSchema.ID.self),
          .field("nameAr", String.self),
          .field("nameEn", String.self),
          .field("revelationPlace", String.self),
          .field("ayahCount", Int.self),
        ] }
        public static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
          GetSurahQuery.Data.Surah.self
        ] }

        public var id: QuranSchema.ID { __data["id"] }
        public var nameAr: String { __data["nameAr"] }
        public var nameEn: String { __data["nameEn"] }
        public var revelationPlace: String { __data["revelationPlace"] }
        public var ayahCount: Int { __data["ayahCount"] }
      }
    }
  }

}