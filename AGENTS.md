# AGENTS.md

本リポジトリで作業するすべてのコーディングエージェント（Claude Code / Codex ほか）共通の指示です。
このファイルが唯一の正本です。

**目的**: Claude Code と Codex で共用できる、公式準拠のリポジトリ雛形そのものを作ること。
このリポジトリを雛形として使い始めたら、この行を実際のプロジェクトの目的に書き換えてください。

## 応答と作業の進め方

- **既存資産の活用を最初に検討する。コードを書くのは最終手段。** 順に、このリポジトリの既存コード →
  過去の実装と成功・失敗の記録 → GitHub や公式ドキュメントで公開されている OSS → 新規実装
- **迎合しない。** 同意できない点は率直に述べる。相手の指摘が正しければその場で認めて直す
- **確度の低い情報には `[曖昧]` を付ける。** 未検証の推測、原文で確認していない仕様、環境によって
  変わる値が対象
- **作業報告は「何をどうしたか」だけ書く。** 経緯・背景・検討過程は聞かれるまで書かない

## セッション間の引継ぎ

@docs/handoff.md

作業を始める前に必ず読んでください。**Codex はこの import を展開しません。自分でファイルを開いて読んでください。**

- 作業開始（チェックイン）: `/checkin`
- 作業の区切り: `/handoff`
- 作業終了（チェックアウト）: `/checkout` — **引継ぎ文**は必ず `main` へマージする。
  実際のコード変更は、未完了なら push 済みの branch/worktree に残したままでよい

## 根拠の記録

`AGENTS.md` と `.claude/settings.json` を変更する前に、**`docs/decisions.md` を読んでください。**
変更したら該当行も更新します。記入の作法は `docs/decisions.md` 冒頭の凡例に従ってください。

## 前提環境

Node 22 / pnpm / TypeScript 5 / ESM。**npm と yarn は使わないでください。**
`.npmrc` の `engine-strict=true` により、条件を満たさない環境では `pnpm install` が失敗します。

## コマンド

```bash
pnpm install
pnpm run check    # format:check + typecheck + test。コミット前に必ず通す
pnpm run test     # Vitest（監視は test:watch）
pnpm run build    # tsc で dist/ に出力
pnpm run format   # Prettier で整形
```

## コーディング規約

- **型**: `strict` 前提。`any` は使わない
- **命名**: 変数・関数は `camelCase`、型・クラスは `PascalCase`、定数は `UPPER_SNAKE_CASE`、ファイル名は `kebab-case.ts`
- **フォーマット**: Prettier に一任し、手で整形し直さない。正本は `.prettierrc.json` と `.editorconfig`
- **コメント**: 「何をしているか」ではなく「なぜそうしたか」を書く

## Git 運用

- ブランチ名: `feat/*` `fix/*` `chore/*` `docs/*` `ci/*`
- コミットメッセージ: Conventional Commits（`feat:` `fix:` `chore:` `docs:` `ci:`）
- **PR を出す前に `pnpm run check` と `pnpm run build` を通す**
- `main` への直接 push は禁止（Ruleset で強制済み）

## テストで見つけた問題への対処

テスト・レビュー・手動確認で不具合や懸念点を見つけたら、`docs/test-policy.md` の
重大度ゲート手順に従ってください。`pnpm run check`／`pnpm run build` とは別に必要な手順です。

## やってはいけないこと

- **`git push --force` と履歴の書き換え**（Ruleset でも禁止済み）
- **`.env` と鍵ファイル（`*.pem` `*.key`）の読み書き**。新しい環境変数は `.env.example` にキー名だけを追加する
- **`pnpm-lock.yaml` の手編集**。`pnpm` コマンドで再生成する
- **`dist/` の編集**。ビルド生成物なので `src/` を直す
- **CI のジョブ名 `check` の改名**。Ruleset の必須チェックが外れて PR がマージ不能になる

## 落とし穴

- **ESM のため、相対 import には拡張子 `.js` を付ける**（`./foo.ts` ではなく `./foo.js`）
- **`CLAUDE.md` に「AGENTS.md に従うこと」と文章で書いても機能しない。** `@` から始まるパス記法だけが読み込みを発生させる
- **`Explore` と `Plan` のサブエージェントは `CLAUDE.md`（＝このファイル）を読まない。** この2つに守らせたい制約は、委譲するときのプロンプトに書き直すこと
- **worktree に入ってもフックの `${CLAUDE_PROJECT_DIR}` はメインのチェックアウトを指したまま。** worktree 側のパスが必要なフックは、標準入力 JSON の `cwd` フィールドを読む

## 指示ファイルの構成

指示を追加・変更するときは、このファイルを編集してください。`CLAUDE.md` に書いてよいのは Claude Code 固有の内容だけです。
個人設定は `.claude/settings.local.json` と `CLAUDE.local.md`（いずれも gitignore 済み）へ。チーム共有の設定は `.claude/settings.json` にあります。
