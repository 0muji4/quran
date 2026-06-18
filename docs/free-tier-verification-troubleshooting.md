# 無料インフラへの dev デプロイによる Phase 5 動作確認

- 著者 / オーナー: motoshi.suzuki
- 関係者: なし（個人による技術検証）
- ステータス: 動作確認完了（2026-06-18）。Phase 6 worker 削除と flakiness 調査が未着手
- 関連: [ADR 0013 pluggable ASR backend](./adr/0013-pluggable-asr-backend.md)（本検証完了後に supersede 予定）、[[chirp-3-arabic-setup]]、[[worker-decommission-direction]]

## Summary

Python worker (faster-whisper) を廃止し、Go backend が Google Cloud Speech-to-Text v2 (Chirp 3) を同期呼び出しする新アーキテクチャを、$0/月 のクラウドサービス (GCP + Neon + Cloudflare R2 + Render) にデプロイし、Android 実機からスコア表示までを通す動作確認を 2026-06-18 に完了した。検証中に 11 件の PR を作って 8 件のバグを潰し、最終的に Al-Fatiha Ayah 1 の 3 秒録音で 0.4167 のスコアが Android UI に表示された。

主な意義は二つある。第一に、ADR 0013 が想定していた worker 内 pluggable ASR backend という方向が、Chirp 2 系 managed STT のレイテンシが 1–3 秒に収まる現状ではオーバースペックであると実機で確認できた。第二に、外部依存 (GCP / R2 / Render / Neon) を実際の dev デプロイで配線したことで、ローカル docker compose では再現できない、外部サービスとの結合で初めて顕在化するバグ (DB CHECK 制約 / Speech v2 の model × region × feature の制約 / Android の音声コーデック / Apollo client への認証未配線 / presigned URL の path 抽出ミス) を一度に洗い出せた。これらは本検証を経ずに本番投入していれば個別に踏んでいたはずの問題であり、本デプロイで先に発見できた。

> **注**: 本ドキュメントの PR 番号は [GitHub の Closed PR 一覧](https://github.com/0muji4/quran-project/pulls?q=is%3Apr+is%3Aclosed) を一次ソースとする。動作確認の Android 側ログは 2026-06-18 22:04:25 JST (`practice.scoring.completed.succeeded duration_ms=0`) を起点とし、BFF 側ログは Render Dashboard の `tilawah-dev-bff` サービスログを参照している。

## 1. 背景

本プロジェクトは、Quran 詠唱を録音し Arabic ASR で transcribe して reference text と alignment し発音スコアを返すクリティカルパスを Android / iOS から呼び出す構成で、ADR 0013 では ASR backend を worker プロセス内で pluggable に差し替え可能とする設計を採用していた。Python worker (faster-whisper) を Redis queue で非同期に呼び出し、結果をポーリングで返す async 経路である。

しかし、その後 Chirp 2 系 (および Arabic 対応の Chirp 3) のリリースで managed STT のレイテンシが 1–3 秒に収まることが分かり、Python worker を維持するコストと async 経路の複雑性 (Redis / polling / 中間状態管理 / worker scaling) に見合う利点が薄れた。Phase 5 で、backend が Go から直接 Chirp を同期呼び出しし scoring も Go 内で完結する方向への転換を決め、その動作確認を Render の free tier で行うことが本検証の目的である。

動作確認の達成基準は、Android 実機で録音し、アップロードして、Chirp で transcribe され、スコアが画面に出るまでが一度でも成功すること、の一点に絞った。安定性 (毎回成功する) は本検証のスコープ外として、flakiness は Phase 6 以降の課題に切り出した。これは、free tier の制約 (Render の cold start、Chirp 3 Preview の per-project quota) を含めた安定運用には別の信頼性目標が必要で、1 つの検証で両方を狙うと目的が分散するためである。

## 2. 構成

最終的に動いた構成は次の通り。

| サービス | 用途 | 月額 | 選定理由 |
|---|---|---|---|
| GCP Speech-to-Text v2 (`chirp_3`, `us` multi-region, `ar-SA`) | Arabic transcribe | $0 (60 min 無料枠) | Speech v2 の中で Arabic を扱える唯一のモデル。Chirp 2 は 16 言語のみで Arabic 非対応 |
| Neon Postgres 18 (Singapore) | DB | $0 (free tier) | Render と同リージョン、Postgres 18 が default で選べる |
| Cloudflare R2 (`tilawah-dev-uploads`) | 音声 / reference audio | $0 (<10 GB) | S3 互換、egress 無料、API token 単位の権限分離 |
| Render Web Service × 2 (Singapore) | backend (Go) + bff (Node) | $0 (free tier) | Docker deploy が無料、secret file mount あり、Singapore region が Neon と同一 |

GCP の予算アラートを $1 で設定して、Speech-to-Text の課金ミス (Preview 期間の rate 誤り等) で課金事故が起きても即座に気付ける状態にしている。

## 3. 原因分析と修正

11 件の PR のうち #429–#432 (4 件) は worker 廃止に先立つ Go 側への移植 (Arabic helpers / Chirp transcriber / pronunciation aggregator / storage adapter) で、それ自体は新規の不具合ではない。残り 7 件 (#433–#439) が動作確認中に発見した、外部サービスとの結合で初めて顕在化したバグである。原因の種類別に整理する。

### 3.1 DB CHECK 制約に弾かれた (#434)

PR #433 で同期スコアリングを実装した際、scoring_jobs.status を `QUEUED → PROCESSING → COMPLETED` の遷移として書いていた。ローカル unit test は status カラムへの string 書き込みを mock していたため気付かなかったが、本番デプロイで初回 INSERT が `scoring_jobs_status_check` CHECK 制約に弾かれた。

migration `20260102000000_scoring_job_state.up.sql` は status を `IN ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED')` に限定していて、worker 経路時代のステート名 (`RUNNING`) と新アーキテクチャでの中間状態名 (`PROCESSING`) が一致していなかった。

修正は status を `RUNNING` に揃えるだけで完了した (PR #434)。本質的な学びは、ステータス系カラムに新しい値を書く前に migration の CHECK 制約を grep するワークフローを習慣化することで、これは [[grep-migrations-for-constraints]] として記憶化している。CHECK 制約は app 層から見ると単なる string として扱われるため、Go の `type Status string` のような型エイリアスで書いていても type system では検出できず、DB に到達するまで気付けない点が落とし穴である。

### 3.2 Speech v2 / Chirp 3 の三層制約 (#436, #437)

本検証で最も時間を取られた区間。Speech v2 API には事前に気付きにくい制約が三つあり、それらが重なって失敗した。

**(1) Chirp 2 には Arabic がない。**
ADR 段階での事前リサーチでは「Chirp 2 = 多言語対応の最新モデル」という認識だったが、Google 公式の Chirp 2 言語一覧は 16 言語で `ar-*` を一つも含まない。Arabic は **Chirp 3 (Preview) のみ**で扱える。最初に `CHIRP_MODEL=chirp_2 + CHIRP_LANGUAGE_CODE=ar-XA` で実機を叩いた際の API レスポンスが ["The language \"ar-XA\" is not supported by the model \"chirp_2\""] で、ここで初めてリサーチ漏れに気付いた。

**(2) Chirp 3 は global endpoint にいない。**
Chirp 3 は `us` または `eu` の multi-region endpoint のみで提供される。Speech v2 Go SDK のデフォルトは `speech.googleapis.com` (global) を見るため、`option.WithEndpoint("us-speech.googleapis.com:443")` の明示が必要だった。これは `CHIRP_MODEL=chirp_3 + CHIRP_LOCATION=us` を設定しても、コード側で global endpoint に gRPC channel を張っていると ["The model \"chirp_3\" does not exist in the location named \"global\""] で失敗する。

**(3) Chirp 3 は word-level feature を拒否する。**
`RecognitionFeatures.EnableWordTimeOffsets` と `EnableWordConfidence` を request config に入れると ["Recognizer does not support feature: word_level_confidence"] が返る。Chirp 3 は utterance-level の transcript しか返さない設計で、word-level 出力は (現時点で) 機能として存在しない。

修正は PR #436 (regional endpoint への routing) と PR #437 (`featuresForModel(model)` で chirp_3 系のときだけ空 `RecognitionFeatures` を送る) の二段に分けた。理由別に分けることで、将来 Chirp 4 が出て feature が戻ってきても #437 だけ revert すれば済む。

この三層の制約は公式ドキュメントを読むだけでは表面化せず、実機を叩いて初めて分かった。教訓として、新規 managed API を採用するときの想定リサーチコストは公式ドキュメント読了だけでは不十分で、対象モデル × region × feature の組合せで sample request を実際に投げるところまでを技術選定フェーズに含めるべきである。これを [[chirp-3-arabic-setup]] として記憶化した。

副作用として、Chirp 3 が word_confidence を返さないため、`scoring.go` の fluency 成分は常に 0 で固定になる。これは ADR 0013 の前提 (faster-whisper の word probability を使った fluency 計算) を満たさなくなる変更であり、本来は ADR 0013 と並べて設計判断として明示すべき点だった。Chirp 4 で word_confidence が返るようになった時点で再検討する。

### 3.3 Android が presigned URL から uploadKey を誤抽出 (#439)

`ApolloQuranBackend.derivedUploadKey()` が `substringAfterLast('/')` でファイル名末尾だけを取っていた。R2 上のキーは `uploads/<timestamp>-<filename>` で slash を含むが、Android は `<filename>` だけを `createScoringJob` mutation に送るため、BFF の `findSessionIdForUploadKey` が `user_data_objects.audio_key` でヒットせず、500 "Session ID not found for upload key" が 154 ms で返る。

ローカル開発 (MinIO + bucket 直下の flat key) では再現せず、R2 にデプロイして `MINIO_UPLOAD_PREFIX=uploads/` を入れた瞬間に初めて顕在化した。curl で BFF を直接叩いて bucket prefix 付きの key で `createScoringJob` を実行すると成功するため、Android の path 抽出が単独で壊れていることが切り分けられた。

修正は path から先頭 1 セグメント (bucket 名) のみ落とし、その先 (`uploads/...`) を保持する形に変更した (PR #439)。Apollo wrapper が原因例外を `BackendUnavailable(cause=null)` に丸めるため、Android 側ログだけでは何が起きているか分からず、BFF の HTTP request log (`status=500 path=/graphql duration_ms=154`) と curl の手動再現の組合せで切り分ける必要があった。例外ラッパーで `cause` を握り潰している箇所は、根本原因切り分けのコストを大幅に上げるので、将来的な改善対象である。

### 3.4 Android Apollo client に Bearer を載せていなかった (#435)

Android の REST 経路は `DefaultAuthedHttpClient` で `Authorization: Bearer …` を付けていたが、`ApolloQuranBackend.defaultApolloClient()` は `ApolloClient.Builder()` の素通しで auth interceptor が無かった。サインインは成立しているのに GraphQL mutation だけ anonymous で BFF に届き、`recordUploadKey` resolver が `user_data_objects.user_id NOT NULL` 制約に弾かれて 500 を返す状態だった。

Apollo Kotlin v4 は HTTP interceptor を `addHttpInterceptor` でビルダーに追加する API を持つので、`BearerAuthInterceptor` を実装して `AuthSession` から token を引き、`Authorization` ヘッダを追加し、401 を受けたら `TokenRefresher` を 1 回だけ起動する形にした (PR #435)。これは REST 側の retry policy と同じ手順である。`TokenRefresher` を `AppRoot` で持ち上げて REST と Apollo で同じインスタンスを共有することで、REST と Apollo が同時に 401 を受けても token 更新は 1 回しか走らないようにした。

これは、Android 側に GraphQL 経路を導入した時点で REST 側と同じ auth 配線を Apollo 側にも追加すべきだったという、設計時の抜け漏れに分類される。技術的には新規バグではない。

### 3.5 Android のオーディオ形式が Speech v2 で読めなかった (#438)

`MediaRecorder` のデフォルトに従って `OutputFormat.MPEG_4` + `AudioEncoder.AAC` (.m4a) で録音していたが、Speech v2 `AutoDetectDecodingConfig` は AAC をサポート対象外としていた (LINEAR16 / FLAC / MP3 / OGG_OPUS / AMR / AMR_WB のみ)。アップロード自体は R2 に成功するが、Chirp に渡した瞬間に ["Audio data does not appear to be in a supported encoding"] で失敗する。

修正は `MediaRecorderRecorder.kt` で `OutputFormat.OGG` + `AudioEncoder.OPUS` に変更し、拡張子 `.ogg`、Content-Type `audio/ogg`、bitrate 64 kbps、sample rate 48 kHz とした (PR #438)。OPUS-in-OGG via `MediaRecorder` は **API 29+** が必要で、本検証の実機は API 29+ だったが、Android 8 系 (API 26–28) で動かしたい場合は LINEAR16 PCM への fallback を別途実装する必要がある。

これも、Speech v2 がサポートする encoding の一覧を選定フェーズで確認していなかったという、選定漏れに起因する。iOS 側は AAC ではなく LINEAR16 で直接送る経路を別に持っていたため、Android 単独で顕在化した。

### 3.6 BFF の MINIO_EXTERNAL_ENDPOINT に scheme を付けてしまった (設定ミス、コード変更なし)

`MINIO_EXTERNAL_ENDPOINT=https://...r2.cloudflarestorage.com` のように scheme 付きで env var を設定すると、`apps/bff/src/infra/storage.ts` の `endpoint.split(':')[0]` がスキーマ部分 (`https`) をホスト名にする。presigned URL 生成が即失敗し、Android は `getSignedUploadUrl` の data null として `BackendUnavailable` を受け取る。

修正は env var を host:port のみで設定 (`<account>.r2.cloudflarestorage.com`) し、HTTPS は `MINIO_SECURE=true` 側で表現するだけ。コード側は変更なし、設定ドキュメントの不備として処理した。

これは minio-go の URL parsing の癖を知らないと再発するので、[[minio-endpoint-host-only]] として記憶化している。

## 4. 意思決定の経緯

技術選定で迷った主な分岐を二つ記録する。

**Render Free tier を選んだ判断。** 候補は Render / Fly.io / Railway / Cloudflare Workers の 4 つだった。本検証の主目的は Go backend と Node BFF を同時にホストして外部 (GCP / R2) との配線を確かめることで、Cloudflare Workers は Go ランタイムを sandbox で動かせず除外、Fly.io は無料枠が 256MB で Go の cold start に必要なメモリが取れず除外、Railway は無料枠が 30 日のクレジット制で継続検証に不向きと除外し、Render の Web Service Free tier (512MB / 750 時間/月 / Singapore region) を採用した。15 分アイドルで sleep する制約はあるが、本検証は一度でも動くことが達成基準なので許容範囲とした。

**Chirp 3 vs Cloudflare Workers AI Whisper の比較。** 当初 Cloudflare Workers AI の Whisper も候補だったが、(a) Workers AI は Arabic を正式サポート言語に含めるが Quran 詠唱のような coranic Arabic の精度実績が見えなかった、(b) GCP STT は Phase 6 以降にプロダクション投入する想定だったため、検証もプロダクション同等の経路で行うべきだった、という二点で Chirp 3 を採用した。

無料枠の差 (Workers AI は無料枠が広く、Chirp 3 は 60 分/月) は本検証では問題にならず、コスト面ではどちらでも $0 を維持できた。

## 5. 実装・移行

PR 単位の時系列は次の通り。

| # | PR | 内容 | 区分 |
|---|---|---|---|
| 1 | [#429](https://github.com/0muji4/quran-project/pull/429) | `apps/backend/internal/arabic`: normalize / WER / alignment を Python から Go に移植 | scoring port |
| 2 | [#430](https://github.com/0muji4/quran-project/pull/430) | `apps/backend/internal/transcribe`: Chirp 2 transcriber 実装 | transcribe |
| 3 | [#431](https://github.com/0muji4/quran-project/pull/431) | `arabic.ScorePronunciation`: accuracy / fluency / completeness / overall の集約 | scoring port |
| 4 | [#432](https://github.com/0muji4/quran-project/pull/432) | `apps/backend/internal/storage`: minio-go ベースの S3 互換 adapter | storage |
| 5 | [#433](https://github.com/0muji4/quran-project/pull/433) | `handleCreateScoringJob` を同期化、worker 経路の Redis enqueue を廃止 | sync handler |
| 6 | [#434](https://github.com/0muji4/quran-project/pull/434) | `PROCESSING` → `RUNNING`: scoring_jobs CHECK 制約に対応 | bug fix |
| 7 | [#435](https://github.com/0muji4/quran-project/pull/435) | Android: `BearerAuthInterceptor` を Apollo に配線 | bug fix |
| 8 | [#436](https://github.com/0muji4/quran-project/pull/436) | Speech v2 client を `<region>-speech.googleapis.com` に routing | bug fix |
| 9 | [#437](https://github.com/0muji4/quran-project/pull/437) | `featuresForModel`: chirp_3 系では word-level feature を送らない | bug fix |
| 10 | [#438](https://github.com/0muji4/quran-project/pull/438) | Android: MPEG_4/AAC から OGG/OPUS に録音形式を切り替え | bug fix |
| 11 | [#439](https://github.com/0muji4/quran-project/pull/439) | Android: `derivedUploadKey` で bucket セグメントのみ落として prefix を保持 | bug fix |

PR #439 マージ後の APK で 2026-06-18 22:04:25 JST に `practice.scoring.completed.succeeded duration_ms=0` を Android 側で観測し、同タイミングで BFF (Render) が `POST /graphql duration_ms=2627 status=200` を返したことを確認して動作確認達成と判定した。BFF ログには `Creating scoring job sessionId=d664c2cc-... referenceAudioKey=reference-audio/001001.mp3` が見え、score は 0.4167 だった。

## 6. 残課題

動作確認は 1 回の成功で達成基準を満たしているが、安定性は別問題として明示的に切り出している。

### 6.1 採点 mutation の flakiness

同じ手順を続けて 2 回打つと、1 回目は 2.6 秒で 200 が返るが、2 回目は BFF → backend 間で 60 秒以上 hang し、Android (OkHttp デフォルト 60 秒) が `backend_unavailable` で諦める。BFF logs は `Creating scoring job` で止まり、completion log が現れない。

候補原因:

| 仮説 | 観察と整合性 |
|---|---|
| Render Free tier の service-to-service connection が再利用時に詰まる | 1 回目 OK / 2 回目 NG という再現性。free tier の HTTP/2 connection pooling の挙動と整合 |
| Chirp 3 Preview の per-project rate limit | 短時間連投で stall する挙動と整合。ただし quota 通知は出ていない |
| Backend 側の gRPC client connection が cold になる | 2 回目に再 handshake → cold start 込みで 60 秒超 |
| BFF の `fetchWithTracing` に timeout がない | hang を上位に通知できない (副次的悪化要因) |

最低限の対応として、BFF の `apps/bff/src/infra/backendClient.ts` の `fetchWithTracing` に `AbortSignal.timeout(30_000)` を入れれば、hang は 30 秒で諦めて Android に伝わるので "Server unavailable" は 60 秒待たずに出る。これは現在の症状を可視化する応急処置だが、根本原因 (なぜ 2 回目 hang するか) の切り分けには到達しない。Phase 6 以降で paid tier への切替 / Chirp 3 quota の実測 / gRPC keepalive 設定を含めて調査する。

### 6.2 残務 PR

- **BFF OTEL を無効化**: `OTEL_SDK_DISABLED=true` を Render env に追加。現在 OTEL collector が dev デプロイには存在しないため、5 秒ごとに `ECONNREFUSED ::1:4318` のスタックトレースを吐いており、本物のエラーが埋もれる。
- **ローカル / CI の Postgres を 18 に揃える**: Neon が 18 で動いているのに対し、`ops/docker/compose.dev.yml` と `.github/workflows/test.yml` は 16。バージョン差で issue が出たときの切り分けが面倒。
- **Phase 6 cleanup**: `apps/worker/` / `apps/backend/internal/enqueue/` / docker compose の `worker` `redis` を削除。本検証で sync 経路が動いたので async 経路は不要になり、ADR 0013 を正式に supersede する PR と合わせて行う。
- **Android `BackendUnavailable(cause=null)` の改善**: `ApolloQuranBackend.wrap` が原因例外を `cause` に保持しているが、ViewModel / Telemetry までは伝わっていない。3.3 の切り分けで根本原因の特定に余計な往復が発生したため、`telemetry.error` から cause stack を取れるようにする。

## 7. 学び

本検証から得られた、本ケースに閉じない原則を 3 つ記録する。

**(1) Managed API の選定では公式ドキュメントを読むだけでは不十分で、対象モデル × region × feature の組合せで sample request を実際に投げる工程まで含めるべき。** Chirp 3 / Arabic / regional endpoint / word-level feature は、それぞれ単独でドキュメントに記載されているが、組合せた瞬間に三層の制約が重なって動かないことは事前に分からなかった。実機での sample request を技術選定フェーズに含めるかどうかは、想定する組合せに対応する公式 sample コードが存在するかで判断する。今回は Chirp 3 + Arabic + multi-region + chirp_3 features の組合せに該当する公式 sample コードが無かったため、デプロイ後に一つずつ問題を発見することになった。

**(2) CHECK 制約 / NOT NULL 制約 / FK 制約のような DB レベルの不変条件は、app 層の type system では検出できず、DB に到達するまで気付けない。** ステータス系の text カラムへ SQL を書く前に migration の制約を grep するワークフローを習慣化する。同様に、`user_data_objects.user_id NOT NULL` のような単純な NOT NULL も、app 層で `Option<UserId>` を保持しているコードからは抜け落ちる可能性がある。インテグレーションテスト (testcontainers) を CI で走らせれば検出できるが、本検証時点では unit test に DB は刺さっていなかった (これは Phase 6 以降の改善対象)。

**(3) 例外ラッパーで cause を握り潰すと、根本原因切り分けのコストが大幅に上がる。** Android の `ApolloQuranBackend.wrap` が `ApolloException` を `BackendUnavailable(operation, cause)` にラップしているが、`cause` は telemetry には伝わらず、画面に出るのも "Server unavailable" だけになる。今回は BFF / backend のログを横断して切り分けたが、複数の修正で各 5–15 分ずつ余計に時間を消費した。例外を境界で抽象的にまとめるのは ViewModels から transport 型を隔離する目的では正当だが、`cause` のスタックは telemetry / structured logs に必ず流す形にする。これは Android 側に閉じた話ではなく、iOS の `ApolloBackend` も同じ構造を持っているので、両プラットフォーム同時に直す価値がある。

特に (1) は、本プロジェクトが今後 ML/AI 系 managed service (Chirp 4 / GenAI / Vertex AI 等) に依存を増やすことを考えると、再発リスクが高い。採用検討時の sample request を必須項目として ADR テンプレートに組み込んでおくことを次の改善として記録する。

## Appendix A: 再現手順 (再 verify するとき用)

### A.1 GCP

- Project: `tilawah-499807` (display name `tilawah-dev`)。プロジェクト ID は **immutable**。
- Service Account: `tilawah-dev-backend@tilawah-499807.iam.gserviceaccount.com` に `Cloud Speech Client` ロール。JSON 鍵を Render の Secret File `gcp-sa.json` で配布。
- 予算アラート: `$1` (verify-safety-cap)。

### A.2 Neon

- Project: `tilawah-dev`。
- Region: AWS Asia Pacific (Singapore)。Tokyo は free tier 提供なし。
- Postgres 18 (default)。
- 初期化: `db/migrations/*.up.sql` を順に流し、`db/seed_quran.sql` を投入 (6,236 ayahs)。

### A.3 Cloudflare R2

- Bucket: `tilawah-dev-uploads` (APAC)。
- API token: Account API Token (Object Read & Write、bucket scope)。
- CORS:

  ```json
  [{
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }]
  ```

### A.4 Render Web Service (backend)

- Name: `tilawah-dev-backend` / Singapore / Free / Docker。
- Root Directory: 空 / Dockerfile Path: `apps/backend/Dockerfile`。
- Health Check: `/healthz`。
- Secret Files: `gcp-sa.json` (内容は GCP JSON 鍵そのまま)。
- Env vars:

  ```
  DATABASE_URL=postgresql://...neon.tech/...?sslmode=require
  CHIRP_PROJECT=tilawah-499807
  CHIRP_MODEL=chirp_3
  CHIRP_LOCATION=us
  CHIRP_LANGUAGE_CODE=ar-SA
  GOOGLE_APPLICATION_CREDENTIALS=/etc/secrets/gcp-sa.json
  OBJECT_STORE_ENDPOINT=<account-id>.r2.cloudflarestorage.com
  OBJECT_STORE_ACCESS_KEY=...
  OBJECT_STORE_SECRET_KEY=...
  OBJECT_STORE_USE_SSL=true
  OBJECT_STORE_BUCKET=tilawah-dev-uploads
  OBJECT_STORE_REGION=auto
  ```

### A.5 Render Web Service (BFF)

- Name: `tilawah-dev-bff` / Singapore / Free / Docker。
- Root Directory: 空 / Dockerfile Path: `apps/bff/Dockerfile`。
- Health Check: `/healthz`。
- Env vars:

  ```
  DATABASE_URL=<same as backend>
  BACKEND_URL=https://tilawah-dev-backend.onrender.com
  MINIO_ENDPOINT=<account-id>.r2.cloudflarestorage.com
  MINIO_ACCESS_KEY=<same as backend>
  MINIO_SECRET_KEY=<same as backend>
  MINIO_BUCKET=tilawah-dev-uploads
  MINIO_SECURE=true
  MINIO_EXTERNAL_ENDPOINT=<account-id>.r2.cloudflarestorage.com  ← scheme なし
  MINIO_UPLOAD_PREFIX=uploads/
  JWT_SECRET=<openssl rand -hex 32>
  REFRESH_TOKEN_SECRET=<openssl rand -hex 32>
  NODE_ENV=production
  ```

### A.6 Android

```bash
cd /Users/.../quran-project
./gradlew :apps:android:clean
./gradlew :apps:android:installDebug \
  -PBFF_BASE_URL=https://tilawah-dev-bff.onrender.com
adb shell am start -n com.tilawah.android/.MainActivity
```

サインアップ → Al-Fatiha → Ayah 1 → 録音 (~3–5 秒) → 待つ (~3 秒、cold start 時 +30 秒) → 画面にスコア。
