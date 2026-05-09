// @generated
// This file was automatically generated and should not be edited.

@_exported import ApolloAPI

public extension QuranSchema {
  class ScoringJobQuery: GraphQLQuery {
    public static let operationName: String = "ScoringJob"
    public static let operationDocument: ApolloAPI.OperationDocument = .init(
      definition: .init(
        #"query ScoringJob($jobId: ID!) { scoringJob(jobId: $jobId) { __typename jobId status score verdict segments { __typename label score } feedback { __typename accuracy fluency completeness overall referenceAudioUrl transcript wer wordAlignments { __typename refWord hypWord op } } } }"#
      ))

    public var jobId: ID

    public init(jobId: ID) {
      self.jobId = jobId
    }

    public var __variables: Variables? { ["jobId": jobId] }

    public struct Data: QuranSchema.SelectionSet {
      public let __data: DataDict
      public init(_dataDict: DataDict) { __data = _dataDict }

      public static var __parentType: any ApolloAPI.ParentType { QuranSchema.Objects.Query }
      public static var __selections: [ApolloAPI.Selection] { [
        .field("scoringJob", ScoringJob?.self, arguments: ["jobId": .variable("jobId")]),
      ] }
      public static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
        ScoringJobQuery.Data.self
      ] }

      public var scoringJob: ScoringJob? { __data["scoringJob"] }

      /// ScoringJob
      ///
      /// Parent Type: `ScoringResult`
      public struct ScoringJob: QuranSchema.SelectionSet {
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
          ScoringJobQuery.Data.ScoringJob.self
        ] }

        public var jobId: QuranSchema.ID { __data["jobId"] }
        public var status: GraphQLEnum<QuranSchema.ScoringStatus> { __data["status"] }
        public var score: Double? { __data["score"] }
        public var verdict: String? { __data["verdict"] }
        public var segments: [Segment] { __data["segments"] }
        public var feedback: Feedback? { __data["feedback"] }

        /// ScoringJob.Segment
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
            ScoringJobQuery.Data.ScoringJob.Segment.self
          ] }

          public var label: String { __data["label"] }
          public var score: Double { __data["score"] }
        }

        /// ScoringJob.Feedback
        ///
        /// Parent Type: `PronunciationFeedback`
        public struct Feedback: QuranSchema.SelectionSet {
          public let __data: DataDict
          public init(_dataDict: DataDict) { __data = _dataDict }

          public static var __parentType: any ApolloAPI.ParentType { QuranSchema.Objects.PronunciationFeedback }
          public static var __selections: [ApolloAPI.Selection] { [
            .field("__typename", String.self),
            .field("accuracy", Double.self),
            .field("fluency", Double.self),
            .field("completeness", Double.self),
            .field("overall", Double.self),
            .field("referenceAudioUrl", String?.self),
            .field("transcript", String?.self),
            .field("wer", Double?.self),
            .field("wordAlignments", [WordAlignment].self),
          ] }
          public static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
            ScoringJobQuery.Data.ScoringJob.Feedback.self
          ] }

          public var accuracy: Double { __data["accuracy"] }
          public var fluency: Double { __data["fluency"] }
          public var completeness: Double { __data["completeness"] }
          public var overall: Double { __data["overall"] }
          public var referenceAudioUrl: String? { __data["referenceAudioUrl"] }
          public var transcript: String? { __data["transcript"] }
          public var wer: Double? { __data["wer"] }
          public var wordAlignments: [WordAlignment] { __data["wordAlignments"] }

          /// ScoringJob.Feedback.WordAlignment
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
              ScoringJobQuery.Data.ScoringJob.Feedback.WordAlignment.self
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