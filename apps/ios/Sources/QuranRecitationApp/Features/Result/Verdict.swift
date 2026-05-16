import Foundation

/// Score-band verdict copy. A pure function intentionally mirroring the
/// web client's `apps/web/app/(app)/practice/result/verdict.ts` so the
/// two clients show the same badge / headline / subhead for the same
/// numeric score.
///
/// The BFF returns a `verdict: String?` field that nothing on the
/// server side actually populates (the `scoring_jobs.verdict` column is
/// never written), so both clients converge by computing the band
/// locally instead. If the BFF starts owning this in the future, the
/// migration is a per-client swap from this helper to the server field;
/// for now the two `verdictForScore` implementations are deliberately
/// kept structurally identical.
struct VerdictBand: Equatable {
  let badge: String
  let headline: String
  let subhead: String
}

func verdictForScore(_ score: Double?) -> VerdictBand {
  guard let score, !score.isNaN else {
    return VerdictBand(
      badge: localized("result.verdict.awaiting.badge"),
      headline: localized("result.verdict.awaiting.headline"),
      subhead: localized("result.verdict.awaiting.subhead")
    )
  }
  if score >= 90 {
    return VerdictBand(
      badge: localized("result.verdict.mastered.badge"),
      headline: localized("result.verdict.mastered.headline"),
      subhead: localized("result.verdict.mastered.subhead")
    )
  }
  if score >= 70 {
    return VerdictBand(
      badge: localized("result.verdict.great.badge"),
      headline: localized("result.verdict.great.headline"),
      subhead: localized("result.verdict.great.subhead")
    )
  }
  if score >= 40 {
    return VerdictBand(
      badge: localized("result.verdict.midway.badge"),
      headline: localized("result.verdict.midway.headline"),
      subhead: localized("result.verdict.midway.subhead")
    )
  }
  return VerdictBand(
    badge: localized("result.verdict.beginner.badge"),
    headline: localized("result.verdict.beginner.headline"),
    subhead: localized("result.verdict.beginner.subhead")
  )
}

private func localized(_ key: String) -> String {
  NSLocalizedString(key, bundle: .module, comment: "")
}
