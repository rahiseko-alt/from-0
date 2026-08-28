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
| `.claude/settings.json` | Claude Code のチーム共有設定（権限・フック）                 |
| `.claude/hooks/`        | フックのスクリプト。編集後の自動整形                         |
| `.mcp.json`             | MCP サーバの定義（初期状態は空）                             |
| `.worktreeinclude`      | worktree 作成時にコピーする gitignore 済みファイル           |
| `.gitignore`            | Node/TS・秘密情報・OS に加え、エージェントのローカルファイル |

### 開発基盤

Node 22 / TypeScript 5 strict / pnpm / ESM。テストは Vitest、整形は Prettier と EditorConfig。
GitHub Actions で整形検査・型チェック・テスト・ビルドを自動実行します。

## なぜこの構成なのか

**Claude Code は `AGENTS.md` を直接読みません。**
[公式ドキュメント](https://code.claude.com/docs/en/memory)に "Claude Code reads `CLAUDE.md`,
not `AGENTS.md`" と明記されています。そこで公式が示す import 方式を採用し、`CLAUDE.md` の先頭に
`@AGENTS.md` の1行を置いて同じ実体を読ませています。Codex は `AGENTS.md` を直接読むため、
実体は1ファイルのまま両対応できます。

> **落とし穴**: `CLAUDE.md` に「AGENTS.md に従うこと」と**文章で書いても機能しません**。
> `@` から始まるパス記法だけが読み込みを発生させます。

**指示ファイルに書く範囲は、公式の本則に沿って決めています。**
公式ドキュメントは「build commands, conventions, project layout, "always do X" rules」を挙げており、
`AGENTS.md` はこれに沿って、コマンド・ディレクトリと主要ファイルの役割・コーディング規約・Git 運用・
禁止操作・落とし穴を書いています。

ただし**同じ値を2箇所に持つことはしません**。たとえばインデント幅やクォートの種類は
`.prettierrc.json` と `.editorconfig` が正本で、`AGENTS.md` には「Prettier に一任する。正本はそちら」
とだけ書きます。値を二重に持つと、食い違ったときにどちらが正しいか判断できなくなるためです。

なお公式には `/doctor` の削減方針として「導出可能な内容は削る」という記述もありますが、これは
肥大化したファイルを削るときの優先順位であり、本則を打ち消すものではありません。目安は200行以下です。

**スタックは宣言ではなく強制で守ります。**
`engines.node` を書くだけでは検査されないため、`.npmrc` の `engine-strict=true` と
`.node-version` を併用し、条件を満たさない環境では `pnpm install` が失敗するようにしています。

## 決定論的に強制しているもの

公式ドキュメントは「指示は助言、フックは決定論的」と区別しています。

> Unlike CLAUDE.md instructions which are advisory, hooks are deterministic and guarantee the action happens.

そのため、守られないと困るものは指示ではなく仕組み側に置いています。

| 守りたいこと                   | 仕組み                                            |
| ------------------------------ | ------------------------------------------------- |
| Node のバージョン              | `.npmrc` の `engine-strict` で install が失敗する |
| 整形が適用されること           | PostToolUse フックが編集直後に Prettier を実行    |
| 依存が入っていること           | SessionStart フックが `pnpm install` を実行       |
| 秘密情報を読ませない           | `.claude/settings.json` の `permissions.deny`     |
| 生成物とロックファイルの手編集 | 同上（`dist/` と `pnpm-lock.yaml` を deny）       |
| CI 通過とレビュー経由の変更    | GitHub の Ruleset（`main` 直 push 禁止・CI 必須） |

## 拡張ポイント

Claude Code には他にも拡張機構があります。この雛形では**意図的に空**にしてあり、必要になった時点で追加してください。

| 機構                                                                               | 置き場所          | 用途                                           |
| ---------------------------------------------------------------------------------- | ----------------- | ---------------------------------------------- |
| [スキル](https://code.claude.com/docs/en/skills)                                   | `.claude/skills/` | 手順やドメイン知識。必要なときだけ読み込まれる |
| [サブエージェント](https://code.claude.com/docs/en/sub-agents)                     | `.claude/agents/` | 別コンテキストで動く専門エージェント           |
| [ルール](https://code.claude.com/docs/en/memory#organize-rules-with-claude/rules/) | `.claude/rules/`  | パス単位で読み込む指示（`paths:` frontmatter） |
| [MCP](https://code.claude.com/docs/en/mcp)                                         | `.mcp.json`       | 外部ツールとの接続                             |

> **注意**: `.claude/` 配下の指示は **Claude Code しか読みません**。Codex からは見えないため、
> 両ツールで守らせたい内容は必ず `AGENTS.md` に書いてください。ここに書いてよいのは、
> Claude Code 固有の手順や、指示ではない仕組み（フック・権限）です。

公式は「CLAUDE.md の一節が事実ではなく手順に育ったら、スキルに移す」ことを勧めています。
`AGENTS.md` が 200 行に近づいてきたら、手順をスキルへ切り出す合図です。

## この雛形の使い方

GitHub の **Use this template** から新しいリポジトリを作り、以下を書き換えてください。

- [ ] `package.json` の `name` と `description`
- [ ] `README.md`（このファイル）をプロジェクトの説明に差し替え
- [ ] `AGENTS.md` の `**目的**` の行
- [ ] `AGENTS.md` の「落とし穴」に、そのプロジェクト固有の注意点を追加
- [ ] `.claude/settings.json` の権限とフックを、使うコマンドに合わせて調整
- [ ] `src/index.ts` と `src/index.test.ts` を実際のコードとテストに置き換え
- [ ] GitHub 側の設定（Ruleset で `main` 保護と CI 必須、Allow auto-merge、head ブランチ自動削除）

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

| コマンド                | 内容                                           |
| ----------------------- | ---------------------------------------------- |
| `pnpm run check`        | 整形検査 + 型チェック + テスト（コミット前に） |
| `pnpm run test`         | Vitest でテストを実行                          |
| `pnpm run test:watch`   | Vitest を監視モードで起動                      |
| `pnpm run build`        | `tsc` で `dist/` に出力                        |
| `pnpm run typecheck`    | 型チェックのみ                                 |
| `pnpm run format`       | Prettier で整形                                |
| `pnpm run format:check` | 整形差分の検査のみ                             |

## 参照した公式ドキュメント

- [How Claude remembers your project](https://code.claude.com/docs/en/memory) — `CLAUDE.md` と `AGENTS.md` の関係、書き方の指針
- [Claude Code settings](https://code.claude.com/docs/en/settings) — 設定ファイルの階層と優先順位
- [Claude Code settings reference](https://code.claude.com/docs/en/settings-reference) — 設定キー一覧
- [Explore the .claude directory](https://code.claude.com/docs/en/claude-directory) — `.claude/` 配下でコミットすべきもの・すべきでないもの
- [Configure permissions](https://code.claude.com/docs/en/permissions) — 権限ルールの記法
- [Best practices for Claude Code](https://code.claude.com/docs/en/best-practices) — 指示ファイルの Include / Exclude 表、検証手段を持たせること
- [Hooks reference](https://code.claude.com/docs/en/hooks) — フックのイベントと設定形式
- [Extend Claude with skills](https://code.claude.com/docs/en/skills) — スキルの形式と使いどころ
