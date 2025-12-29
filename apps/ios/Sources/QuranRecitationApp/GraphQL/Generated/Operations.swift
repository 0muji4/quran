import ApolloAPI

public struct GetSignedUploadUrlMutation: GraphQLMutation {
  public static let operationName: String = "GetSignedUploadUrl"
  public static let operationDocument: OperationDocument = .init(
    definition: .init(
      """
      mutation GetSignedUploadUrl($input: SignedUploadInput!) {
        getSignedUploadUrl(input: $input) {
          url
        }
      }
      """
    )
  )

  public var input: SignedUploadInput

  public init(input: SignedUploadInput) {
    self.input = input
  }

  public var __variables: Variables? { ["input": input] }

  public struct Data: SelectionSet {
    public static var __parentType: ParentType { QuranSchema.Objects.Mutation }
    public static var __selections: [Selection] {
      [
        .field("getSignedUploadUrl", GetSignedUploadUrl.self, arguments: ["input": .variable("input")])
      ]
    }

    public var getSignedUploadUrl: GetSignedUploadUrl { __data["getSignedUploadUrl"] }

    public struct GetSignedUploadUrl: SelectionSet {
      public static var __parentType: ParentType { QuranSchema.Objects.SignedUploadUrl }
      public static var __selections: [Selection] { [ .field("url", String.self) ] }

      public var url: String { __data["url"] }
    }
  }
}

public struct CreateScoringJobMutation: GraphQLMutation {
  public static let operationName: String = "CreateScoringJob"
  public static let operationDocument: OperationDocument = .init(
    definition: .init(
      """
      mutation CreateScoringJob($input: CreateScoringJobInput!) {
        createScoringJob(input: $input) {
          jobId
          status
          score
          verdict
          segments {
            label
            score
          }
        }
      }
      """
    )
  )

  public var input: CreateScoringJobInput

  public init(input: CreateScoringJobInput) {
    self.input = input
  }

  public var __variables: Variables? { ["input": input] }

  public struct Data: SelectionSet {
    public static var __parentType: ParentType { QuranSchema.Objects.Mutation }
    public static var __selections: [Selection] {
      [
        .field("createScoringJob", CreateScoringJob.self, arguments: ["input": .variable("input")])
      ]
    }

    public var createScoringJob: CreateScoringJob { __data["createScoringJob"] }

    public struct CreateScoringJob: SelectionSet {
      public static var __parentType: ParentType { QuranSchema.Objects.ScoringResult }
      public static var __selections: [Selection] {
        [
          .field("jobId", String.self),
          .field("status", ScoringStatus.self),
          .field("score", Double?.self),
          .field("verdict", String?.self),
          .field("segments", [Segment].self)
        ]
      }

      public var jobId: String { __data["jobId"] }
      public var status: ScoringStatus { __data["status"] }
      public var score: Double? { __data["score"] }
      public var verdict: String? { __data["verdict"] }
      public var segments: [Segment] { __data["segments"] }

      public struct Segment: SelectionSet {
        public static var __parentType: ParentType { QuranSchema.Objects.ScoreSegment }
        public static var __selections: [Selection] {
          [
            .field("label", String.self),
            .field("score", Double.self)
          ]
        }

        public var label: String { __data["label"] }
        public var score: Double { __data["score"] }
      }
    }
  }
}

public struct ScoringJobQuery: GraphQLQuery {
  public static let operationName: String = "ScoringJob"
  public static let operationDocument: OperationDocument = .init(
    definition: .init(
      """
      query ScoringJob($jobId: ID!) {
        scoringJob(jobId: $jobId) {
          jobId
          status
          score
          verdict
          segments {
            label
            score
          }
        }
      }
      """
    )
  )

  public var jobId: String

  public init(jobId: String) {
    self.jobId = jobId
  }

  public var __variables: Variables? { ["jobId": jobId] }

  public struct Data: SelectionSet {
    public static var __parentType: ParentType { QuranSchema.Objects.Query }
    public static var __selections: [Selection] {
      [
        .field("scoringJob", ScoringJob.self, arguments: ["jobId": .variable("jobId")])
      ]
    }

    public var scoringJob: ScoringJob { __data["scoringJob"] }

    public struct ScoringJob: SelectionSet {
      public static var __parentType: ParentType { QuranSchema.Objects.ScoringResult }
      public static var __selections: [Selection] {
        [
          .field("jobId", String.self),
          .field("status", ScoringStatus.self),
          .field("score", Double?.self),
          .field("verdict", String?.self),
          .field("segments", [Segment].self)
        ]
      }

      public var jobId: String { __data["jobId"] }
      public var status: ScoringStatus { __data["status"] }
      public var score: Double? { __data["score"] }
      public var verdict: String? { __data["verdict"] }
      public var segments: [Segment] { __data["segments"] }

      public struct Segment: SelectionSet {
        public static var __parentType: ParentType { QuranSchema.Objects.ScoreSegment }
        public static var __selections: [Selection] {
          [
            .field("label", String.self),
            .field("score", Double.self)
          ]
        }

        public var label: String { __data["label"] }
        public var score: Double { __data["score"] }
      }
    }
  }
}
