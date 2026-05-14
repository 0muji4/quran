# Tilawah Web リデザイン後のフォローアップロードマップ

- **Author**: motoshi.suzuki
- **Last Updated**: 2026-05-14
- **Status**: Draft
- **Related PR**: [#87 feat(web): Tilawah brand redesign — surah library, practice flow, history](https://github.com/0muji4/quran-project/pull/87)
- **Related DD**: `docs/dd/teacher-voice-and-pronunciation-feedback.md`

---

## 1. 文脈

PR #87 において、Web フロントエンド `apps/web/` を Tilawah ブランドのリデザインに置き換えた。具体的には Surah library（`/`）、Practice 画面（`/practice?surah=&ayah=`）、History 画面（`/history`）の 3 ルートを新設し、デザイントークン、Cormorant Garamond / Inter / Amiri フォント、状態機械（idle → recording → uploading → scoring → done）駆動のレコーダー、そして localStorage による Continue / Best score / Recent attempts の永続化を導入した。BFF への Server Action シグネチャと OpenTelemetry tracing は無変更とし、既存テスト群はリグレッションガードとして温存した。

このリデザインは「再開しやすく、次に練習する Surah を選びやすく、録音中に没入感がある」という体験を実現する基礎を整えたが、プロダクトとして完成させるためには複数の継続課題が残っている。本ドキュメントは、それらの課題を **影響度 × 工数 × 依存** の観点で位相分けし、後続 PR の起票順を明確にすることを目的とする。

## 2. 評価軸

各タスクは以下の 3 軸で評価する。

| 軸         | 内容                                                                                        |
| ---------- | ------------------------------------------------------------------------------------------- |
| **影響度** | プロダクト価値・ユーザー体験・組織への波及。S（不可欠）/ M（あると嬉しい）/ L（長期的価値） |
| **工数**   | 実装＋検証＋レビュー込みの規模感。S（〜1日）/ M（数日）/ L（1スプリント以上）               |
| **依存**   | 先行して必要な変更（BFF スキーマ、認証、デザイン承認 等）                                   |

優先度は「影響度 ÷ 工数」を基本としつつ、依存解消のクリティカルパス上にあるタスクを上に引き上げる。

## 3. タスク

### Phase 1: マージ直後の小修正（影響度 S 〜 M / 工数 S）

リデザイン本体に紛れ込ませず、独立して取り込めるが先送りすべきでない項目。

#### 1.1 既知の事前負債の解消 — Done in PR #90

| 負債                                         | 場所                                         | 対応                                                                                                | 状態                |
| -------------------------------------------- | -------------------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------- |
| `Response` 型キャストの型エラー              | `apps/web/app/__tests__/actions.test.ts:321` | `as unknown as Response` への書き換え。`pnpm typecheck` の green 化。                               | ✅ Done in PR #90   |
| `DROP DATABASE` 中の Postgres セッション競合 | `apps/bff/src/__tests__/setup.ts:52`         | クリーンアップ前に `pg_terminate_backend` で残存接続を切断、または `force: true` 相当の処理を導入。 | ✅ Done in PR #90   |

これらは PR #87 では touch しなかった事前負債だが、ローカル `pnpm test` の green 復旧には影響度がある。

PR #90 の作業中に追加で判明した事項として、`apps/bff/src/infra/storage.ts` のモジュール singleton pool が
integration test 終了時に解放されず、`pg_terminate_backend` で切断された後に unhandled error を吐く
副次問題があった。これは `resetDatabasePool()` を test-only seam として export し、
`storage.integration.test.ts` の `afterAll` で呼ぶことで合わせて解消している（同 PR）。

#### 1.2 マイクボタンのコピー整合確認

モックアップの "tap and hold the mic to record, release to stop" コピーは PR #87 で "tap the mic to record, tap again to stop and submit." に書き換えた（press-and-hold ジェスチャ未実装のため）。`/practice` 下部の Tip と、`RecorderPanel` の caption の両方が tap to start / tap to stop の前提で揃っているかを再確認する。

#### 1.3 Difficulty heuristic のドキュメント化

`apps/web/app/lib/classify.ts:difficultyOf` は ayahCount に基づく placeholder ヒューリスティックである旨をコードコメントで明記済みだが、Suggested カードの "Easy" 表示が暫定であることをチーム内で周知し、Phase 3 で BFF サポートに置き換える計画と紐付ける。

### Phase 2: 短期（次の PR、UI 完成度の引き上げ）

マージ後 1〜2 週間で着手すべき、ユーザーが直接価値を感じる改善。

#### 2.1 スコア結果画面の独立化 — Done in PR #93 + followup batch

**現状**: `RecorderPanel` の done 状態は `N/100` の大きな数字と `<details>` で開く `SegmentHighlights`（既存 UI コンポーネント）の 2 段構成にとどまる。`feedback.transcript` / `wer` / segment ハイライトといった採点根拠は片隅にしか出ない。

**ゴール**: `/practice/result/:jobId` のような専用ルートで、語単位アライメント・WER・accuracy / fluency / completeness の各スコアと、再録音導線、`/practice?surah=&ayah=` への戻り導線を一体化して提示する。

**依存**: `useScoringJob` の `job.jobId` を URL パラメータに乗せて再利用する。BFF の `GET /scoring-jobs/:id` がその場で読み出せるため、データ層の変更は不要。

**影響度 S / 工数 M**。

**完了状況**:

| サブスコープ | 状態 | PR |
| ------------ | ---- | -- |
| Result page core (Hero / metrics / Word-by-word / auto-redirect) | ✅ Done | #93 |
| Listen back (BFF presigned `recordingUrl` + Web players) | ✅ Done | #106 |
| Polling slow/stuck hint + Surah-completion celebration toast | ✅ Done | #107 |
| Result page a11y polish (h1 / role=img / role=progressbar / focus mgmt) | ✅ Done | #126 |
| `/practice` URL を path-based に移行 (`/practice/[surahId]/[ayahNumber]/result/[jobId]`) | ✅ Done | #127 |
| Analysing UI (3-step checklist + shimmer waveform + Scoring badge) | ✅ Done | #129 / #130 |
| Could-not-score error UI (replay + too-short guard + COULDN'T PROCESS badge) | ✅ Done | #131 / #132 |
| Result detail micro additions (Listen back "Play both" / Action row "Save attempt") | ✅ Done | #133 / #134 |

#### 2.2 モバイル / タブレット最適化 — Done in PRs #136–#140

**現状**: グリッドや 2 カラムパネルは `@media (max-width: 900px)` で 1 カラム化したが、実機検証は未実施。Continue カードのコンパスSVG・8 点星・コーナー装飾の縮小挙動、Arabic テキストの折り返し（特に Al-Baqarah のような長文 ayah）に未確認のリスクがある。

**ゴール**: iOS Safari / Chrome（375 / 414 / 768 / 1024 幅）で実機確認を行い、必要箇所のレイアウトと余白を調整する。タップターゲットサイズ 44px の確保。

**影響度 S / 工数 M**。

##### 2.2 監査結果（コードベースから抽出した具体的問題）

2026-05-09 時点の audit。修正待ちの 7 件 + tap target 8 種類 = 計 15 項目。

**A. 必ず壊れる / overflow 懸念**

| # | 場所 | 問題 |
|---|------|------|
| A-1 | `apps/web/app/styles/practice.module.css:123-129` `.ayahArabic` | `clamp(40px, 5.5vw, 64px)` は床 40px 固定だが、`word-break` / `overflow-wrap` 未設定。Al-Baqarah 2:255（49 単語 / 213 文字）が 375px viewport で水平 overflow を起こす可能性 |

**B. WCAG 44px 未満の tap target**

| # | 場所 | 現状サイズ |
|---|------|------------|
| B-1 | `practice.module.css:348-357` `.speedPill` (0.75× / 1.00× / 1.25×) | padding 6px 14px → 高さ ~24-26px |
| B-2 | `practice.module.css:369-376` `.loopBtn` | text only, 高さ ~16-20px |
| B-3 | `practice.module.css:752-767` `.btnGhost` | 8px 14px → ~30-34px |
| B-4 | `practice.module.css:769-783` `.btnTeal` | 8px 14px → ~30-34px |
| B-5 | `practice.module.css:701-718` `.recorderCancel` | 8px 16px → ~30-34px |
| B-6 | `practice.module.css:815-839` `.navBtn` | 10px 18px → ~36-40px |
| B-7 | `library.module.css:131-160` `.btnGold` / `.btnGhostDark` | 10px 18px → ~36-40px |
| B-8 | `nav.module.css:59-84` `.tab` | 6px 2px → ~25-27px（mobile 切替後も同じ） |
| B-9 | `history.module.css:56-73` `.statusPill` | 4px 10px → ~24-26px |

**C. 視覚的に窮屈（broken ではないが mobile 体験を損なう）**

| # | 場所 | 問題 |
|---|------|------|
| C-1 | `apps/web/app/library/ContinueCard.tsx:14-24` + `library.module.css:43-52` `.continueOrnament` | compass SVG が 200px 固定、375px ではカード幅の 61% を占める。media query 未設定 |
| C-2 | `library.module.css:249-261` `.searchBox` | `min-width: 280px` で 375px 時に余白 47px しか残らない |
| C-3 | `practice.module.css:973-980` `.sideStats` (Result hero) | `grid-template-columns: repeat(3, max-content)` で 900px 以下も 3-col 維持、フォント縮小なし |
| C-4 | `practice.module.css:1158-1185` `.wordCompareTiles` / `.wordTile` | `min-width: 64px + padding 28px = 92px/個`。Al-Baqarah 49 単語で 13-14 行になる |

##### 2.2 推奨 PR 分割（200 行/PR ターゲット）

| PR | スコープ | 主な対象クラス | 推定行数 |
|----|---------|----------------|----------|
| **2.2-A** | tap targets を全部 ≥44px に統一 (B-1〜B-9) | `.speedPill` `.loopBtn` `.btnGhost` `.btnTeal` `.btnGold` `.btnGhostDark` `.navBtn` `.recorderCancel` `.tab` `.statusPill` | ~120 |
| **2.2-B** | Arabic text overflow ガード + Word tile mobile 縮小 (A-1, C-4) | `.ayahArabic` `.wordCompareTiles` `.wordTile` | ~80 |
| **2.2-C** | ContinueCard ornament + library mobile (C-1, C-2) | `.continueOrnament` `.searchBox` `.searchInput` `.filterPills` | ~80 |
| **2.2-D** | Result hero stats モバイル breakpoint (C-3) | `.sideStats` `.sideStatLabel` `.sideStatValue` `.scoreDial` クラス周辺 | ~40 |
| **2.2-E** | Playwright multi-viewport fixtures（375 / 414 / 768 / 1024）+ smoke specs | `playwright.config.ts` `e2e/tests/mobile-layout.spec.ts`（新規） | ~100 |

**順序**: 2.2-A → B → C → D を独立して並行可、E は A〜D 完了後にリグレッション検出インフラとして追加。各 PR は別ブランチ + `gh api repos/.../pulls -X POST` で起票（GraphQL レート対策）。

**完了状況**:

| サブスコープ | 状態 | PR |
| ------------ | ---- | -- |
| 2.2-A: tap targets ≥44px (`.speedPill` / `.loopBtn` / `.btnGhost` / `.btnTeal` / `.btnGold` / `.btnGhostDark` / `.navBtn` / `.recorderCancel` / `.tab`) + 32px on display-only `.statusPill` | ✅ Done | #136 |
| 2.2-B: Arabic overflow guard (`.ayahArabic` `overflow-wrap` / `word-break`) + word tile mobile shrink (`@media (max-width: 600px)`) | ✅ Done | #137 |
| 2.2-C: ContinueCard ornament `clamp(120px, 40vw, 200px)` + library search / filter mobile tweaks | ✅ Done | #138 |
| 2.2-D: Result hero stats 1fr 3-col + label / value / padding shrink at `@media (max-width: 700px)` | ✅ Done | #139 |
| 2.2-E: Playwright multi-viewport projects (`mobile-iphone` / `tablet-ipad` / `desktop-1024`, chromium-only) + `e2e/tests/mobile/mobile-layout.spec.ts` smoke suite | ✅ Done | #140 |

実装上の差分メモ:

- 2.2-A の `.statusPill` は interactive ではない表示専用バッジのため、WCAG 2.5.5 の 44px 規定対象外。他要素との統一感のみ確保し 32px に留めた。
- 2.2-E は `devices['iPhone 12']` の WebKit preset を採用せず、`devices['Desktop Chrome']` をベースに `viewport` のみ上書きする構成にした。CI の `playwright install --with-deps chromium`（`.github/workflows/e2e.yml:60`）だけで成立させるため。
- mic ボタン（`.micButton`）は 76×76px と元から 44px 規定をクリアしていたため監査表に含めず、2.2-E の boundingBox 検査も regression 用ガード位置付け。

残課題（任意）:

- 実機（iOS Safari / Chrome 375 / 414 / 768 / 1024）での目視確認は別途。DevTools での確認は完了。
- 2.2-E は CI shard あたりのテスト数が 25 → 34 に増える。CI 時間が問題化したら「PR は chromium-desktop のみ・nightly で全 viewport」運用への切替を検討。

##### 2.2 各 PR の詳細実装ガイド

**2.2-A (tap targets)**:
- 各 class に `min-height: 44px` を追加し、padding は維持しつつ flex で中央寄せ
- `.tab` (nav) は `padding-block: 12px` に増やして `min-height: 44px` 確保
- `.speedPill` / `.loopBtn` は親 `.teacherControls` の wrap 挙動も確認
- 既存の visual を壊さないため、padding を増やすのではなく `min-height` + `align-items: center` で対処
- 単体テストはなし（CSS のみ）。手動確認は Playwright `viewport: { width: 375, height: 812 }` で各 button の `boundingBox().height >= 44`

**2.2-B (Arabic overflow)**:
- `.ayahArabic` に `overflow-wrap: break-word` / `word-break: break-word` 追加
- `@media (max-width: 600px)` で `clamp(32px, 5.5vw, 64px)` に floor を下げる（40 → 32）
- `.wordTile` に `@media (max-width: 600px)` で `min-width: 48px; padding: 8px 10px; font-size: 18px`
- `.ayahCard` の `padding: var(--space-12) var(--space-8)` を mobile では `padding: var(--space-8) var(--space-5)` に
- 検証: Al-Baqarah 2:255 を 375px DevTools で確認、horizontal scroll が出ないこと

**2.2-C (ContinueCard ornament + library)**:
- `.continueOrnament` を `clamp(120px, 40vw, 200px)` に変更、または `@media (max-width: 600px) { display: none }`
- `.searchBox` の `min-width` を mobile で 200px に、または `min-width: 0` + flex 全幅
- `.searchInput` font-size を 15 → 14px (mobile)
- `.filterPills` の gap を mobile では `var(--space-2)` (8 → 4 px は small)

**2.2-D (Result hero stats)**:
- `.sideStats` に `@media (max-width: 700px) { grid-template-columns: repeat(3, 1fr); gap: var(--space-3); }`
- `.sideStatValue` を mobile で 18px、`.sideStatLabel` を 10px
- 必要なら `.resultHero` の `padding: var(--space-6) var(--space-8)` を mobile で `var(--space-5) var(--space-5)` に

**2.2-E (Playwright multi-viewport)**:
- `e2e/playwright.config.ts` に `projects` を追加: `mobile-iphone` (Pixel 5/iPhone 12 等の preset)、`tablet-ipad`、`desktop-1024`
- 新規 `e2e/tests/mobile-layout.spec.ts` で各 viewport ごとに:
  - 主要画面（library / practice / result）が水平スクロールしないこと（`document.documentElement.scrollWidth <= window.innerWidth`）
  - 主要 tap target の `boundingBox().height >= 44`
  - Al-Baqarah `/practice/2/255` で ayah が overflow しないこと
- CI 時間が伸びるため、PR チェックは chromium desktop のみ・nightly で multi-viewport 走査の運用に倒すのも検討

##### 2.2 引き継ぎノート

- audit は 2026-05-09 時点。**進める前に develop の最新を pull** して座標が動いていないか再確認すること
- ユーザー指針:
  - PR 規模 ~200 行 / 件、scaffolding と integration を分けるパターンが確立済み（PR #129/#130 / #131/#132 が参考）
  - PR description / commit メッセージは英語、AI / Claude フッター不要
  - GraphQL レートが切れたら `gh api repos/.../pulls -X POST` で REST 起票
  - CI 失敗は e2e の URL / heading assertion 周辺が再発しやすい — `RecordPage.ts` ロケータと `error-handling.spec.ts` `navigation.spec.ts` を真っ先に確認

#### 2.3 アクセシビリティ pass — Done in PRs #142–#146

**現状**: マイクボタンとコントロールに `aria-label` / `aria-pressed` を付与し、見出し階層も整備したが、状態遷移のスクリーンリーダー読み上げ・キーボード操作・フォーカスリング・コントラストの完全性は未検証。

**ゴール**:

- 録音状態の遷移（idle → recording → uploading → scoring → done）を `aria-live="polite"` で読み上げる
- キーボードのみで Library → Practice → 録音開始 → 停止 → 結果まで完走できる
- フォーカスリングが装飾と衝突しない（特にゴールド系背景上）
- WCAG AA のコントラスト比を Recorder dark panel と Practice cream 背景の両方で満たす

**影響度 M（基盤）/ 工数 M**。`@axe-core/playwright` を e2e に組み込む形で検証を仕組み化したい。

**完了状況**:

| サブスコープ | 状態 | PR |
| ------------ | ---- | -- |
| 2.3-A: `@axe-core/playwright` scaffold + allow-listed baseline (`/`、`/practice/1/1`、`/history` の 3 ルート、chromium-desktop 限定) | ✅ Done | #142 |
| 2.3-B: RecorderPanel に `role="status" aria-live="polite"` の状態アナウンス（`recorderStatus.ts` 純関数 + 8 ユニットテスト） | ✅ Done | #143 |
| 2.3-C: TopNav `role="tablist"` 削除 / HistoryList の `<ul>/<li>` 化 / SurahCard の集約 `aria-label` | ✅ Done | #144 |
| 2.3-D: `--color-ink-on-dark-mut` を AA 適合に bump / `prefers-reduced-motion` で 4 アニメーション停止 / dark bg 上の focus outline tan に override | ✅ Done | #145 |
| 2.3-E: skip-to-content link + `<main id="main-content" tabIndex={-1}>` + 3 つの keyboard-flow e2e | ✅ Done | #146 |

実装上の差分メモ:

- 監査では `TeacherPanel` の speed pills と `ContinueCard` の aria-label も対処対象として挙げていたが、実コード確認で前者の `role="group" + aria-pressed` は valid ARIA、後者は単一 Link カードでなく内部に複数 CTA を持つため aria-label を貼る対象がない、と判断して 2.3-C のスコープから除外（PR #144 description 参照）。
- 2.3-A の axe baseline は最初の CI 実行で `page-has-heading-one` を flag した。`/practice/[s]/[a]` には h1 が無く（RecorderPanel と TeacherPanel が h3 のみ）、Library と History は既に h1 を持つ。`KNOWN_VIOLATIONS` に追加して baseline を緑に保ち、heading 階層決定は別途扱いとした（PR #142 fix commit 参照）。
- 2.3-B の aria-live 文言は当初 visible caption と同じ「Tap the mic to begin」「tap to stop and submit」を使ったが、`RecordPage.idleCaption` / `recordingCaption` の `getByText` ロケータが strict mode で 2 要素一致して既存 `recording-flow.spec.ts` を壊した。意味を保ったまま重複しない言い回しに改めた（PR #143 fix commit 参照）。
- mobile / tablet projects で a11y spec を走らせない（chromium-desktop 限定）のは、視覚回帰は 2.2-E の `mobile-layout.spec.ts` で押さえる役割分担。a11y は viewport 非依存の問題が中心のため重複を避けた。

残課題（任意）:

- ~~`/practice/[s]/[a]` ルートに h1 を追加する~~ ✅ 解消済み。`apps/web/app/practice/[surahId]/[ayahNumber]/page.tsx:49` に `<h1 className="sr-only">` を追加。axe baseline からも `page-has-heading-one` の allow-list entry を削除（`e2e/tests/a11y/axe.spec.ts:23` `KNOWN_VIOLATIONS = []`）。ADR 0002 の "shrinking allow-list" 方針通り。
- ~~on-cream の AA 不足 3 パターン~~ ✅ 解消済み。ADR 0003 の split-token 移行は commit `a83baff` で全パターン消化（`.eyebrow` → `var(--color-gold-on-light)`、`.btnGold` の color: `#fff` → `var(--color-ink-strong)`、`--color-ink-muted` darken）。`grep "color: #fff"` で残るのは teal / ink-strong 背景上のみ。axe `color-contrast` 違反ゼロ、`KNOWN_VIOLATIONS = []` を維持（`e2e/tests/a11y/axe.spec.ts:23`）。ADR 0004 の視覚回帰 baseline は既存 3 シーン（library / history / practice-idle）が gold-button を覆っているため、別途 baseline 撮影は不要。
- macOS VoiceOver / NVDA での実機読み上げ確認（2.3-B の aria-live、2.3-E の skip link は DevTools / Playwright で機能確認済み）。

#### 2.4 Press-and-hold マイクジェスチャの再検討

モックアップの当初コピーに合わせて press-and-hold（押し下げで録音開始、離して停止）を実装するか、現在の tap-to-start / tap-to-stop コピーで確定するかをプロダクト判断する。実装する場合、以下の挙動を満たす：

- マウス長押し / タッチ長押しの両方に対応
- 100ms 未満の誤タップは録音開始扱いにしない
- スワイプキャンセル（押下中に外に動かして離すと送信せず破棄）

**影響度 M / 工数 M**。決定保留中であれば本フォローアップから除外可。

### Phase 3: 中期（次スプリント、構造変更を伴う）

ユーザーがデバイスを跨いだり実運用に入る段階で必須となる、データ層・認証層の変更。

#### 3.1 履歴・ベストスコア・Continue の BFF 永続化 — Done in PRs #210–#215, #221

**現状**: `LastPracticed` / `BestScores` / `AttemptsLog` は localStorage `tilawah:*` 名前空間に閉じている。ブラウザを変える、シークレットウィンドウで開く、ストレージをクリアするだけで全て消失する。

**ゴール**: BFF 側にエンドポイントを設け、Server Action 経由で読み書きする。スキーマ案：

```
GET  /me/last-practiced       → LastPracticed | null
PUT  /me/last-practiced       (body: LastPracticed)
GET  /me/best-scores          → Record<surahId:ayahNumber, BestScoreEntry>
PUT  /me/best-scores/:key     (body: BestScoreEntry)
GET  /me/attempts?limit=50    → Attempt[]
POST /me/attempts             (body: Attempt)
```

クライアント側は `app/lib/storage.ts` を抽象化レイヤとして残し、内部実装を Server Action 呼び出しに切り替える。**localStorage は読み取り専用キャッシュとして残す**ことで、初回 paint と低速ネットワーク時の体験を維持する。

**依存**: 3.2（認証）の `userId` の確定。スキーマ追加に伴う DB マイグレーション。

**影響度 S（プロダクト化に必須）/ 工数 L**。

**完了状況**:

| サブスコープ | 状態 | PR |
| ------------ | ---- | -- |
| 3.1-A: `last_practiced` / `best_scores` / `practice_attempts` migration (ADR 0011) | ✅ Done | #210 |
| 3.1-B: BFF `/me/*` GET/PUT/POST routes + storage adapter | ✅ Done | #211 / #212 |
| 3.1-C: `MOCK_SESSION` を seeded UUID 化（FK 整合） | ✅ Done | #214 |
| 3.1-D: Web `storage.ts` を BFF cache-first に切替 + Server Actions 配線 | ✅ Done | #215 |
| 3.1-E: 匿名 localStorage の初回 sign-up 時 BFF へのオートインポート | ✅ Done | #221 |

#### 3.2 認証導線と実ユーザーアバター — Done in PRs #209, #216–#220

**現状**: TopNav 右肩のアバターは `"N"` をハードコードした表示用要素。BFF は `MOCK_SESSION=true` で動作している。

**ゴール**: 既存の認証基盤（JWT）を有効化し、サインイン導線を実装する。アバターは表示名のイニシャルから生成する。サインイン未完了でも `/` と `/practice` の閲覧は可能（ゲストモード）とし、録音やスコア保存時に認証を要求する段階的導入を取る。

**依存**: BFF 側の認証実装。3.1 を BFF 永続化と合わせて行うのが効率的。

**影響度 S / 工数 L**。

**完了状況**:

| サブスコープ | 状態 | PR |
| ------------ | ---- | -- |
| 3.2-A: ADR 0010 (Email + Password)・ADR 0011 (BFF persistence + localStorage cache) | ✅ Done | #209 |
| 3.2-B-DB: `users.password_hash` カラム追加 | ✅ Done | #216 |
| 3.2-B-BFF: `POST /auth/signup` / `POST /auth/login`（bcrypt + JWT、timing-attack 耐性） | ✅ Done | #217 |
| 3.2-C: Web Server Actions（signUp / signIn / signOut）+ HttpOnly cookies + `bffFetch` Bearer 転送 | ✅ Done | #218 |
| 3.2-C-2: `/sign-in` `/sign-up` ページと `AuthForm`（`useTransition` で状態管理） | ✅ Done | #219 |
| 3.2-D: TopNav の session 表示（avatar / Sign in / Sign out）+ `clearLocalCache` | ✅ Done | #220 |

#### 3.3 Difficulty / Suggested の真ロジック化 — Done in PRs #235, #236

**現状**: `difficultyOf(surah)` は `ayahCount <= 10 → Easy` の placeholder。`pickSuggestion` は決定論的に Al-Ikhlas（id=112）にフォールバックする。

**ゴール**: BFF が「ユーザーの過去 Best Score の平均」「最近練習していない短い surah」を指標として返す `/me/suggestions` を提供する。クライアントの `lib/classify.ts` はその応答を表示するだけのアダプターに縮退する。

**依存**: 3.1（履歴の BFF 永続化）。

**影響度 M / 工数 M**。

**完了状況**:

| サブスコープ | 状態 | PR |
| ------------ | ---- | -- |
| 3.3-A: BFF `GET /me/suggestions`（`composeSuggestion` pure selector + Mecca-short 候補 SQL + 11 unit tests）+ ADR 0015 | ✅ Done | #235 |
| 3.3-B: Web `fetchSuggestionFromBff()` Server Action + `classify.ts` thin adapter（BFF レスポンス使用 → `ayahCount` heuristic にフォールバック）+ Library Server Component 配線 + e2e smoke | ✅ Done | #236 |

実装上のメモ:

- ADR 0015 で閾値（`>=85` easy / `>=60` medium / 7 日 recent-window）と `FALLBACK_SURAH_ID = '112'` を明文化。Phase 4.4 telemetry が入ったら再校正する前提。
- BFF レスポンスの `difficulties` は **sparse map**（`best_scores` 行のある surah のみ）。クライアントは entry の無い surah については `ayahCount` heuristic に fallback するため、114 surah 分を返す必要はない。
- ゲスト（未認証）は 401 を Server Action 内で吸収して `null` を返す。`SuggestedCard` は既存の placeholder で描画継続。
- `reason` フィールド（`short_unpracticed` / `short_low_score` / `fallback`）は UI 非表示。Phase 4.4 で Suggested クリックを branch に attribute する telemetry hook 候補。

#### 3.4 Visual regression の導入 — Done in PRs #148, #149, #238, #239

**現状**: 装飾要素（コーナー・8 点星・コンパス SVG・グラデーション）が多く、CSS 変更でデグレを生むリスクが高い。回帰検出は人手レビューに依存している。

**ゴール**: Playwright の `toHaveScreenshot()` または Chromatic を導入し、Surah library / Practice ready / Recording / Done / History の 5 シーンをスナップショット化する。`addInitScript` で localStorage を seed して再現可能なシーンを作る。

**影響度 M / 工数 M**。Playwright `toHaveScreenshot()` 採用と Linux Chromium ベースライン運用の合意は ADR 0004。

**完了状況**:

| サブスコープ | 状態 | PR |
| ------------ | ---- | -- |
| Scaffold (`visual.spec.ts` + Docker baseline 運用) | ✅ Done | #148 |
| 3 active scene (library / history / practice idle) | ✅ Done | #149 |
| Result scene (`scoring_jobs` + `asr_results` seed + audio mask + `NODE_ENV=development` で `MOCK_SESSION` 実効化) | ✅ Done | #238 |
| Recording scene (Docker `--network=host` への切替で `MediaRecorder` 解禁、`test.fixme` 撤去) | ✅ Done | #239 |

実装上のメモ:

- 旧 spec コメントの `MediaRecorder is unsupported in the Playwright Docker image` は誤診断だった。真因は `--network=docker_default` + `http://web:3000` が Chromium の secure-context allow-list 外で `navigator.mediaDevices` が `undefined` になることで、`--network=host` + `http://localhost:3000`（CI と同じ構成）で解決。README にもこの修正を反映済み。
- Result scene baseline は CI で ~770-1306 px の drift が出たため `mask: [page.locator('audio')]` + `maxDiffPixels: 2000` を採用。Native `<audio controls>` chrome の subpixel 差を吸収。
- `ops/docker/compose.dev.yml` の bff service に `NODE_ENV: development` を追加。BFF Dockerfile が production 固定なので dev/CI compose では `MOCK_SESSION` が gate を抜けず `/scoring-jobs/:id` が 401 を返していた問題を解消。

### Phase 4: 長期 / 横断

複数領域に跨り、必ずしも単一スプリントで完結しない継続的取り組み。

#### 4.1 i18n（特にアラビア語 UI）

**現状**: UI ラベルは英語ハードコード。アプリの基本ユーザー像を踏まえるとアラビア語切替の価値は高い。

**ゴール**: `next-intl` を導入し、英・アラビアの 2 言語を切替可能にする。RTL レイアウトに対応するため、`<html dir>` の動的切替と CSS Logical Properties（`margin-inline-start` 等）への置き換えを段階的に行う。

**影響度 S / 工数 L**。

#### 4.2 Cross-browser e2e — Done in PR #243

**現状**: `playwright.config.ts` は chromium のみ。

**ゴール**: Firefox / WebKit を CI matrix に追加し、`grantPermissions(['microphone'])` の挙動差異と Arabic フォントレンダリング差異を検出する。

**影響度 M / 工数 S**。CI 時間が約 3 倍になるため、PR ベースは chromium のみ・nightly で全 3 ブラウザという運用にすると現実的。

**完了状況**:

| サブスコープ | 状態 | PR |
| ------------ | ---- | -- |
| `playwright.config.ts` の `firefox-desktop` / `webkit-desktop` プロジェクト追加（`E2E_CROSS_BROWSER=true` で gate） | ✅ Done | #243 |
| `.github/workflows/nightly-ci.yml` に `cross-browser-e2e` matrix job 追加（firefox + webkit、独立 artefact） | ✅ Done | #243 |
| ADR 0017（PR-time vs nightly scope、testIgnore 戦略、failure policy） | ✅ Done | #243 |

実装上のメモ:

- Static-UI subset のみ cross-browser 対象。視覚回帰（ADR 0004 で Linux Chromium 専用）/ a11y（chromium 固定、PR #142）/ mobile viewport / `recording-flow.spec.ts`（chromium 固有 fake-stream フラグ依存）は `testIgnore` で除外。
- PR-time CI は env unset のため新プロジェクト不可視・既存挙動維持。`E2E_CROSS_BROWSER=true pnpm test:e2e --project=firefox-desktop` でローカル debugging 可。
- ローカル run には `pnpm exec playwright install --with-deps firefox webkit` が必要。

#### 4.3 パフォーマンス最適化

**現状**: 3 種の Google Fonts（Cormorant + Inter + Amiri）を `next/font/google` で自己ホストしている。Phase 4.3-A で `@next/bundle-analyzer` を env-gate 導入し、初回 baseline を取得済み（PR 進行中 / ADR 0018）。

**観点**:

- Amiri arabic subset の重量（~80KB）の確認と subset 限定（必要 Glyph のみ）
- `PracticeClient` を全 client コンポーネント化しているが、ボタンクリックを必要としない `AyahDisplayCard` 等は server で完結している。さらに `RecorderPanel` のみ client にして、装飾の hydration コストを下げる余地がある
- Lighthouse スコアと FCP / LCP / TTI の継続計測

**影響度 M / 工数 M**。

##### 4.3 サブ PR 分割

| サブ PR | スコープ | 主な対象 | 推定行数 |
|----|---------|----------|----------|
| **4.3-A** | bundle analyzer 導入 + baseline 計測 | `next.config.mjs` `package.json` ADR 0018 | ~80 |
| **4.3-B** | `PracticeClient` の server/client 境界分割 | `PracticeClient.tsx` `AyahDisplayCard.tsx` `SegmentHighlights.tsx` | ~200 |
| **4.3-C** | Web Vitals → OTel / Lighthouse CI baseline | `web-tracer.ts` 拡張 or `.github/workflows/nightly-ci.yml` | ~150 |
| **4.3-D** | Amiri unicode-range で Quran glyph subset 化 | `layout.tsx` の `next/font/google` → `next/font/local` 切替 | ~60 |

##### 4.3 baseline（2026-05-13、PR 進行中 / Phase 4.3-A）

`ANALYZE=true pnpm --filter @quran-project/web run analyze` で取得。詳細は ADR 0018。

**Per-route First Load JS（gzipped）**:

| Route | Page JS | First Load JS |
| ----- | ------- | ------------- |
| `/practice/[s]/[a]` | 6.82 kB | **136 kB** ← 最重 |
| `/practice/[s]/[a]/result/[jobId]` | 5.03 kB | **134 kB** |
| `/` | 6.2 kB | 130 kB |
| `/history` | 3.03 kB | 108 kB |
| `/sign-in` / `/sign-up` | 2.87 kB | 108 kB |
| shared baseline | — | 102 kB (54.2 + 45.4 + 1.95) |

**Per-font woff2（first-paint cost）**:

| 用途 | Font / subset | サイズ |
| ---- | ------------- | ------ |
| 英語 UI body | Cormorant latin `.p` | ~37 KiB |
| 英語 UI sans | Inter latin `.p` | ~47 KiB |
| **Ayah Arabic 本体** | **Amiri arabic-400 `.p`** | **~106 KiB** ← 最重 |
| Ayah Arabic 太字 | Amiri arabic-700 `.p` | ~98 KiB |
| 1 routes per-paint 合計（400 のみ） | | ~190 KiB |
| 1 routes per-paint 合計（400 + 700） | | ~288 KiB |

→ **4.3-D の Amiri Quran-subset 化が単独で最大の font 削減レバー**。Quran 朗誦 corpus は ~700 glyph、Amiri full は ~3,500 glyph。

→ **4.3-B の `/practice` JS 分割が単独で最大の JS 削減レバー**。shared 102 kB の 54 kB / 45 kB チャンクは framework + OTel browser tracer と推定。analyzer HTML で confirm 予定。

#### 4.4 クライアント側テレメトリ — Done in PRs #241, #242

**現状**: Server Action は OpenTelemetry の span を持つが、UI イベント（recording_started / completed_attempt / loop_toggled / suggested_clicked 等）は未計測。

**ゴール**: 既存の `app/telemetry/*` を拡張し、ブラウザから OTel collector に SPAN を送る薄いラッパを `useRecorder` / `useTeacherAudio` / `RecorderPanel` 内のキー操作に挿入する。プロダクト計測（KR2 の検証サイクル加速の根拠）として活用する。

**影響度 M / 工数 S**。

**完了状況**:

| サブスコープ | 状態 | PR |
| ------------ | ---- | -- |
| Browser OTel scaffold (`web-tracer.ts` `WebTracerProvider` + `BatchSpanProcessor` + `OTLPTraceExporter`、`NEXT_PUBLIC_OTEL_ENDPOINT` で gate)、`trackUiEvent(name, attrs)` 閉じた `web.ui.*` event union、`WebTelemetryInit` `'use client'` mounted from `layout.tsx`、ADR 0016 | ✅ Done | #241 |
| Instrumentation call sites: `RecorderPanel` (recording_started / stopped / cancelled、durationMs + tooShort)、`SuggestedCard` (suggested_clicked、`reason` 属性に ADR 0015 を載せる)、`TeacherPanel` (speed_changed / loop_toggled)、`ResultDetail` (`ResultViewedTracker` 経由で result_viewed) | ✅ Done | #242 |

実装上のメモ:

- 命名規約 `web.ui.*` で server-side `ServerAction: …` span と分離。
- PII rules を ADR 0016 に明記（enum-like / numeric / boolean のみ。email・transcript text・displayName は禁止）。
- `NEXT_PUBLIC_OTEL_ENDPOINT` 未設定時は no-op。dev / preview / CI で常に silent、production 環境で collector endpoint が provision されてから flip。
- `ResultViewedTracker` は Server Component が直接 `trackUiEvent` を呼べない制約への対処。`'use client'` で `useEffect` 一発、`return null;` の薄いコンポーネント。

## 4. 依存関係

```
Phase 1 (1.1, 1.2, 1.3)        ─┐
                                 │
Phase 2 (2.1)                ────┘ → 単独でマージ可
Phase 2 (2.2 mobile)         ────  → 単独でマージ可
Phase 2 (2.3 a11y)           ────  → 単独でマージ可（@axe-core/playwright 導入を伴う）
Phase 2 (2.4 hold gesture)   ────  → プロダクト決定待ち

Phase 3 (3.2 auth)           ────┐
                                  ├─ 3.1（永続化）が両者に依存
Phase 3 (3.1 persistence)    ────┘
Phase 3 (3.3 suggestions)    ────  → 3.1 完了後
Phase 3 (3.4 visual regress) ────  → 単独でマージ可

Phase 4 (4.1 i18n)           ────  → 任意のタイミング、ただし 2.3 の a11y 改善後が望ましい
Phase 4 (4.2 cross-browser)  ────  → 単独
Phase 4 (4.3 performance)    ────  → 単独
Phase 4 (4.4 telemetry)      ────  → 単独（KR2 早期 Win）
```

クリティカルパス（プロダクト化に必須）は **3.2 auth → 3.1 persistence → 3.3 suggestions** の順。

## 5. 推奨着手順

「影響度 / 工数」が高く、依存ブロックが少ないものから順に着手する。

1. **2.1 スコア結果画面** — 採点機能の存在感を引き上げる。データ層変更不要で短期で成果が見える
2. **2.3 アクセシビリティ pass** — ユーザー対応範囲を広げる基礎工事。`@axe-core/playwright` 導入で恒常的にガード
3. **3.1 + 3.2 永続化 + 認証** — プロダクト化の必須事項。両者をペアで進める
4. **2.2 モバイル最適化** — 並走可能。実機検証次第でスコープ拡縮
5. **4.4 クライアントテレメトリ** — 永続化を待たず開始可。KR2（仮説検証サイクル加速）の早期 Win
6. **2.4 / 3.3 / 3.4 / 4.1 / 4.2 / 4.3** — 上記が片付き次第、残工数で消化

## 6. スコープ外（明示的に保留）

以下は意図的に Phase 4 までに含めず、別の意思決定機会に持ち越す。

- **本物のリアルタイム音声波形（Teacher 側）**: 現状は `currentTime` 駆動の装飾実装。CORS と帯域コストを踏まえると、AudioBuffer デコードに踏み切るには別途要件が必要
- **アバターのカスタム画像アップロード**: 認証導入後、必要性が確認できた段階で別 PRD を起こす
- **Tajwid（朗誦規則）に基づく高度なスコアリング UI**: DD `teacher-voice-and-pronunciation-feedback.md` の Phase 2 領域。本ロードマップとは別軸で進行中

## 7. 改訂履歴

| 日付       | 改訂者         | 内容                                                                       |
| ---------- | -------------- | -------------------------------------------------------------------------- |
| 2026-05-08 | motoshi.suzuki | 初版（PR #87 マージ前提で起票）                                            |
| 2026-05-08 | motoshi.suzuki | Phase 1.1 を PR #90 で消化済みとマーク。storage singleton leak の併合解消も追記 |
| 2026-05-09 | motoshi.suzuki | Phase 2.1 + 2.1.x を全消化済みとマーク（PR #93 / #106 / #107 / #126 / #127 / #129 / #130 / #131 / #132 / #133 / #134）。Phase 2.2 を実装可能粒度に分解（A〜E の 5 PR スコープ + 詳細実装ガイド + 引き継ぎノート） |
| 2026-05-09 | motoshi.suzuki | Phase 2.2 を全消化済みとマーク（PR #136 / #137 / #138 / #139 / #140）。実装差分メモ・残課題（実機検証 / CI shard 運用）を追記 |
| 2026-05-09 | motoshi.suzuki | Phase 2.3 を全消化済みとマーク（PR #142 / #143 / #144 / #145 / #146）。実装差分メモ（TeacherPanel/ContinueCard を audit から除外、page-has-heading-one を allow-list、aria-live 文言の caption 重複対応）と残課題（practice h1 / VoiceOver 実機検証）を追記 |
| 2026-05-12 | motoshi.suzuki | Phase 3.3 を全消化済みとマーク（PR #235 BFF / #236 Web）。ADR 0015 で suggestion アルゴリズムと閾値を明文化。§2.3 残課題のうち `practice` h1 と axe allow-list の解消、`--color-ink-muted` の darken を反映 |
| 2026-05-13 | motoshi.suzuki | §2.3 残課題 "on-cream AA 不足 3 パターン" を解消済みに更新（commit `a83baff` で全パターン処理済み・axe 違反ゼロを確認）。 |
| 2026-05-13 | motoshi.suzuki | Phase 3.4 / 4.2 / 4.4 を全消化済みとマーク（PR #238 / #239 / #243 / #241 / #242）。ADR 0016 / 0017 で browser telemetry / cross-browser scope を明文化。`compose.dev.yml` の `NODE_ENV=development` 副次修正、Docker `--network=host` 移行による secure-context 解消、result-scene の audio mask + 緩めた tolerance 等の実装メモを節内に追記 |
| 2026-05-14 | motoshi.suzuki | Phase 4.3 を A〜D のサブ PR に分解。4.3-A の `@next/bundle-analyzer` 導入 + baseline 計測を本ドキュメント §4.3 に転載（ADR 0018 と整合）。`/practice/[s]/[a]` 136 kB / Amiri arabic 204 KiB（両 weight 合算）が次手の優先ターゲットであることを明文化 |
