# AGENTS.md

本リポジトリで作業するすべてのコーディングエージェント（Claude Code / Codex ほか）共通の指示です。
このファイルが唯一の正本で、ツール固有ファイルはここへのポインタに徹します。

**目的**: Claude Code と Codex で共用できる、公式準拠のリポジトリ雛形そのものを作ること。
このリポジトリを雛形として使い始めたら、この行を実際のプロジェクトの目的に書き換えてください。

## 前提環境

Node 22 / pnpm / TypeScript 5 / ESM。**npm と yarn は使わないでください。**

バージョンの正本は `package.json` の `engines` と `packageManager` です。`.npmrc` の
`engine-strict=true` により、条件を満たさない環境では `pnpm install` が失敗します。

## コマンド

```bash
pnpm install
pnpm run check    # format:check + typecheck + test。コミット前に必ず通す
pnpm run test     # Vitest（監視は test:watch）
pnpm run build    # tsc で dist/ に出力
pnpm run format   # Prettier で整形
```

## ディレクトリと主要ファイル

```
AGENTS.md              全エージェント共通の指示（このファイル・正本）
CLAUDE.md              @AGENTS.md の import のみ。中身は書かない
.claude/settings.json  Claude Code の権限設定（チーム共有）
.github/workflows/     CI。ジョブ名 check は Ruleset の必須チェック名と一致する
src/                   アプリケーションコードとテスト（*.test.ts）
tsconfig.json          型チェック用。テストを含む全ファイルが対象
tsconfig.build.json    ビルド用。テストを除外する
```

`tsconfig` を2つに分けているのは、テストを型検査の対象に含めつつ `dist/` には出力しないためです。

## コーディング規約

- **型**: `strict` 前提。`any` は使わない。やむを得ない場合は理由をコメントで残す
- **命名**: 変数・関数は `camelCase`、型・クラスは `PascalCase`、定数は `UPPER_SNAKE_CASE`、ファイル名は `kebab-case.ts`
- **フォーマット**: Prettier に一任し、手で整形し直さない。設定値の正本は `.prettierrc.json` と
  `.editorconfig` であり、このファイルではない（値を二重に持つと食い違ったとき判断できなくなるため）
- **コメント**: 「何をしているか」ではなく「なぜそうしたか」を書く

## Git 運用

- ブランチ名: `feat/*` `fix/*` `chore/*` `docs/*` `ci/*`
- コミットメッセージ: Conventional Commits（`feat:` `fix:` `chore:` `docs:` `ci:`）
- **PR を出す前に `pnpm run check` と `pnpm run build` を通す**
- `main` への直接 push は禁止（Ruleset で強制済み）

## やってはいけないこと

- **`git push --force` と履歴の書き換え**（Ruleset でも禁止済み）
- **`.env` と鍵ファイル（`*.pem` `*.key`）の読み書き**。新しい環境変数は `.env.example` にキー名だけを追加する
- **`pnpm-lock.yaml` の手編集**。`pnpm` コマンドで再生成する
- **`dist/` の編集**。ビルド生成物なので `src/` を直す
- **CI のジョブ名 `check` の改名**。Ruleset の必須チェックが外れて PR がマージ不能になる。
  改名するなら Ruleset の Require status checks も同時に更新する

## 落とし穴

- **ESM のため、相対 import には拡張子 `.js` を付ける**（`./foo.ts` ではなく `./foo.js`）。TypeScript の `NodeNext` 仕様
- **`CLAUDE.md` に「AGENTS.md に従うこと」と文章で書いても機能しない。** `@` から始まるパス記法だけが読み込みを発生させる

## 指示ファイルの構成

Claude Code と Codex で同じリポジトリを扱うため、指示をこのファイルに集約しています。

- **Codex** は `AGENTS.md` を直接読む
- **Claude Code は `AGENTS.md` を直接読まない**。そのため `CLAUDE.md` の先頭に `@AGENTS.md` と書いて import している
  - 参考: [How Claude remembers your project](https://code.claude.com/docs/en/memory)

指示を追加・変更するときは、このファイルを編集してください。`CLAUDE.md` に書いてよいのは Claude Code 固有の内容だけです。

個人設定は `.claude/settings.local.json` と `CLAUDE.local.md`（いずれも gitignore 済み）へ。チーム共有の設定は `.claude/settings.json` にあります。
