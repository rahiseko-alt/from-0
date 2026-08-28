# AGENTS.md

このファイルは、本リポジトリで作業する**すべてのコーディングエージェントの単一情報源（Single Source of Truth）**です。
Claude Code / Codex / その他のエージェントは、いずれもこのファイルの内容に従ってください。

> ツール固有ファイル（`CLAUDE.md` など）は、このファイルを読み込むためのポインタに徹します。
> 指示の実体をツール固有ファイルへ二重に書かないでください。詳細は「設定ファイルの方針」を参照。

## プロジェクト概要

- **リポジトリ**: `rahiseko-alt/from-0`
- **目的**: （TODO: このリポジトリで何を作るかを1〜3行で記述する）
- **状態**: 立ち上げ中。アプリケーション本体はまだ存在しない。

## 技術スタック

| 項目                 | 採用                     |
| -------------------- | ------------------------ |
| ランタイム           | Node.js 22 (LTS)         |
| 言語                 | TypeScript 5 (strict)    |
| パッケージマネージャ | pnpm                     |
| フォーマッタ         | Prettier                 |
| モジュール形式       | ESM (`"type": "module"`) |

バージョンは `package.json` の `engines` / `packageManager` を正とします。

## 主要コマンド

```bash
pnpm install          # 依存をインストール
pnpm run typecheck    # 型チェック（tsc --noEmit）
pnpm run format       # Prettier で整形
pnpm run format:check # 整形差分の検査（CI 用）
pnpm run check        # format:check + typecheck をまとめて実行
```

コミット前には必ず `pnpm run check` を通してください。

## ディレクトリ構成

```
.
├── AGENTS.md              # 本ファイル。全エージェント共通の指示（正本）
├── CLAUDE.md              # @AGENTS.md を読み込むポインタ + Claude 固有の追記
├── README.md              # 人間向けの入口
├── package.json           # スクリプトと依存の定義
├── tsconfig.json          # TypeScript 設定
├── .claude/
│   └── settings.json      # Claude Code のチーム共有設定（コミット対象）
├── .editorconfig          # エディタ共通の整形ルール
├── .prettierrc.json       # Prettier 設定
└── src/                   # アプリケーションコード（今後追加）
```

## コーディング規約

- **インデント**: スペース2、行末セミコロンあり、シングルクォート（Prettier に委ねる。手で整形しない）
- **文字コード / 改行**: UTF-8 / LF。`.editorconfig` に従う
- **TypeScript**: `strict: true` を前提とする。`any` は使わず、やむを得ない場合は理由をコメントで残す
- **命名**: 変数・関数は `camelCase`、型・クラスは `PascalCase`、定数は `UPPER_SNAKE_CASE`
- **ファイル名**: `kebab-case.ts`
- **インポート**: ESM のため相対インポートには拡張子 `.js` を付ける（TypeScript の ESM 仕様）
- **コメント**: 「何をしているか」ではなく「なぜそうしたか」を書く

## Git 運用

- **ブランチ**: `main` を保護。作業は `feat/*` `fix/*` `chore/*` `docs/*` から切る
- **コミットメッセージ**: Conventional Commits に従う
  例: `feat: 検索フォームを追加` / `fix: 日付のタイムゾーンずれを修正` / `chore: 依存を更新`
- **`main` への直接 push は禁止**。必ず Pull Request 経由
- 生成物・秘密情報はコミットしない（`.gitignore` を参照）

## エージェント向け作業ルール

1. **秘密情報を読み書きしない**。`.env` 系ファイル、認証情報、鍵は読み取り対象外。設定が必要な場合は `.env.example` にキー名だけを追加する
2. **破壊的操作の前に確認する**。`git push --force`、`rm -rf`、ブランチ削除、履歴改変は、明示的な指示がない限り実行しない
3. **範囲を勝手に広げない**。依頼されたタスクに必要な変更だけを行う。ついでのリファクタリングは提案に留める
4. **完了報告は事実に基づく**。テストやチェックが失敗しているなら、その旨と出力を報告する。通していない検証を「通した」と書かない
5. **不明点は推測せず確認する**。ただし確認待ちの間も、答えに依存しない作業は進めてよい
6. **フォーマッタの結果を手で上書きしない**。整形は `pnpm run format` に一任する
7. **依存の追加は最小限に**。標準ライブラリや既存の依存で足りる場合は追加しない。追加する場合は理由を PR に書く

## 設定ファイルの方針

同一リポジトリを Claude Code と Codex の両方で扱うため、**指示と設定を一箇所に集約**します。

### 指示ファイル

- **`AGENTS.md`（本ファイル）が正本。** Codex はこれを直接読みます
- **Claude Code は `AGENTS.md` を直接読みません**（公式仕様）。そのため `CLAUDE.md` の先頭に `@AGENTS.md` と書いて import しています。この1行がセッション開始時に本ファイルを展開して読み込みます
  - 参考: [How Claude remembers your project](https://code.claude.com/docs/en/memory)
  - 注意: `CLAUDE.md` に「AGENTS.md に従うこと」と**文章で書いても機能しません**。`@` から始まるパス記法のみが読み込みを発生させます
- Claude Code 固有の指示だけを `CLAUDE.md` の import 以下に追記してよい。ツール横断で有効な指示は必ず本ファイル側に書く

### バージョン管理の切り分け

| ファイル                      | 扱い     | 理由                                               |
| ----------------------------- | -------- | -------------------------------------------------- |
| `AGENTS.md`                   | コミット | 全エージェント共通の正本                           |
| `CLAUDE.md`                   | コミット | 正本へのポインタ。チームで共有する                 |
| `.claude/settings.json`       | コミット | チーム共有の Claude Code 設定                      |
| `.claude/settings.local.json` | **無視** | 個人用の上書き設定                                 |
| `CLAUDE.local.md`             | **無視** | 個人用のメモ・指示                                 |
| `.mcp.json`                   | コミット | MCP サーバ定義をチームで共有（必要になったら追加） |

`.gitignore` は Node/TypeScript に加えて、上記のエージェント関連ローカルファイルも1ファイルでまとめて管理します。
