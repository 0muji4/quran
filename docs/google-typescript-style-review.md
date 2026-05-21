# Google TypeScript Style Guide — コードベースレビュー

実施日: 2026-05-21
対象: TypeScript / TSX コードベース全体（`apps/web` 214, `apps/bff` 47, `packages/ui` 16,
`packages/shared-ts` 13, `e2e` ほか — 計 314 ファイル）
基準: [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html)

## サマリ

コードベースは全体として Google Style Guide に **良好に適合** している。`var` ゼロ、namespace import
ゼロ、`require()` ゼロ、命名規約はほぼ完璧、`import type` も広く採用済み。

systematic な逸脱は **1 点のみ** で、オブジェクト型を `interface` ではなく `type X = {...}` で宣言していた
こと。本レビューに合わせてこれを自動修正し、再発を ESLint で検知できるようにした。

## ルール別 適合状況

| ルール | 状況 | 対応 |
| --- | --- | --- |
| `interface` vs `type`（オブジェクト型） | 逸脱: 約 99 箇所が `type X = {}` | **修正済み** — `interface` に変換 |
| `import type`（型のみ import） | おおむね適合 | enforce 追加 + 端数を autofix |
| `var` 不使用 | 適合（0 件） | `no-var` で固定 |
| `prefer-const` | 適合 | `prefer-const` で固定 |
| `===` / `!==` | 適合（`== null` のみ。Google 公認の例外） | `eqeqeq: smart` で固定 |
| 命名規約（UpperCamelCase / lowerCamelCase / CONSTANT_CASE） | 適合 | 変更なし |
| namespace import (`import * as`) | 適合（0 件） | 変更なし |
| `require()` | 適合（0 件） | 変更なし |
| `enum` | 適合（手書きコードに `enum` なし。リテラルユニオンを使用） | 変更なし |
| `any` | 限定的に使用（すべて文書化済み or 生成コード） | 受け入れ（下記参照） |
| non-null assertion (`!`) | テストコードに集中（66 件） | `no-non-null-assertion: warn` で可視化 |
| default export | Next.js / ツール必須のもののみ | 受け入れ（下記参照） |
| エラーハンドリング / 可視性修飾子 / JSDoc | 適合 | 変更なし |

## 実施した変更

1. **共有 ESLint 設定** (`packages/eslint-config/index.js`) に Google 準拠ルールを追加:
   - `@typescript-eslint/consistent-type-definitions: ['error', 'interface']`
   - `@typescript-eslint/consistent-type-imports`（`disallowTypeAnnotations: false` —
     `vi.importActual<typeof import('...')>` パターンを許容）
   - `@typescript-eslint/no-non-null-assertion: 'warn'`
   - `eqeqeq: ['error', 'smart']`、`no-var: 'error'`、`prefer-const: 'error'`
2. **`packages/shared-ts` を lint 対象に追加** — 従来 ESLint 未カバーだったため `eslint.config.js` を新設
   （生成ファイル `src/graphql/types.generated.ts` は ignore）し、`lint` script と devDependency を追加。
3. **`eslint --fix` を全 lint 対象パッケージに適用** — 77 ファイルでオブジェクト型 `type` → `interface`
   変換および `import type` の補正を実施。union / intersection / mapped type は `type` のまま維持。

検証: `pnpm -r lint`（0 error）、`pnpm -r typecheck`、`pnpm -r test`、`pnpm format:check` すべて green。

## 受け入れた逸脱（修正しない）

- **default export** — Next.js の page / layout / route handler、および Vitest / Playwright / codegen
  の設定ファイルはいずれもツール側が default export を要求する。変換不可。
- **生成コードの `any` / `enum` / `type`** — `packages/shared-ts/src/graphql/types.generated.ts` は
  GraphQL codegen の出力。手修正せず、lint 対象からも除外。
- **`== null`** — null と undefined の同時判定。Google Style Guide が明示的に許可する例外であり、
  `eqeqeq: smart` で適合扱い。
- **文書化済みの `any`** — OpenTelemetry SDK のバージョン不整合、GraphQL Helix、Express middleware の
  型ギャップに起因。いずれも `eslint-disable` コメントに理由が明記されている。

## フォローアップ推奨（本対応では未実施）

- **テストコードの non-null assertion**（`!`）— 66 件の warning が残る。大半は
  `apps/bff/src/graphql/__tests__/resolvers.test.ts` の生成リゾルバへの連鎖アクセス。optional chaining
  もしくは型ガードへの置換を別タスクで検討する。
- ~~**`e2e/` の lint 未カバー**~~ — 対応済み。root に `eslint.config.js` / `prettier.config.cjs` を追加し、
  `pnpm lint` が `lint:e2e`（`eslint e2e`）も実行するようにした。
- ~~**GraphQL codegen の `declarationKind`**~~ — 対応済み。`packages/shared-ts/codegen.ts` に
  `declarationKind: 'interface'` を設定し、GraphQL の object / input 型も `interface` で生成されるようにした。
  あわせて、不要かつ破損していた `documents` グロブを削除して codegen を復旧させた（再生成時に
  codegen v4 の出力フォーマットも取り込まれている）。
