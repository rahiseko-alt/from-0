# from-0

Claude Code と Codex で同じリポジトリを扱うための、**公式準拠のリポジトリ雛形**です。

新しいプロジェクトを始めるたびに `AGENTS.md` と `CLAUDE.md` の関係や `.gitignore` の切り分けを
考え直さなくて済むように、判断済みの構成を1セットにまとめてあります。

## この雛形の中身

### 指示ファイル

| ファイル                | 役割                                                         |
| ----------------------- | ------------------------------------------------------------ |
| `AGENTS.md`             | 全エージェント共通の指示。**唯一の正本**                     |
| `CLAUDE.md`             | `@AGENTS.md` の import 1行のみ。ポインタに徹する             |
| `.claude/settings.json` | Claude Code のチーム共有設定（権限）                         |
| `.gitignore`            | Node/TS・秘密情報・OS に加え、エージェントのローカルファイル |

### 開発基盤

Node 22 / TypeScript 5 strict / pnpm / ESM。Prettier と EditorConfig で整形を統一し、
GitHub Actions で `pnpm run check` を自動実行します。

## なぜこの構成なのか

**Claude Code は `AGENTS.md` を直接読みません。**
[公式ドキュメント](https://code.claude.com/docs/en/memory)に "Claude Code reads `CLAUDE.md`,
not `AGENTS.md`" と明記されています。そこで公式が示す import 方式を採用し、`CLAUDE.md` の先頭に
`@AGENTS.md` の1行を置いて同じ実体を読ませています。Codex は `AGENTS.md` を直接読むため、
実体は1ファイルのまま両対応できます。

> **落とし穴**: `CLAUDE.md` に「AGENTS.md に従うこと」と**文章で書いても機能しません**。
> `@` から始まるパス記法だけが読み込みを発生させます。

**指示ファイルには「知らないと間違えること」だけを書きます。**
技術スタックやディレクトリ構成のようにコードから導出できる情報は書きません。公式ドキュメントが
`/doctor` の削減方針として示すとおり、導出可能な内容は削り、落とし穴・理由・デフォルトと異なる
規約だけを残す方針です。冗長な記述はコンテキストを消費し、指示の遵守率を下げます。

**スタックは宣言ではなく強制で守ります。**
`engines.node` を書くだけでは検査されないため、`.npmrc` の `engine-strict=true` と
`.node-version` を併用し、条件を満たさない環境では `pnpm install` が失敗するようにしています。

## この雛形の使い方

GitHub の **Use this template** から新しいリポジトリを作り、以下を書き換えてください。

- [ ] `package.json` の `name` と `description`
- [ ] `README.md`（このファイル）をプロジェクトの説明に差し替え
- [ ] `AGENTS.md` の `**目的**` の行
- [ ] `AGENTS.md` の「落とし穴」に、そのプロジェクト固有の注意点を追加
- [ ] `.claude/settings.json` の権限を、使うコマンドに合わせて調整
- [ ] `src/index.ts` を実際のコードに置き換え

スタックを変える場合（Next.js を入れる等）は `package.json` / `tsconfig.json` /
`.github/workflows/ci.yml` を差し替えてください。指示ファイルの構成はそのまま使えます。

## セットアップ

```bash
pnpm install
```

Node のバージョンは `.node-version` に固定しています。nvm / fnm / mise などのバージョン管理ツールを
使っていれば自動で切り替わります。合っていない場合は `engine-strict` により install が失敗します。

必要な環境変数は `.env.example` を `.env` にコピーして埋めてください（`.env` はコミットされません）。

## コマンド

| コマンド                | 内容                         |
| ----------------------- | ---------------------------- |
| `pnpm run typecheck`    | 型チェック                   |
| `pnpm run format`       | Prettier で整形              |
| `pnpm run format:check` | 整形差分の検査               |
| `pnpm run check`        | 上記のチェックをまとめて実行 |

## 参照した公式ドキュメント

- [How Claude remembers your project](https://code.claude.com/docs/en/memory) — `CLAUDE.md` と `AGENTS.md` の関係、書き方の指針
- [Claude Code settings](https://code.claude.com/docs/en/settings) — 設定ファイルの階層と優先順位
- [Claude Code settings reference](https://code.claude.com/docs/en/settings-reference) — 設定キー一覧
- [Explore the .claude directory](https://code.claude.com/docs/en/claude-directory) — `.claude/` 配下でコミットすべきもの・すべきでないもの
- [Configure permissions](https://code.claude.com/docs/en/permissions) — 権限ルールの記法
