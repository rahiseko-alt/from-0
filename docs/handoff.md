# 引継ぎ

セッションをまたいで作業を継続するための文書です。役割は**「次にどの branch を見ればいいか」の
ポインタ**に限ります。branch 固有の詳細（何が途中か、次に何をするか）はその branch 自身の
コミットや開いてある PR の本文に書き、ここには短いポインタだけを置いてください。恒久的な
リポジトリのルールもここには書きません（`AGENTS.md`・`docs/decisions.md` を参照）。

同時に複数 branch が進行中の場合は、「次にやること」に branch ごと1エントリで列挙してください。
この雛形は複数 branch の並行開発を想定した状態管理は持っていません。本格的に必要になったら
`docs/decisions.md`「3-b. セッション間の引継ぎ」を読んでから設計し直してください。

- `AGENTS.md` がこのファイルを `@` で import しているため、セッション開始時に自動で読み込まれます
- 未記録の変更が残っていると、`.claude/hooks/handoff-check.sh` が1セッションに1回だけ更新を求めます
- セッション終了時、`.claude/hooks/handoff-stamp.sh` が末尾の状態を機械的に**上書き**します（追記ではない）
- 作業開始時は `/checkin`、区切りでは `/handoff`、終了時は `/checkout` を実行してください

**このファイル（引継ぎ文）を更新したら、必ず `main` へマージしてください。** 次のセッションは
`main` を新規クローンし、この docs/handoff.md しか自動では読みません。実際のコード変更は、
未完了なら push 済みの branch/worktree に残したままで構いません（push していれば origin に
残るため消えません）。

---

## いま何をしているか

雛形の整備は継続中。直近は、外部評価から「`main` 上の単一 `handoff.md` が複数 branch の並列
worktree 作業と両立しない」との指摘を受け、`handoff.md` の役割を「branch へのポインタ」に
絞る改修を行った。まだ commit / push / PR していない（このコミットで行う）。

## 完了したこと

PR #1〜#24 をすべてマージ済み。うち主なもの:

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
- **`AGENTS.md` の分量削減**（PR #24）— 「説明過多で AGENTS.md の役割を超えている」との
  指摘を受け、[best-practices](https://code.claude.com/docs/en/best-practices) の Include /
  Exclude 表と「削ると挙動が変わるか」の基準で全面的に見直した。157行→86行。ディレクトリ一覧・
  設計理由・hooks の仕組み説明・Claude Code/Codex の読み込み機構の解説など、挙動を変えない
  記述を削除（README.md と decisions.md が元々カバーしていたので情報は失っていない）。
  ブランチ命名規則やコミット規約は公式の Include 項目（"Repository etiquette"）に該当するため
  残した
- **`handoff.md` の役割を「branch へのポインタ」に絞る**（今回、未 push）— 外部評価の指摘。
  並列 worktree で複数 branch が同時進行すると、`main` 上の単一 `handoff.md` を互いの
  更新が上書きし合う。branch 固有の詳細はその branch 自身のコミット/PR に置く形に変え、
  同時進行時は「次にやること」に branch ごと列挙する運用にした。「注意点」に混入していた
  恒久的なリポジトリのルール（CI ジョブ名の制約、main 直 push 禁止、Codex から `.claude/`
  が見えない等）は `AGENTS.md`/`docs/decisions.md` 側に一本化し、ここからは削除した。
  `.claude/` が保護パスである事実は `docs/decisions.md`「2. 権限」に、Prettier のリスト
  自動整形の落とし穴は「7. テスト方針」に、それぞれ移設して記録した。根拠は
  `docs/decisions.md`「3-b. セッション間の引継ぎ」に記録。フル装備の Issue/Task 管理層
  （Goal→Issue→Branch→Worktree→Agent の階層構造）は、この雛形の「使わない仕組みを配らない」
  という方針と矛盾するため見送った

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

**恒久的なリポジトリのルールはここに書かない。** `AGENTS.md`（指示）と `docs/decisions.md`
（根拠）を参照する。ここに書くのは、セッションをまたいで再発しうる作業上の落とし穴だけ。

- **hook のロジックを「サンプル JSON を手動でパイプする」テストだけで済ませない。**
  `typecheck.sh` の `node_modules` 探索バグは、常にメインチェックアウトから手動テストしていた
  ため見逃していた。`EnterWorktree` で実際に worktree に入って初めて発覚した
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
