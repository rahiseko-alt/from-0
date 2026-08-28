# 構成の判断記録

`AGENTS.md` と各設定ファイルが「なぜそうなっているか」の記録です。

`AGENTS.md` には運用に必要な指示だけを置き、根拠はこのファイルに分離しています。
**`AGENTS.md` から `@` で import していません。** 毎セッション読み込むとコンテキストを消費し、
指示の遵守率が下がるためです（公式が示す 200 行目安の趣旨）。必要なときに開いてください。

## 凡例

| 印       | 意味                                                                   |
| -------- | ---------------------------------------------------------------------- |
| **公式** | Claude Code 公式ドキュメントに明記があり、それに従った項目。出典を併記 |
| **判断** | 公式に規定がなく、この雛形として選択した項目。変更してよい条件を併記   |

---

## 1. 指示ファイルの構成

| 項目                                             | 区分     | 根拠 / 理由                                                                                                                           |
| ------------------------------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `CLAUDE.md` に `@AGENTS.md` と書いて import する | **公式** | [memory](https://code.claude.com/docs/en/memory) — "Claude Code reads `CLAUDE.md`, not `AGENTS.md`" とし、import する例を提示している |
| 文章で「AGENTS.md に従え」と書いても効かない     | **公式** | 同上。`@` から始まるパス記法だけが読み込みを発生させる                                                                                |
| `CLAUDE.md` を import 1行だけにする              | **判断** | 公式は「Claude 固有の指示を import の下に追記してよい」としている。何も追記していないのは、単一正本を崩さないための選択               |
| HTML コメントでメンテナ向けの注記を残す          | **公式** | [memory](https://code.claude.com/docs/en/memory) — ブロックレベル HTML コメントはコンテキスト注入前に除去される                       |
| `AGENTS.md` に書く項目の選定                     | **公式** | [best-practices](https://code.claude.com/docs/en/best-practices) の CLAUDE.md「Include / Exclude」表に準拠                            |
| 200 行以内を目安にする                           | **公式** | [memory](https://code.claude.com/docs/en/memory) — "target under 200 lines per CLAUDE.md file"                                        |
| 整形の設定値を `AGENTS.md` に書かない            | **判断** | 公式は禁じていない。`.prettierrc.json` と二重管理になり、食い違ったとき判断できなくなるため避けた                                     |
| スキル・サブエージェント・ルールを空にする       | **判断** | `.claude/` は Codex から見えないため、指示を置くと単一正本が分裂する。中身のないサンプルを配る価値もないと判断                        |

## 2. 権限（`.claude/settings.json`）

| 項目                                              | 区分     | 根拠 / 理由                                                                                                                     |
| ------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------- |
| ルールの記法（`Bash(cmd *)` `Read(./path)` `:*`） | **公式** | [permissions](https://code.claude.com/docs/en/permissions)                                                                      |
| 鍵ファイルに `Edit` deny も付ける                 | **公式** | 同上 — "NotebookEdit isn't covered, so add an `Edit` deny rule"                                                                 |
| `Bash(rm *)`（`rm -rf *` ではなく）               | **公式** | 同上 — 最初の `*` より前は文字通り一致するため、`rm -fr` を取りこぼす                                                           |
| `curl`/`wget` を deny し WebFetch に許可を与える  | **公式** | 同上 — この2つを一組で推奨している                                                                                              |
| allow / deny に**何を入れるか**の選定             | **判断** | 記法は公式、中身は私の選択。使うコマンドに合わせて各プロジェクトで調整してよい                                                  |
| `WebFetch` を `code.claude.com` に限定            | **判断** | この雛形が公式ドキュメントを参照する前提のため。必要なドメインは追加してよい                                                    |
| `respectGitignore: true`                          | **判断** | 公式の分類では「Interface and terminal」であり、セキュリティ設定ではない。害がないので残しているだけ                            |
| サンドボックスを既定で有効化**しない**            | **判断** | 公式は defense-in-depth として推奨している。ネイティブ Windows で動かず `allowWrite` が環境依存のため、壊れた既定を配らない選択 |
| `permissions.defaultMode` を書かない              | **判断** | プロジェクト値がユーザー値を上書きするため、全員の auto モードを奪う。`"auto"` はプロジェクトファイルからは効かず選択肢が非対称 |

## 3. フック

| 項目                                             | 区分     | 根拠 / 理由                                                                                                           |
| ------------------------------------------------ | -------- | --------------------------------------------------------------------------------------------------------------------- |
| 指示は助言、フックは決定論的という区別           | **公式** | [best-practices](https://code.claude.com/docs/en/best-practices) — "hooks are deterministic and guarantee the action" |
| フックの JSON 構造・`async`・`additionalContext` | **公式** | [hooks](https://code.claude.com/docs/en/hooks)                                                                        |
| `SessionStart` の `matcher: "startup\|resume"`   | **公式** | [cloud-environments](https://code.claude.com/docs/en/cloud-environments) の例。無いと `/clear` のたびに走る           |
| PostToolUse で整形を走らせるという発想           | **公式** | [hooks](https://code.claude.com/docs/en/hooks) に同型の例がある                                                       |
| `format.sh` / `typecheck.sh` の**実装**          | **判断** | `jq` に依存せず `node` で解析、拡張子フィルタ、成功時は無出力。いずれも私が書いた                                     |
| 型検査を `check` ではなく `typecheck` にする     | **判断** | Vitest の起動分だけ遅くなるため。テストまで走らせたい場合は差し替えてよい                                             |

## 4. 技術スタック

**この節はすべて判断です。** Claude Code 公式ドキュメントはスタックについて何も規定していません。

| 項目                                                | 理由 / 変更してよい条件                                                                    |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Node 22 / TypeScript 5 strict / pnpm / ESM / Vitest | 「鉄板構成」として選択。差し替えは自由。指示ファイルの構成は影響を受けない                 |
| `.npmrc` の `engine-strict` と `.node-version`      | Node 界隈の慣行。`engines` を宣言だけで終わらせないための組み合わせ                        |
| `tsconfig.json` / `tsconfig.build.json` の2分割     | テストを型検査の対象に含めつつ `dist/` に出力しないための一般的パターン                    |
| CI ワークフローの内容                               | GitHub Actions の一般知識。公式の Claude 用 Actions とは別物（後述のとおり同梱していない） |
| ジョブ名を汎用の `check` にする                     | 実行内容が増減しても陳腐化しないため。改名時は Ruleset の必須チェックも同時に更新すること  |

## 5. GitHub 側の設定

**この節もすべて判断です。** GitHub の機能であり、Claude Code 公式の指示ではありません。

- Ruleset（`main` 直 push 禁止、CI 必須、force push 禁止、削除禁止）
- Allow auto-merge、head ブランチの自動削除
- Template repository

`AGENTS.md` の「`main` への直接 push は禁止」を、文章ではなくルールとして強制するために設定しています。

## 6. 採用を見送った項目

いずれも公式に記載があり有用ですが、**雛形として全リポジトリに配ってよいか**という基準で見送りました。
必要なプロジェクトでは各自で追加してください。

| 項目                                                   | 見送った理由                                                                                          |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| Claude Code GitHub Actions（`@claude` 等）             | `ANTHROPIC_API_KEY` か `CLAUDE_CODE_OAUTH_TOKEN` が必須で既定が壊れる。OAuth トークンは個人に紐づく   |
| Code Review（マネージド）                              | Team/Enterprise 限定、組織 Owner の有効化が必要、1レビュー $15-25                                     |
| devcontainer                                           | 公式自身が必須と述べていない。組織ポリシー配布用途は server-managed settings / MDM に格下げされている |
| `security-guidance` プラグイン                         | Node 専用のこの雛形に Python 3.10 と pip の前提が増える。ターンごとにモデル利用コストが発生する       |
| `typescript-lsp` プラグイン                            | 各開発者のマシンに言語サーバのバイナリが必要。未インストールのまま配ると全員にエラーが出る            |
| Notification フック / output styles / ステータスライン | OS 依存または個人の好み。公式も置き場所を `~/.claude/settings.json` としている                        |
| PreToolUse の保護ファイルフック                        | 既存の `permissions.deny` と重複する                                                                  |

導入手順は [README](../README.md) の「導入を検討する価値があるもの」を参照してください。

## 7. 調査の範囲と限界

`AGENTS.md` の構成は、以下のページを WebFetch で取得し原文を読んだうえで決めています。

memory / permissions / permission-modes / sandboxing / claude-directory / settings-reference /
best-practices / hooks / skills / sub-agents / mcp / plugins / discover-plugins / output-styles /
statusline / commands / large-codebases / github-actions / code-review / security-guidance /
cloud-environments / web-quickstart / worktrees / devcontainer

**`settings` のページだけは全文を読めていません**（サイズ超過のため先頭のみ）。設定キーの一覧は
`settings-reference` の索引表を根拠にしています。
