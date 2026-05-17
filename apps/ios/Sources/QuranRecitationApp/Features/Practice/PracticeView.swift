import SwiftUI

/// Practice screen layout: back button, "Surah · ayah N" title with a
/// menu, progress dots, AyahCard, and teacher reference panel.
/// Recording panel and analysing/error states land in PR 14–16.
struct PracticeView: View {
  @StateObject var viewModel: PracticeViewModel
  let onClose: () -> Void

  init(viewModel: @autoclosure @escaping () -> PracticeViewModel, onClose: @escaping () -> Void) {
    self._viewModel = StateObject(wrappedValue: viewModel())
    self.onClose = onClose
  }

  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: Spacing.lg) {
        topBar
        progressDots
        if let ayah = viewModel.ayah, let surah = viewModel.surah {
          AyahCard(
            surahNameEn: surah.nameEn,
            ayahNumber: ayah.ayahNumber,
            textAr: ayah.textAr
          )
          .padding(.horizontal, Spacing.screenHorizontal)
          TeacherReferencePanel(
            reciterName: viewModel.reciterName,
            state: viewModel.teacherState,
            availableRates: PracticeViewModel.supportedReferenceRates,
            isLoopEnabled: viewModel.isLoopEnabled,
            onTogglePlayback: { viewModel.toggleReferencePlayback() },
            onSelectRate: { viewModel.setReferenceRate($0) },
            onToggleLoop: { viewModel.toggleLoop() }
          )
          .padding(.horizontal, Spacing.screenHorizontal)
          activePanel
            .padding(.horizontal, Spacing.screenHorizontal)
          ayahNavRow
            .padding(.horizontal, Spacing.screenHorizontal)
        } else if case .error(let error) = viewModel.state {
          Text(error.errorDescription ?? "")
            .font(Font.brand.body)
            .foregroundColor(Color.brand.textSecondary)
            .padding(.horizontal, Spacing.screenHorizontal)
        } else {
          ProgressView()
            .frame(maxWidth: .infinity)
            .padding(.top, Spacing.xxl)
        }
      }
      .padding(.vertical, Spacing.lg)
    }
    .background(Color.brand.surface.ignoresSafeArea())
    .navigationBarBackButtonHidden(true)
    .task {
      if viewModel.ayah == nil {
        await viewModel.load()
        await viewModel.loadReference()
      }
    }
  }

  @ViewBuilder
  private var activePanel: some View {
    switch viewModel.state {
    case .idle, .recording, .uploading, .done:
      RecordingPanel(
        state: viewModel.state,
        onTapRecord: { viewModel.toggleRecording() }
      )
    case .analysing(let step):
      AnalysingPanel(step: step)
    case .error(let error):
      PracticeErrorPanel(
        error: error,
        onReplay: { viewModel.replayLastRecording() },
        onRecordAgain: { viewModel.resetForRetry() }
      )
    }
  }

  private var topBar: some View {
    HStack {
      Button(action: onClose) {
        Image(systemName: "chevron.right")
          .rotationEffect(.degrees(180))
          .foregroundColor(Color.brand.textPrimary)
          .padding(Spacing.sm)
          .background(Color.brand.card)
          .clipShape(Circle())
      }
      Spacer()
      VStack {
        Text(title)
          .font(Font.brand.body.weight(.semibold))
          .foregroundColor(Color.brand.textPrimary)
      }
      Spacer()
      Image(systemName: "ellipsis")
        .foregroundColor(Color.brand.textPrimary)
        .padding(Spacing.sm)
        .background(Color.brand.card)
        .clipShape(Circle())
    }
    .padding(.horizontal, Spacing.screenHorizontal)
  }

  /// Bar + "currentAyah / total" indicator (see
  /// `docs/design/iOS _ Practice _ long surah.png`). Replaces the
  /// older 10-dot row, which silently went all-grey for any surah
  /// with more than 10 ayahs because no dot index ever matched a
  /// `currentAyahNumber ≥ 11`. The bar scales linearly across the
  /// surah so the indicator works for both Al-Fatihah (7 ayahs)
  /// and Al-Baqarah (286).
  @ViewBuilder
  private var progressDots: some View {
    if let count = viewModel.surah?.ayahCount, count > 0 {
      HStack(spacing: Spacing.md) {
        GeometryReader { geo in
          ZStack(alignment: .leading) {
            Capsule()
              .fill(Color.brand.tile)
              .frame(height: 4)
              .frame(maxHeight: .infinity, alignment: .center)
            Circle()
              .fill(Color.brand.primary)
              .frame(width: Self.indicatorDiameter, height: Self.indicatorDiameter)
              .offset(
                x: Self.indicatorOffset(
                  currentAyahNumber: viewModel.currentAyahNumber,
                  ayahCount: count,
                  trackWidth: geo.size.width
                )
              )
          }
        }
        .frame(height: Self.indicatorDiameter)

        VStack(alignment: .trailing, spacing: -2) {
          Text("\(viewModel.currentAyahNumber) /")
            .font(.system(size: 13, weight: .semibold))
            .foregroundColor(Color.brand.textPrimary)
          Text("\(count)")
            .font(.system(size: 13))
            .foregroundColor(Color.brand.textSecondary)
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(
          Text(
            "practice.progress.a11y \(viewModel.currentAyahNumber) \(count)",
            bundle: .module
          )
        )
      }
      .padding(.horizontal, Spacing.screenHorizontal)
    }
  }

  /// Diameter of the teal indicator on the progress bar. Kept in
  /// one place so the offset math doesn't drift from the rendered
  /// circle size.
  private static let indicatorDiameter: CGFloat = 10

  /// Where to put the indicator's leading edge along the track.
  /// Ayah 1 sits at 0; the final ayah sits at `trackWidth -
  /// indicatorDiameter` so the circle stays flush inside the bar.
  /// Single-ayah surahs (count == 1) pin to the left.
  static func indicatorOffset(
    currentAyahNumber: Int,
    ayahCount: Int,
    trackWidth: CGFloat
  ) -> CGFloat {
    guard ayahCount > 1, trackWidth > indicatorDiameter else { return 0 }
    let clampedAyah = max(1, min(currentAyahNumber, ayahCount))
    let progress = CGFloat(clampedAyah - 1) / CGFloat(ayahCount - 1)
    return progress * (trackWidth - indicatorDiameter)
  }

  /// Two-button nav row at the bottom of the Practice page, mirroring
  /// the web "Prev / Next ayah" controls. Disables the corresponding
  /// button at the surah boundaries so the user can't tap into a
  /// non-existent ayah.
  private var ayahNavRow: some View {
    HStack(spacing: Spacing.md) {
      Button {
        Task { await viewModel.goToPreviousAyah() }
      } label: {
        Label {
          Text("practice.nav.prev", bundle: .module)
        } icon: {
          Image(systemName: "chevron.left")
        }
        .font(Font.brand.body.weight(.semibold))
        .foregroundColor(Color.brand.textPrimary)
        .frame(maxWidth: .infinity, minHeight: Spacing.minTapTarget)
        .background(Color.brand.card)
        .clipShape(RoundedRectangle(cornerRadius: Spacing.cardCornerRadius, style: .continuous))
      }
      .buttonStyle(.plain)
      .disabled(!viewModel.canGoToPreviousAyah)
      .opacity(viewModel.canGoToPreviousAyah ? 1 : 0.4)

      Button {
        Task { await viewModel.goToNextAyah() }
      } label: {
        Label {
          Text("practice.nav.next", bundle: .module)
        } icon: {
          Image(systemName: "chevron.right")
        }
        .labelStyle(.titleAndIcon)
        .environment(\.layoutDirection, .rightToLeft)  // icon trailing
        .font(Font.brand.body.weight(.semibold))
        .foregroundColor(Color.brand.textOnPrimary)
        .frame(maxWidth: .infinity, minHeight: Spacing.minTapTarget)
        .background(Color.brand.primary)
        .clipShape(RoundedRectangle(cornerRadius: Spacing.cardCornerRadius, style: .continuous))
      }
      .buttonStyle(.plain)
      .disabled(!viewModel.canGoToNextAyah)
      .opacity(viewModel.canGoToNextAyah ? 1 : 0.4)
    }
  }

  private var title: String {
    if let surah = viewModel.surah {
      return "\(surah.nameEn) · ayah \(viewModel.currentAyahNumber)"
    }
    return "Ayah \(viewModel.currentAyahNumber)"
  }
}
