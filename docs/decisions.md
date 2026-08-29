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

## 記入の作法

設定や指示を変更したら、このファイルの該当行も更新してください。

- **公式** に分類するのは、公式ドキュメントの**原文を読んで確認した**項目だけ。出典 URL を必ず併記する
- **判断** には、理由と「変更してよい条件」を必ず書く。理由のない行は後から判断できないため価値がない
- 確認していない仕様を **公式** に分類しない。確認していなければ **判断** にするか `[曖昧]` を付ける
- 採用しなかった選択肢も「6. 採用を見送った項目」に残す。同じ検討を繰り返さないため

---

## 1. 指示ファイルの構成

| 項目                                                       | 区分     | 根拠 / 理由                                                                                                                                                            |
| ---------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CLAUDE.md` に `@AGENTS.md` と書いて import する           | **公式** | [memory](https://code.claude.com/docs/en/memory) — "Claude Code reads `CLAUDE.md`, not `AGENTS.md`" とし、import する例を提示している                                  |
| 文章で「AGENTS.md に従え」と書いても効かない               | **公式** | 同上。`@` から始まるパス記法だけが読み込みを発生させる                                                                                                                 |
| `CLAUDE.md` を import 1行だけにする                        | **判断** | 公式は「Claude 固有の指示を import の下に追記してよい」としている。何も追記していないのは、単一正本を崩さないための選択                                                |
| HTML コメントでメンテナ向けの注記を残す                    | **公式** | [memory](https://code.claude.com/docs/en/memory) — ブロックレベル HTML コメントはコンテキスト注入前に除去される                                                        |
| `AGENTS.md` に書く項目の選定                               | **公式** | [best-practices](https://code.claude.com/docs/en/best-practices) の CLAUDE.md「Include / Exclude」表に準拠                                                             |
| 200 行以内を目安にする                                     | **公式** | [memory](https://code.claude.com/docs/en/memory) — "target under 200 lines per CLAUDE.md file"                                                                         |
| 各行の判定基準は「削ると挙動が変わるか」                   | **公式** | [best-practices](https://code.claude.com/docs/en/best-practices) — "For each line, ask: 'Would removing this cause Claude to make mistakes?' If not, cut it."          |
| ディレクトリ一覧・設計理由・フックの仕組みの説明を置かない | **公式** | 同上 Exclude 列 — "Anything Claude can figure out by reading code" "Long explanations or tutorials" "File-by-file descriptions of the codebase" に該当するため削除した |
| ブランチ名規則・コミット規約は残す                         | **公式** | 同上 Include 列 — "Repository etiquette (branch naming, PR conventions)" に明記されている。削るべきという外部評価が一度出たが、公式の Include 項目のため残した         |
| 整形の設定値を `AGENTS.md` に書かない                      | **判断** | 公式は禁じていない。`.prettierrc.json` と二重管理になり、食い違ったとき判断できなくなるため避けた                                                                      |
| スキル・サブエージェント・ルールを空にする                 | **判断** | `.claude/` は Codex から見えないため、指示を置くと単一正本が分裂する。中身のないサンプルを配る価値もないと判断                                                         |

## 1-b. 応答と作業の進め方

**この節はすべて判断です。** 公式ドキュメントは応答の態度について規定していません。

| 項目                               | 理由 / 変更してよい条件                                                        |
| ---------------------------------- | ------------------------------------------------------------------------------ |
| 既存資産の活用を先に検討する       | このリポジトリの所有者の方針。新規実装は保守対象が増えるため最終手段とする     |
| 迎合しない・率直に述べる           | 同上。同意できない点を飲み込むと、誤った前提のまま作業が進むため               |
| 確度の低い情報に `[曖昧]` を付ける | 同上。断定と推測が同じ見た目で並ぶと、受け手が検証すべき箇所を判断できないため |
| 作業報告は「何をどうしたか」だけ   | 同上。経緯と背景は求められたときに出す                                         |

雛形として使うときは、チームの方針に合わせて書き換えてください。`AGENTS.md` の
「応答と作業の進め方」が実体で、この節はその根拠です。

「非エンジニア向けの説明」「常に丁寧な態度と言葉遣い」は AGENTS.md から削除した。理由は
[best-practices](https://code.claude.com/docs/en/best-practices) の判定基準
（"Would removing this cause Claude to make mistakes?"）に照らすと、この2件は間違えると
損害が出る指示ではなく好みの範疇で、同表の Exclude 列 "Self-evident practices" に近いため。
外部評価（AGENTS.md が説明過多という指摘）を受けて、AGENTS.md 全体をこの基準で見直した際に
あわせて削った。

## 2. 権限（`.claude/settings.json`）

| 項目                                                                     | 区分     | 根拠 / 理由                                                                                                                                                                                                                                          |
| ------------------------------------------------------------------------ | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ルールの記法（`Bash(cmd *)` `Read(./path)` `:*`）                        | **公式** | [permissions](https://code.claude.com/docs/en/permissions)                                                                                                                                                                                           |
| 鍵ファイルに `Edit` deny も付ける                                        | **公式** | 同上 — "NotebookEdit isn't covered, so add an `Edit` deny rule"                                                                                                                                                                                      |
| `Bash(rm *)`（`rm -rf *` ではなく）                                      | **公式** | 同上 — 最初の `*` より前は文字通り一致するため、`rm -fr` を取りこぼす                                                                                                                                                                                |
| `curl`/`wget` を deny し WebFetch に許可を与える                         | **公式** | 同上 — この2つを一組で推奨している                                                                                                                                                                                                                   |
| deny は allow より優先する                                               | **公式** | [permissions](https://code.claude.com/docs/en/permissions) — 評価順は Deny → Ask → Allow                                                                                                                                                             |
| allow / deny に**何を入れるか**の選定                                    | **判断** | 記法は公式、中身は私の選択。使うコマンドに合わせて各プロジェクトで調整してよい                                                                                                                                                                       |
| 読み取り専用の git を allow に入れる                                     | **判断** | `show` `fetch` `branch` `rev-parse` `ls` を許可。破壊的な部分集合（`branch -d`/`-D`）は deny 優先の原則どおり deny 側で個別に塞ぐ                                                                                                                    |
| `git branch -d`/`-D` を deny                                             | **判断** | `Bash(git branch *)` の allow はブランチ削除も含んでしまう。`rm`/`reset --hard` と同じ形で、破壊的な部分だけ deny に足して塞いだ                                                                                                                     |
| `git push` を ask から allow に移す                                      | **判断** | `--force` と `-f` は deny 済みで deny が allow に優先し、`main` 直 push は Ruleset が止める。二重の確認より許可の回数を優先した                                                                                                                      |
| PR 監視系の `mcp__Claude_Code_Remote__*` を allow                        | **判断** | `subscribe`/`unsubscribe`_pr_activity、trigger の作成・更新・削除・即時実行、`send_later` はコードやリポジトリを変更しない。CI 監視のたびに確認を求められていたため追加した                                                                          |
| `WebFetch` を `code.claude.com` に限定                                   | **判断** | この雛形が公式ドキュメントを参照する前提のため。必要なドメインは追加してよい                                                                                                                                                                         |
| `respectGitignore: true`                                                 | **判断** | 公式の分類では「Interface and terminal」であり、セキュリティ設定ではない。害がないので残しているだけ                                                                                                                                                 |
| サンドボックスを既定で有効化**しない**                                   | **判断** | 公式は defense-in-depth として推奨している。ネイティブ Windows で動かず `allowWrite` が環境依存のため、壊れた既定を配らない選択                                                                                                                      |
| `permissions.defaultMode` を書かない                                     | **判断** | プロジェクト値がユーザー値を上書きするため、全員の auto モードを奪う。`"auto"` はプロジェクトファイルからは効かず選択肢が非対称                                                                                                                      |
| `.claude/` 配下は「保護パス」で `permissions.allow` では事前承認できない | **公式** | [permission-modes](https://code.claude.com/docs/en/permission-modes) の Protected paths 節。`Edit(.claude/**)` を allow に入れても効果がなく、毎回確認を求められる。止めるレバーは `bypassPermissions` モードのみ（deny も含め全プロンプトを止める） |

## 3. フック

| 項目                                                                                        | 区分     | 根拠 / 理由                                                                                                                                                                                                                                                                                                      |
| ------------------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 指示は助言、フックは決定論的という区別                                                      | **公式** | [best-practices](https://code.claude.com/docs/en/best-practices) — "hooks are deterministic and guarantee the action"                                                                                                                                                                                            |
| フックの JSON 構造・`async`・`additionalContext`                                            | **公式** | [hooks](https://code.claude.com/docs/en/hooks)                                                                                                                                                                                                                                                                   |
| `SessionStart` の `matcher: "startup\|resume"`                                              | **公式** | [cloud-environments](https://code.claude.com/docs/en/cloud-environments) の例。無いと `/clear` のたびに走る                                                                                                                                                                                                      |
| PostToolUse で整形を走らせるという発想                                                      | **公式** | [hooks](https://code.claude.com/docs/en/hooks) に同型の例がある                                                                                                                                                                                                                                                  |
| `format.sh` / `typecheck.sh` の**実装**                                                     | **判断** | `jq` に依存せず `node` で解析、拡張子フィルタ、成功時は無出力。いずれも私が書いた                                                                                                                                                                                                                                |
| 型検査を `check` ではなく `typecheck` にする                                                | **判断** | Vitest の起動分だけ遅くなるため。テストまで走らせたい場合は差し替えてよい                                                                                                                                                                                                                                        |
| 4フックとも `${CLAUDE_PROJECT_DIR}` ではなく標準入力 JSON の `cwd` へ `cd` する             | **公式** | [hooks](https://code.claude.com/docs/en/hooks) の Worktrees 節 — `${CLAUDE_PROJECT_DIR}` は worktree に入っても元のチェックアウトを指したままだが、`cwd` は worktree のパスに追従する。`AGENTS.md` は当初からこの仕様を書いていたが、フックの実装が追いついていなかった（未検証のまま放置していた）              |
| `typecheck.sh` の `node_modules` 存在チェックを cwd 直下だけでなく祖先ディレクトリも辿る    | **判断** | `EnterWorktree` で実際に worktree に入って E2E 検証したところ発覚。worktree には `node_modules` 自体が無いが、`pnpm run typecheck` はディレクトリを上へたどってメインチェックアウトの `node_modules`（tsc）を見つけて解決できる。旧実装は cwd 直下しか見ておらず、worktree では型検査が黙って no-op になっていた |
| `format.sh`/`typecheck.sh`/`handoff-check.sh` の `cwd` 対応は harness 経由の E2E で検証済み | **判断** | `EnterWorktree` で worktree に入り、実際に Edit で `.ts` を編集して PostToolUse を、worktree を dirty にしてターンを終えて Stop を、それぞれ本物の harness 経由で発火させた。`handoff-stamp.sh`（SessionEnd）だけは実際にセッションを終了させないと発火できないため、サンプル JSON の手動テストのみ              |

## 3-b. セッション間の引継ぎ

既存実装3つ（[392fyc/claude-handoff](https://github.com/392fyc/claude-handoff)、
[shihchengwei-lab/claude-code-session-kit](https://github.com/shihchengwei-lab/claude-code-session-kit)、
[who96/claude-code-context-handoff](https://github.com/who96/claude-code-context-handoff)）を調べ、
書き込み側は2つ目の方式を採った。読み込み側は3つとも SessionStart フックを使っているが、
この雛形では**フックではなく `@` import** にした（理由は下表）。

| 項目                                                                                                      | 区分     | 根拠 / 理由                                                                                                                                                                                                                                                                                                                                                                                      |
| --------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| import は再帰的に展開される（最大4段）                                                                    | **公式** | [memory](https://code.claude.com/docs/en/memory) — "Imported files can recursively import other files"                                                                                                                                                                                                                                                                                           |
| プロジェクト直下の指示はコンパクション後も再注入される                                                    | **公式** | 同上 — "Project-root CLAUDE.md survives compaction"                                                                                                                                                                                                                                                                                                                                              |
| プロジェクトのフックは workspace trust を要求する                                                         | **公式** | [hooks](https://code.claude.com/docs/en/hooks) — "Project-level hooks follow workspace trust rules"                                                                                                                                                                                                                                                                                              |
| SessionEnd はモデルを呼べず、予算が既定 1.5 秒                                                            | **公式** | 同上 — "SessionEnd hooks share a 1.5-second budget"。timeout を上げると最大 60 秒まで拡張できる                                                                                                                                                                                                                                                                                                  |
| Stop は毎ターン発火し、exit 2 で会話を継続させられる                                                      | **公式** | 同上 — "Stop fires once per turn"、"exit code 2 prevents Claude from stopping"                                                                                                                                                                                                                                                                                                                   |
| 読み込みは SessionStart フックではなく `@` import                                                         | **判断** | フックは trust 承認まで動かず、コンパクション後の再注入もない。import は両方を満たす。あわせて文章でも読むよう指示している（Codex は import を展開しないため）                                                                                                                                                                                                                                   |
| Stop フックで差し戻す                                                                                     | **判断** | session-kit の方式。スキルは必ず発火しないため、確実性が要るならフックしかない                                                                                                                                                                                                                                                                                                                   |
| 引継ぎは `main` へのマージまでを完了とする                                                                | **判断** | コンテナは終了後に破棄され、次のセッションは `main` を新規クローンする。作業ブランチへのコミットだけでは失われるため、マージしない引継ぎは存在しないのと同じ                                                                                                                                                                                                                                     |
| ただしマージ必須の対象は「引継ぎ文」に限る。コード自体は未完了なら push 済み branch/worktree に残してよい | **判断** | 当初は「main へマージするまで完了」と一体で扱っていたが、これは誤りを含んでいた。**push 済みのコミットは origin に残るため消えない**——消えるのは push していないコミットだけ。次セッションが自動で読むのは `main` の `docs/handoff.md` だけなので、必須なのは引継ぎ文が `main` に載ることで、worktree 越しの継続開発（未完了タスクを branch に残し、次セッションが続行する）を妨げるべきではない |
| `/checkin` と `/checkout` をスキルとして用意する                                                          | **判断** | 作業の開始と終了は人が決めるタイミングであり、フックで検出できない。呼び出し口を用意し、手順を固定した                                                                                                                                                                                                                                                                                           |
| 差し戻しは**1セッションに1回だけ**                                                                        | **判断** | Stop は毎ターン発火するため、無条件に止めると作業にならない。マーカーで抑止している                                                                                                                                                                                                                                                                                                              |
| `docs/handoff.md` を**コミット対象**にする                                                                | **判断** | gitignore にするとクラウドセッション（毎回 fresh clone）で必ず失われるため。複数人で編集すると競合しうる点は許容した                                                                                                                                                                                                                                                                             |
| SessionEnd では機械的な事実だけ記録する                                                                   | **判断** | モデルを呼べないため文章は書けない。ブランチ・HEAD・変更ファイルはシェルだけで取れる                                                                                                                                                                                                                                                                                                             |
| `handoff.md` の役割を「今どの branch を見ればいいか」のポインタに絞る。branch 固有の詳細は書かない        | **判断** | 外部評価の指摘。`main` 上の単一ファイルが複数 branch の状態を同時に代表しようとすると、並列 worktree で片方の更新がもう片方を上書きする。branch 固有の詳細はその branch 自身のコミットや PR 本文に置き、`handoff.md` には列挙用の短いポインタだけを置く形にした                                                                                                                                  |
| 「注意点」に恒久的なリポジトリのルールを再掲しない。`AGENTS.md`/`docs/decisions.md` を参照する            | **判断** | 同上の指摘。実例として、当時の「注意点」に `main` 直 push 禁止・CI ジョブ名の制約など、セッションが変わっても変わらない事実が複数混入していた。これらは既に `AGENTS.md`/`docs/decisions.md` にあり、二重管理は食い違いの元になる                                                                                                                                                                 |
| 同時並行の複数 branch を前提にしたタスク管理層（Issue/Task 単位の状態ファイル等）は追加しない             | **判断** | 外部評価は Goal→Issue→Branch→Worktree→Agent の階層構造を提案したが、この雛形の実運用は直列（1セッション=1系統の作業）であり、使うかどうか未確定の機構を配るのは「AGENTS.md の分量削減」で確立した基準（使わない仕組みを配らない）と矛盾する。複数 branch が同時進行する場合は「次にやること」に箇条書きで列挙する軽量な対処に留め、本格的な状態管理が要るなら再検討する                          |
| `handoff-stamp.sh` は追記ではなく上書き                                                                   | **判断** | `<!-- session-end-stamp -->` 以降を毎回まるごと置き換える実装（`text.slice(0, i) + block`）であることをコード上で確認済み。外部評価は「ログが伸び続ける」懸念を挙げたが、この実装では起きない                                                                                                                                                                                                    |

**この仕組みの限界を明記しておく。** 「セッション終了時にモデルへ引継ぎを書かせる」手段は公式に存在しない。
SessionEnd はモデルを呼べず、Stop はターン単位でしか発火しない。したがって確実に得られるのは
「1セッションに1回の差し戻し」と「終了時の機械的な記録」までで、文章の鮮度は保証されない。
区切りごとに `/handoff` を実行するのが最も確実である。

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

## 7. テスト方針（test-policy.md）

`docs/test-policy.md` はユーザーが用意した既存文書（TEST_POLICY.md）をそのまま実装したものです。
公式の1標準に基づく指示ではないため、内容は全て **判断** です。ただし内容そのものは、
以下の公式フレームワークが示す考え方と矛盾しないことを WebFetch/WebSearch で確認済みです。

| 項目                                                                   | 根拠 / 照合結果                                                                                                                                                                                                                                                                                                                             |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 重大度順（P0〜P4）にゲート判定し、上位を優先する構造                   | [ISTQB Glossary — Risk-Based Testing](https://istqb-glossary.page/risk-based-testing/)、[ISO/IEC/IEEE 29119-1:2022](https://www.iso.org/obp/ui/en/#!iso:std:81291:en) — リスクベーステストは重大度・確率でテストの優先順位を決める公式アプローチ                                                                                            |
| P0（人命・認可回避・他テナント漏洩・秘密情報・データ破壊）を最優先     | [OWASP Risk Rating Methodology](https://owasp.org/www-community/OWASP_Risk_Rating_Methodology) — Impact × Likelihood で算出し、深刻度の高い順に対応する手法と整合                                                                                                                                                                           |
| 001〜080 ALL YES を必須リリース条件、081以降は実害があるものだけ       | [Entry and Exit Criteria in Software Testing (Baeldung)](https://www.baeldung.com/cs/testing-entry-exit-criteria)、[Software Quality Gates (testRigor)](https://testrigor.com/blog/software-quality-gates/) — 「欠陥ゼロの証明」ではなく「リスクを許容水準まで下げたら release してよい」という Quality Gate / Exit Criteria の考え方と一致 |
| YES 判定に自動テスト等の客観的根拠を必須とし「たぶん」「理論上」を禁止 | 上記 Exit Criteria 文献の「readiness の客観的な評価尺度」という記述と整合                                                                                                                                                                                                                                                                   |
| 最初の NO で停止し、それだけを直して再判定する運用                     | 特定の公式標準には無い。トヨタ生産方式の Andon／stop-the-line と同型の設計思想で、ISTQB/ISO 29119 が求める水準より厳格。AI エージェントの無限修正ループを防ぐための独自の追加制約として意図的に採用                                                                                                                                         |
| 発見した下位項目を先回りして直さない（Scope Rule）                     | 公式典拠なし。WIP 制限（Kanban）的な「一度に一つ」の運用規律に近い独自ルール                                                                                                                                                                                                                                                                |
| 過剰な将来対応・抽象化・カバレッジ100%化の禁止（修正禁止ルール）       | ソフトウェア工学で広く確立された YAGNI・gold plating 回避の原則と整合。特定の標準機関の文書ではない                                                                                                                                                                                                                                         |

`@` import していない理由は「1. 指示ファイルの構成」の「200 行以内を目安にする」と同じで、
毎セッション読み込むとコンテキストを消費し、指示の遵守率が下がるためです。テストで問題を
見つけたときに、必要な範囲だけ開いて使う想定です。

| 項目                                                                     | 区分     | 根拠 / 理由                                                                                                                                                                                  |
| ------------------------------------------------------------------------ | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Gate 番号（001〜100）はコードブロックで固定し、Markdown のリストにしない | **判断** | Prettier は順序付きリスト（`1. 2. 3.`）を自動で振り直す。ゼロ埋め ID を `1. 2. 3.` 形式で書いたところ、Prettier に剥がされて `FAILED_GATE: 003` 等の参照と対応しなくなるバグを実装時に作った |

## 8. 調査の範囲と限界

`AGENTS.md` の構成は、以下のページを WebFetch で取得し原文を読んだうえで決めています。

memory / permissions / permission-modes / sandboxing / claude-directory / settings-reference /
best-practices / hooks / skills / sub-agents / mcp / plugins / discover-plugins / output-styles /
statusline / commands / large-codebases / github-actions / code-review / security-guidance /
cloud-environments / web-quickstart / worktrees / devcontainer

**`settings` のページだけは全文を読めていません**（サイズ超過のため先頭のみ）。設定キーの一覧は
`settings-reference` の索引表を根拠にしています。
