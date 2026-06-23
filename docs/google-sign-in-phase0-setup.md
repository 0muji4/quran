# Google サインイン Phase 0: GCP / 環境変数セットアップ手順

- 著者 / オーナー: motoshi.suzuki
- 関係者: なし（個人による設定作業）
- ステータス: 未実施（実装は `feat/google-sign-in-web` で完了済み、本手順で有効化する）
- 関連: [PRD](./dd/google-sign-in-web-1-prd.md) / [DD](./dd/google-sign-in-web-2-dd.md) の Phase 0、既存インフラは [free-tier 動作確認](./free-tier-verification-troubleshooting.md) Appendix A

## Summary

Web 版 Google サインイン（GIS の ID トークン方式）を有効化するために必要な GCP 操作と環境変数を、既存の dev 構成（GCP プロジェクト `tilawah-499807`、Render `tilawah-dev-bff`）に合わせて具体化する。作るものは **Web アプリ用の OAuth クライアント ID を 1 つ**だけで、Client Secret もリダイレクト URI も使わない。発行した同一の Client ID を BFF（`aud` 検証用）と Web（GIS 初期化用）の 2 つの環境変数に入れる。

実装は env が未設定でも安全に無効ボタンへフォールバックするため、本手順を実施するまで既存の email/password 認証は影響を受けない。

## 1. GCP: dev は既存プロジェクト、prod は別プロジェクト

dev では、ASR で使っている既存プロジェクトを再利用する。

- Project: `tilawah-499807`（display name `tilawah-dev`、プロジェクト ID は immutable）
- Console: <https://console.cloud.google.com/> 上部のプロジェクト選択で `tilawah-dev` を選ぶ

本番は**別プロジェクト**（例 `tilawah-prod`）を新規に作り、本手順を同様に実施する。理由は、同意画面の公開ステータス（Testing / Published）が**プロジェクト単位**だからである。dev を Testing（Test users 限定）に保ったまま prod を Published にする、を同一プロジェクトでは両立できない。Client ID も環境ごとに別になり、env（第 4 章）の値が dev/prod で分かれる。コード変更は不要。

Google サインイン（`openid` / `email` / `profile`）は無料で、Speech-to-Text のような従量課金もない。既存の `$1` 予算アラートはそのままで支障ない。

## 2. OAuth 同意画面（consent screen）

「APIs & Services」→「OAuth consent screen」（新 UI では「Google Auth Platform」→「Branding」「Audience」）。

| 項目                                   | 設定値                                                                                                      |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| User Type                              | External                                                                                                    |
| App name                               | Tilawah（同意画面でユーザーに見える名前。製品名そのまま、環境サフィックスは付けない。dev/prod 共通）        |
| User support email / Developer contact | 自分のメール                                                                                                |
| Scopes                                 | 追加不要（`openid` / `email` / `profile` が既定。ID トークンに `email` / `email_verified` / `name` が入る） |
| Publishing status                      | 動作確認の間は `Testing`。下記の Test users に自分の Google アカウントを追加                                |

`Testing` の間は Test users に登録したアカウントしかサインインできない。全ユーザーに開く段になったら「PUBLISH APP」で公開する。`email` / `profile` / `openid` は非機微スコープなので Google の審査（verification）は不要で、公開操作だけで足りる。

## 3. OAuth クライアント ID を作成（本体）

「APIs & Services」→「Credentials」→「＋ CREATE CREDENTIALS」→「OAuth client ID」。

| 項目                          | 設定値                                                                                                                                    |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Application type              | Web application                                                                                                                           |
| Name                          | Tilawah Web（コンソール内の内部ラベルのみ。ユーザーには見えない。同一プロジェクトの他クライアントと区別するための名前）                   |
| Authorized JavaScript origins | `http://localhost:3000`（ローカル dev）と `https://tilawah-dev-web.onrender.com`（Render dev。サービス名は実際の作成時に合わせる）の 2 つ |
| Authorized redirect URIs      | 空（ID トークン方式では不要）                                                                                                             |

「CREATE」後に表示される **Client ID**（`xxxxxxxx.apps.googleusercontent.com`）をコピーする。Client Secret も発行されるが本方式では使わない。

> オリジンはスキーム＋ホスト＋ポートで、パスや末尾スラッシュは付けない。独自ドメインを後で当てる場合は、そのオリジン（例 `https://app.tilawah.example`）も追記する。

## 4. 環境変数を設定

発行した Client ID を**同じ値**で 2 か所に入れる。

### 4.1 BFF（`aud` 検証用）

`tilawah-dev-bff`（Render Web Service、[free-tier doc](./free-tier-verification-troubleshooting.md) A.5）の Env vars に 1 行追加する。

```
GOOGLE_OAUTH_CLIENT_ID=xxxxxxxx.apps.googleusercontent.com
```

ローカルは BFF を Docker、Web を CLI で動かす構成を推奨する。BFF は Docker なら DB・minio・backend がまとまり env 追加 1 行で済む。Web は `NEXT_PUBLIC_` がビルド時に焼き込まれ Docker だと build-arg 配線が要るため、CLI（`.env.local` が即反映）が楽。`compose.dev.yml` の `bff.environment` は `GOOGLE_OAUTH_CLIENT_ID: ${GOOGLE_OAUTH_CLIENT_ID:-}` を読むので、値は shell の `export GOOGLE_OAUTH_CLIENT_ID=...` か untracked な `ops/docker/.env` で渡す。

```bash
export GOOGLE_OAUTH_CLIENT_ID=xxxxxxxx.apps.googleusercontent.com
docker compose -f ops/docker/compose.dev.yml up postgres minio backend bff
```

Docker を使わず BFF を CLI で動かす場合は `apps/bff/.env`（git ignore 済み、新規作成）に同じ行を足し、`.env` を読む `pnpm --filter @quran-project/bff dev:local` で起動する（`pnpm dev` は `.env` を読まない）。ただし `DATABASE_URL` など他の dev 用 env も自前で揃える必要がある。

### 4.2 Web（GIS 初期化用）

`NEXT_PUBLIC_` プレフィックスはブラウザに渡すために必須。同じ値を 2 か所に設定する。

```
NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID=xxxxxxxx.apps.googleusercontent.com
```

- ローカル dev: `apps/web/.env.local`
- Render dev: `tilawah-dev-web` の Env vars（具体設定は第 6 章）。`NEXT_PUBLIC_` 変数は **ビルド時にバンドルへ焼き込まれる**ため、値を変えたら再デプロイ（再ビルド）が必要

> Render では BFF を同一プロジェクト内のサービスとして呼べる。Web の `BFF_BASE_URL` は `https://tilawah-dev-bff.onrender.com` を指す（Android の `BFF_BASE_URL` と同じ向き先）。

## 5. 動作確認

1. BFF と Web を再起動（env を読み直すため）
2. `http://localhost:3000` の `/sign-in` または `/sign-up` を開く。無効プレースホルダだった枠が GIS の公式ボタンに変わっていること
3. Test users に登録した Google アカウントでサインイン → 認証済みでリダイレクトされること
4. BFF ログに `auth.google.signup`（初回）または `auth.google.login`（2 回目以降）が出ること

## 6. Render に Web をデプロイする

backend / bff と同じく Render の Web Service（Docker）として Web を立てる。

### 6.1 サービス設定

| 項目              | 値                                                               |
| ----------------- | ---------------------------------------------------------------- |
| Name              | `tilawah-dev-web`                                                |
| Region / Plan     | Singapore / Free（backend・bff と同じ）                          |
| Runtime           | Docker、Dockerfile Path `apps/web/Dockerfile`、Root Directory 空 |
| Health Check Path | `/healthz`                                                       |

### 6.2 環境変数

| 変数                                 | 種別         | 値                                                  |
| ------------------------------------ | ------------ | --------------------------------------------------- |
| `NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID` | **ビルド時** | Client ID（BFF の `GOOGLE_OAUTH_CLIENT_ID` と同値） |
| `BFF_BASE_URL`                       | ランタイム   | `https://tilawah-dev-bff.onrender.com`              |
| `PORT`                               | ランタイム   | `3000`（Dockerfile / health check と揃える）        |

`NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID` はビルド時に client バンドルへ焼き込まれる。`apps/web/Dockerfile` に `ARG NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID` があり、Render は service の env を build arg として渡すため、env 設定だけで焼き込まれる。**値を変えたら再デプロイ（再ビルド）が必須**。

### 6.3 GCP 側

Render Web のオリジン `https://tilawah-dev-web.onrender.com` を、OAuth クライアントの **Authorized JavaScript origins に追加**する（未登録だとブラウザの GIS 呼び出しが弾かれる）。

## Appendix: つまずきポイント

| 症状                                                      | 原因                                                                                                                         | 対処                                                                                                                                                                              |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ボタンが無効のまま                                        | Web に `NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID` が無い、または再起動していない                                                   | 4.2 を設定して Web を再起動                                                                                                                                                       |
| `redirect_uri_mismatch` / ポップアップが無反応            | アクセス中のオリジンが Authorized JavaScript origins と不一致（`localhost` vs `127.0.0.1`、ポート違い、`http`/`https` 違い） | 開いている URL のオリジンを正確に登録                                                                                                                                             |
| サインインできるのは自分だけ                              | 同意画面が `Testing`                                                                                                         | Test users に追加、または PUBLISH                                                                                                                                                 |
| BFF が 503 `Google sign-in is not configured`             | BFF に `GOOGLE_OAUTH_CLIENT_ID` が無い                                                                                       | 4.1 を設定して BFF を再起動                                                                                                                                                       |
| Web が `Unexpected token '<' ... is not valid JSON`       | Docker の bff が旧イメージで `/auth/google` が無く、Express が 404 HTML を返している                                         | `docker compose ... up -d --build bff` で再ビルド（`build:` はソース変更を自動再ビルドしない）                                                                                    |
| 502 `Failed to sign in with Google`（BFF ログに `42P01`） | `oauth_identities` テーブルが未作成（新マイグレーション未適用）                                                              | `make db-migrate` で適用する                                                                                                                                                      |
| BFF が 401 `invalid Google credential`                    | Web と BFF の Client ID が不一致（`aud` 検証に失敗）                                                                         | 両 env を同一の Client ID に揃える                                                                                                                                                |
| 本番で Client ID 変更が効かない                           | `NEXT_PUBLIC_` はビルド時に焼き込まれる                                                                                      | Render の Web サービスを再デプロイ（再ビルド）                                                                                                                                    |
| 本番で GIS スクリプト/ポップアップがブロックされる        | 将来 CSP を入れた場合のみ                                                                                                    | `script-src https://accounts.google.com/gsi/client`、`frame-src https://accounts.google.com`、`connect-src https://accounts.google.com` を許可（現状 CSP は未設定なので対応不要） |
