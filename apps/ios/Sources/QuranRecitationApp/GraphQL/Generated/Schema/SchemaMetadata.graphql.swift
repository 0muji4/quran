// @generated
// This file was automatically generated and should not be edited.

import ApolloAPI

public protocol QuranSchema_SelectionSet: ApolloAPI.SelectionSet & ApolloAPI.RootSelectionSet
where Schema == QuranSchema.SchemaMetadata {}

public protocol QuranSchema_InlineFragment: ApolloAPI.SelectionSet & ApolloAPI.InlineFragment
where Schema == QuranSchema.SchemaMetadata {}

public protocol QuranSchema_MutableSelectionSet: ApolloAPI.MutableRootSelectionSet
where Schema == QuranSchema.SchemaMetadata {}

public protocol QuranSchema_MutableInlineFragment: ApolloAPI.MutableSelectionSet & ApolloAPI.InlineFragment
where Schema == QuranSchema.SchemaMetadata {}

public extension QuranSchema {
  typealias SelectionSet = QuranSchema_SelectionSet

  typealias InlineFragment = QuranSchema_InlineFragment

  typealias MutableSelectionSet = QuranSchema_MutableSelectionSet

  typealias MutableInlineFragment = QuranSchema_MutableInlineFragment

  enum SchemaMetadata: ApolloAPI.SchemaMetadata {
    public static let configuration: any ApolloAPI.SchemaConfiguration.Type = SchemaConfiguration.self

    private static let objectTypeMap: [String: ApolloAPI.Object] = [
      "Ayah": QuranSchema.Objects.Ayah,
      "Mutation": QuranSchema.Objects.Mutation,
      "PronunciationFeedback": QuranSchema.Objects.PronunciationFeedback,
      "Query": QuranSchema.Objects.Query,
      "ScoreSegment": QuranSchema.Objects.ScoreSegment,
      "ScoringResult": QuranSchema.Objects.ScoringResult,
      "SignedUploadUrl": QuranSchema.Objects.SignedUploadUrl,
      "Surah": QuranSchema.Objects.Surah,
      "WordAlignment": QuranSchema.Objects.WordAlignment
    ]

    public static func objectType(forTypename typename: String) -> ApolloAPI.Object? {
      objectTypeMap[typename]
    }
  }

  enum Objects {}
  enum Interfaces {}
  enum Unions {}

}