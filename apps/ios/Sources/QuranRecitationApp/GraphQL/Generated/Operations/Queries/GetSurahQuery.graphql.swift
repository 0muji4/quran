// @generated
// This file was automatically generated and should not be edited.

@_exported import ApolloAPI
@_spi(Execution) @_spi(Unsafe) import ApolloAPI

public extension QuranSchema {
  nonisolated struct GetSurahQuery: GraphQLQuery {
    public static let operationName: String = "GetSurah"
    public static let operationDocument: ApolloAPI.OperationDocument = .init(
      definition: .init(
        #"query GetSurah($id: ID!) { surah(id: $id) { __typename id nameAr nameEn revelationPlace ayahCount } }"#
      ))

    public var id: ID

    public init(id: ID) {
      self.id = id
    }

    @_spi(Unsafe) public var __variables: Variables? { ["id": id] }

    nonisolated public struct Data: QuranSchema.SelectionSet {
      @_spi(Unsafe) public let __data: DataDict
      @_spi(Unsafe) public init(_dataDict: DataDict) { __data = _dataDict }

      @_spi(Execution) public static var __parentType: any ApolloAPI.ParentType { QuranSchema.Objects.Query }
      @_spi(Execution) public static var __selections: [ApolloAPI.Selection] { [
        .field("surah", Surah?.self, arguments: ["id": .variable("id")]),
      ] }
      @_spi(Execution) public static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
        GetSurahQuery.Data.self
      ] }

      public var surah: Surah? { __data["surah"] }

      /// Surah
      ///
      /// Parent Type: `Surah`
      nonisolated public struct Surah: QuranSchema.SelectionSet {
        @_spi(Unsafe) public let __data: DataDict
        @_spi(Unsafe) public init(_dataDict: DataDict) { __data = _dataDict }

        @_spi(Execution) public static var __parentType: any ApolloAPI.ParentType { QuranSchema.Objects.Surah }
        @_spi(Execution) public static var __selections: [ApolloAPI.Selection] { [
          .field("__typename", String.self),
          .field("id", QuranSchema.ID.self),
          .field("nameAr", String.self),
          .field("nameEn", String.self),
          .field("revelationPlace", String.self),
          .field("ayahCount", Int.self),
        ] }
        @_spi(Execution) public static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
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