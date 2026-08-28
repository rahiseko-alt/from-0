# AGENTS.md

本リポジトリで作業するすべてのコーディングエージェント（Claude Code / Codex ほか）共通の指示です。
このファイルが唯一の正本で、ツール固有ファイルはここへのポインタに徹します。

**目的**: Claude Code と Codex で共用できる、公式準拠のリポジトリ雛形そのものを作ること。
このリポジトリを雛形として使い始めたら、この行を実際のプロジェクトの目的に書き換えてください。

## コマンド

```bash
pnpm install
pnpm run check    # format:check + typecheck + test。コミット前に必ず通す
pnpm run test     # Vitest（単体。監視は test:watch）
pnpm run build    # tsc で dist/ に出力
pnpm run format   # Prettier で整形
```

npm / yarn ではなく **pnpm** を使ってください。

## 落とし穴

- **ESM のため、相対 import には拡張子 `.js` を付ける**（`./foo.ts` ではなく `./foo.js`）。TypeScript の `NodeNext` 仕様
- **整形は Prettier に一任する。** 手で整形し直さない。スタイルの正本は `.prettierrc.json` と `.editorconfig` であり、このファイルではない
- **秘密情報を読み書きしない。** `.env` と鍵ファイルは対象外（`.claude/settings.json` でも deny 済み）。新しい環境変数が必要なときは `.env.example` にキー名だけを追加する

## Git

- コミットメッセージは Conventional Commits（`feat:` `fix:` `chore:` `docs:`）
- `main` への直接 push は禁止。Pull Request 経由

## 指示ファイルの構成

Claude Code と Codex で同じリポジトリを扱うため、指示をこのファイルに集約しています。

- **Codex** は `AGENTS.md` を直接読む
- **Claude Code は `AGENTS.md` を直接読まない**。そのため `CLAUDE.md` の先頭に `@AGENTS.md` と書いて import している

> **注意**: `CLAUDE.md` に「AGENTS.md に従うこと」と**文章で書いても機能しません**。`@` から始まるパス記法だけが読み込みを発生させます。
> 参考: [How Claude remembers your project](https://code.claude.com/docs/en/memory)

指示を追加・変更するときは、このファイルを編集してください。`CLAUDE.md` に書いてよいのは Claude Code 固有の内容だけです。

個人設定は `.claude/settings.local.json` と `CLAUDE.local.md`（いずれも gitignore 済み）へ。チーム共有の設定は `.claude/settings.json` にあります。
