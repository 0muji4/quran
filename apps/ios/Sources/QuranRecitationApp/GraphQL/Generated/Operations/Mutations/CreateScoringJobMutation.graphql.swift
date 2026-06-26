// @generated
// This file was automatically generated and should not be edited.

@_exported import ApolloAPI

public extension QuranSchema {
  class CreateScoringJobMutation: GraphQLMutation {
    public static let operationName: String = "CreateScoringJob"
    public static let operationDocument: ApolloAPI.OperationDocument = .init(
      definition: .init(
        #"mutation CreateScoringJob($input: CreateScoringJobInput!) { createScoringJob(input: $input) { __typename jobId status score verdict segments { __typename label score } feedback { __typename accuracy completeness overall referenceAudioUrl transcript wer cer wordAlignments { __typename refWord hypWord op } } } }"#
      ))

    public var input: CreateScoringJobInput

    public init(input: CreateScoringJobInput) {
      self.input = input
    }

    public var __variables: Variables? { ["input": input] }

    public struct Data: QuranSchema.SelectionSet {
      public let __data: DataDict
      public init(_dataDict: DataDict) { __data = _dataDict }

      public static var __parentType: any ApolloAPI.ParentType { QuranSchema.Objects.Mutation }
      public static var __selections: [ApolloAPI.Selection] { [
        .field("createScoringJob", CreateScoringJob.self, arguments: ["input": .variable("input")]),
      ] }
      public static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
        CreateScoringJobMutation.Data.self
      ] }

      public var createScoringJob: CreateScoringJob { __data["createScoringJob"] }

      /// CreateScoringJob
      ///
      /// Parent Type: `ScoringResult`
      public struct CreateScoringJob: QuranSchema.SelectionSet {
        public let __data: DataDict
        public init(_dataDict: DataDict) { __data = _dataDict }

        public static var __parentType: any ApolloAPI.ParentType { QuranSchema.Objects.ScoringResult }
        public static var __selections: [ApolloAPI.Selection] { [
          .field("__typename", String.self),
          .field("jobId", QuranSchema.ID.self),
          .field("status", GraphQLEnum<QuranSchema.ScoringStatus>.self),
          .field("score", Double?.self),
          .field("verdict", String?.self),
          .field("segments", [Segment].self),
          .field("feedback", Feedback?.self),
        ] }
        public static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
          CreateScoringJobMutation.Data.CreateScoringJob.self
        ] }

        public var jobId: QuranSchema.ID { __data["jobId"] }
        public var status: GraphQLEnum<QuranSchema.ScoringStatus> { __data["status"] }
        public var score: Double? { __data["score"] }
        public var verdict: String? { __data["verdict"] }
        public var segments: [Segment] { __data["segments"] }
        public var feedback: Feedback? { __data["feedback"] }

        /// CreateScoringJob.Segment
        ///
        /// Parent Type: `ScoreSegment`
        public struct Segment: QuranSchema.SelectionSet {
          public let __data: DataDict
          public init(_dataDict: DataDict) { __data = _dataDict }

          public static var __parentType: any ApolloAPI.ParentType { QuranSchema.Objects.ScoreSegment }
          public static var __selections: [ApolloAPI.Selection] { [
            .field("__typename", String.self),
            .field("label", String.self),
            .field("score", Double.self),
          ] }
          public static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
            CreateScoringJobMutation.Data.CreateScoringJob.Segment.self
          ] }

          public var label: String { __data["label"] }
          public var score: Double { __data["score"] }
        }

        /// CreateScoringJob.Feedback
        ///
        /// Parent Type: `PronunciationFeedback`
        public struct Feedback: QuranSchema.SelectionSet {
          public let __data: DataDict
          public init(_dataDict: DataDict) { __data = _dataDict }

          public static var __parentType: any ApolloAPI.ParentType { QuranSchema.Objects.PronunciationFeedback }
          public static var __selections: [ApolloAPI.Selection] { [
            .field("__typename", String.self),
            .field("accuracy", Double.self),
            .field("completeness", Double.self),
            .field("overall", Double.self),
            .field("referenceAudioUrl", String?.self),
            .field("transcript", String?.self),
            .field("wer", Double?.self),
            .field("cer", Double?.self),
            .field("wordAlignments", [WordAlignment].self),
          ] }
          public static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
            CreateScoringJobMutation.Data.CreateScoringJob.Feedback.self
          ] }

          public var accuracy: Double { __data["accuracy"] }
          public var completeness: Double { __data["completeness"] }
          public var overall: Double { __data["overall"] }
          public var referenceAudioUrl: String? { __data["referenceAudioUrl"] }
          public var transcript: String? { __data["transcript"] }
          public var wer: Double? { __data["wer"] }
          public var cer: Double? { __data["cer"] }
          public var wordAlignments: [WordAlignment] { __data["wordAlignments"] }

          /// CreateScoringJob.Feedback.WordAlignment
          ///
          /// Parent Type: `WordAlignment`
          public struct WordAlignment: QuranSchema.SelectionSet {
            public let __data: DataDict
            public init(_dataDict: DataDict) { __data = _dataDict }

            public static var __parentType: any ApolloAPI.ParentType { QuranSchema.Objects.WordAlignment }
            public static var __selections: [ApolloAPI.Selection] { [
              .field("__typename", String.self),
              .field("refWord", String?.self),
              .field("hypWord", String?.self),
              .field("op", String.self),
            ] }
            public static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
              CreateScoringJobMutation.Data.CreateScoringJob.Feedback.WordAlignment.self
            ] }

            public var refWord: String? { __data["refWord"] }
            public var hypWord: String? { __data["hypWord"] }
            public var op: String { __data["op"] }
          }
        }
      }
    }
  }

}