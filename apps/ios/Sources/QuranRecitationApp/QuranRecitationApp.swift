import SwiftUI

@main
struct QuranRecitationApp: App {
  var body: some Scene {
    WindowGroup {
      AppRoot(
        backend: ApolloBackend(),
        telemetry: OSLogTelemetry()
      )
    }
  }
}

struct RecorderView: View {
  @ObservedObject var viewModel: RecordingViewModel

  var body: some View {
    VStack(spacing: 24) {
      VStack(alignment: .leading, spacing: 8) {
        Text("Surah ID")
          .font(.caption)
          .foregroundColor(.secondary)
        TextField("Surah ID", text: $viewModel.surahId)
          .textFieldStyle(.roundedBorder)
      }
      .frame(maxWidth: .infinity, alignment: .leading)

      Button(action: viewModel.toggleRecording) {
        Text(viewModel.isRecording ? "Stop & Score" : "Start Recording")
          .frame(maxWidth: .infinity)
      }
      .buttonStyle(.borderedProminent)
      .disabled(viewModel.isBusy)

      if let surahSummary = viewModel.surahSummary {
        VStack(alignment: .leading, spacing: 4) {
          Text(surahSummary.nameAr)
            .font(.headline)
          Text(summarizeSurah(surahSummary))
            .font(.subheadline)
            .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
      }

      statusView

      scoreView

      Spacer()
    }
    .padding()
    .alert("Error", isPresented: $viewModel.showError) {
      Button("OK", role: .cancel) {}
    } message: {
      Text(viewModel.errorMessage)
    }
  }

  @ViewBuilder
  private var statusView: some View {
    HStack {
      Circle()
        .fill(viewModel.statusColor)
        .frame(width: 10, height: 10)
      Text(viewModel.statusText)
        .font(.subheadline)
        .foregroundColor(.secondary)
    }
    .frame(maxWidth: .infinity, alignment: .leading)
  }

  @ViewBuilder
  private var scoreView: some View {
    if let result = viewModel.scoringResult {
      VStack(alignment: .leading, spacing: 12) {
        Text("Score")
          .font(.headline)
        Text(result.scoreText)
          .font(.largeTitle)
          .bold()
        if let verdict = result.verdict {
          Text(verdict)
            .font(.subheadline)
            .foregroundColor(.secondary)
        }
        if !result.segments.isEmpty {
          Text("Segments")
            .font(.headline)
          ForEach(result.segments, id: \.label) { segment in
            HStack {
              Text(segment.label)
              Spacer()
              Text(String(format: "%.2f", segment.score))
            }
            .font(.subheadline)
          }
        }
      }
      .frame(maxWidth: .infinity, alignment: .leading)
    }
  }
}
