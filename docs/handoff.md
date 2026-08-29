# 引継ぎ

セッションをまたいで作業を継続するための文書です。**このファイルだけ読めば再開できる**状態を保ってください。

- `AGENTS.md` がこのファイルを `@` で import しているため、セッション開始時に自動で読み込まれます
- 未記録の変更が残っていると、`.claude/hooks/handoff-check.sh` が1セッションに1回だけ更新を求めます
- セッション終了時、`.claude/hooks/handoff-stamp.sh` が末尾に機械的な事実を追記します
- 作業開始時は `/checkin`、区切りでは `/handoff`、終了時は `/checkout` を実行してください

**このファイル（引継ぎ文）を更新したら、必ず `main` へマージしてください。** 次のセッションは
`main` を新規クローンし、この docs/handoff.md しか自動では読みません。実際のコード変更は、
未完了なら push 済みの branch/worktree に残したままで構いません（push していれば origin に
残るため消えません）。その場合は「次にやること」に、どの branch を見ればよいか書いてください。

---

## いま何をしているか

雛形の整備は継続中。直近は `AGENTS.md` の分量削減に対応した。まだ commit / push / PR
していない（このコミットで行う）。

## 完了したこと

PR #1〜#23 をすべてマージ済み。うち主なもの:

- **worktree hook の修正**（PR #15, #18, #19）— 4つの hook（`format.sh` / `typecheck.sh` /
  `handoff-check.sh` / `handoff-stamp.sh`）が `${CLAUDE_PROJECT_DIR}`（メインチェックアウト）に
  固定されており、worktree では動かないバグを修正。`EnterWorktree` で実地検証し、
  `typecheck.sh` の `node_modules` 探索が cwd 直下しか見ておらず worktree で no-op になる
  追加バグも見つけて修正した
- **handoff の main マージ方針の見直し**（PR #16）— 「main へ必ずマージするのは引継ぎ文であり、
  実際のコード変更は未完了なら push 済みの branch/worktree に残してよい」に変更。
  push 済みのコミットは origin に残るため消えない
- **`docs/test-policy.md` の実装**（PR #22, #23）— ユーザー用意の TEST_POLICY.md（重大度ゲート
  方式のテスト判定手順）をそのまま実装。項目番号 001〜100 は Markdown の自動リスト整形で
  ズレるため、コードブロック（```text）で固定した。ISTQB・ISO/IEC/IEEE 29119・OWASP Risk
  Rating・Quality Gate/Exit Criteria と矛盾しないことを確認し `docs/decisions.md` の
  「7. テスト方針」に記録
- **`AGENTS.md` の分量削減**（今回、未 push）— 「説明過多で AGENTS.md の役割を超えている」との
  指摘を受け、[best-practices](https://code.claude.com/docs/en/best-practices) の Include /
  Exclude 表と「削ると挙動が変わるか」の基準で全面的に見直した。157行→86行。ディレクトリ一覧・
  設計理由・hooks の仕組み説明・Claude Code/Codex の読み込み機構の解説など、挙動を変えない
  記述を削除（README.md と decisions.md が元々カバーしていたので情報は失っていない）。
  ブランチ命名規則やコミット規約は公式の Include 項目（"Repository etiquette"）に該当するため
  残した。`docs/decisions.md`・`README.md` も整合するよう更新した

## 次にやること

1. **`Use this template` で新規リポジトリを1本作り、実地検証する。**（PR #13 時点からの
   積み残しタスク。まだ未着手）確認する項目:
   - `pnpm install` → `pnpm run check` → `pnpm run build` が通る
   - `/context` で `CLAUDE.md` が Memory files に出る
   - `.ts` を編集すると Prettier と `tsc` のフックが走る
   - workspace trust を承認する前後で `permissions.allow` の効き方が変わる
   - 削減後の `AGENTS.md` を実際に読み込ませ、`/context` のトークン数を確認する
2. GitHub Ruleset の実態は `[曖昧]` のまま。API から直接読む手段がなく、間接証拠（このセッションの
   PR がレビュー承認待ちで弾かれず通っている）から「レビュー承認0人相当」と推測しているだけ。
   ユーザーが GitHub の Settings → Rules → Rulesets 画面で確認し、`AGENTS.md` の記述と
   食い違いがあれば知らせてほしい
3. `handoff-stamp.sh`（SessionEnd）は実際にセッションを終了させないと harness 経由で発火
   させられない。手動 JSON テストのみで確認済み（ロジックは検証済みの `handoff-check.sh` と
   同型なので優先度は低い）

## 注意点

- **Prettier は Markdown の順序付きリスト（`1. 2. 3.`）を自動で振り直す。** ゼロ埋め ID
  （`001` 等）を他所から参照する文書では、リスト記法を使うと参照が壊れる。コードブロック
  （```text）で固定するか、リストにしないこと
- **`.claude/` 配下は「保護パス」で、`permissions.allow` では事前承認できない。**
  公式ドキュメント（permission-modes の Protected paths 節）に明記。止めるレバーは
  `bypassPermissions` モードのみ（deny ルールも含め全プロンプトを止める）。
  `.claude/settings.local.json`（gitignore 済み）に書いても次セッションには残らないため、
  ユーザーは採用を見送り済み
- **CI のジョブ名 `check` は Ruleset の必須チェック名と一致している。** 改名すると必須チェックが
  外れて PR がマージ不能になる
- **`main` への直接 push は Ruleset で禁止されている。** 作業はブランチと PR 経由
- **`Bash(rm *)` と `Bash(git reset --hard *)` が deny されている。** ファイル削除は `git clean`
  や `git rm`、ブランチ同期は `git merge --ff-only` を使う
- **`permissions.allow` に広いパターンを足すときは、破壊的な部分集合が混じっていないか
  確認すること。** `Bash(git branch *)` が `git branch -D` まで無確認で通してしまった件が原因
- **hook のロジックを「サンプル JSON を手動でパイプする」テストだけで済ませない。**
  `EnterWorktree` で実際に worktree に入って初めて発覚したバグがあった
- **セッション終了時にモデルへ引継ぎを書かせる公式手段は存在しない。** `SessionEnd` はモデルを
  呼べず予算も 1.5 秒、`Stop` はターン単位でしか発火しない。確実なのは `/checkout` の明示実行
- **`.claude/` 配下は Codex から見えない。** 両ツールで守らせたい内容は `AGENTS.md` に書く
- 公式の `settings` ページだけは全文を読めていない（サイズ超過）。設定キーの一覧は
  `settings-reference` の索引表が根拠（`docs/decisions.md` の「8. 調査の範囲と限界」に記載）

<!-- session-end-stamp -->

## セッション終了時点の状態（自動記録）

- 記録時刻: 2026-08-29 10:09 UTC
- ブランチ: `main`
- HEAD: `facb029`
- 未コミットの変更:

```
M docs/handoff.md
```
