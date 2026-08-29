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

ユーザーから外部評価（総合84〜88/100、Claude Code 中心運用を前提とした再評価）を受けて出た
3件の改善提案に、このセッションで対応した。未マージの PR とオープンな作業はありません。

claim 1（worktree hook）は `EnterWorktree` で実際に worktree に入り end-to-end 検証済み。
その過程で `typecheck.sh` の追加バグ（後述）が見つかり、修正済み。

ただし **完全に完成したわけではない**。claim 2（Ruleset）は未確認のまま `[曖昧]` で止まっている。

## 完了したこと

PR #1〜#15 をすべてマージ済み。今回のセッションで進めたのは PR #14〜#15、および3提案への対応。

- **提案1（worktree hook の `cwd` 問題）** — 事実確認したところバグだった。4つの hook
  スクリプト（`format.sh` / `typecheck.sh` / `handoff-check.sh` / `handoff-stamp.sh`）が
  全て `${CLAUDE_PROJECT_DIR}` に `cd` しており、`AGENTS.md` 自身が書いていた「worktree では
  標準入力 JSON の `cwd` を読む」を実装していなかった。**PR #15 で修正・マージ済み**
- **E2E 検証** — `EnterWorktree` で実際に worktree に入り、`.ts` を編集して PostToolUse hook
  を実地に発火させて確認した。`format.sh` は正常動作。`typecheck.sh` は worktree に
  `node_modules` が無いために黙って no-op になる**追加バグ**が発覚（cwd 直下しか見ていなかった。
  `pnpm run typecheck` 自体は祖先ディレクトリの `node_modules` を辿って解決できるのに、
  ガード側がそれを考慮していなかった）。cwd から祖先ディレクトリを辿って `node_modules` を
  探すよう修正し、worktree 内でわざと型エラーを仕込んで hook が正しく検出することを再確認した
  （PR #18 でマージ済み）。続けて `handoff-check.sh`（Stop フック）も、worktree を意図的に
  dirty にしてターンを終え、実際の Stop フック発火で検証した。マーカーファイルが worktree 自身の
  `.claude/.handoff-state/` に作られ、`${CLAUDE_PROJECT_DIR}`（メインチェックアウト）ではなく
  `cwd` に対して正しく動くことを確認した。`handoff-stamp.sh`（SessionEnd）だけは、実際に
  セッションを終了させないと発火させられないため、サンプル JSON の手動テストのみで確認済み
- **提案2（GitHub Ruleset）** — API から直接読む手段が無い（`gh` CLI 非搭載、ruleset 取得
  ツールなし、`curl` は deny 済み）。間接証拠として、このセッションで出した PR #10〜#15 は
  全て `merge_pull_request` がレビュー承認待ちで弾かれず通っている。レビュー必須なら失敗する
  はずなので、**現状すでに「レビュー承認0人」相当である可能性が高い**が断定はできない。
  `[曖昧]` — ユーザーが GitHub の Settings → Rules → Rulesets 画面で確認すれば確定する
- **提案3（handoff の main 強制マージ方針）** — ユーザーと合意し、方針を修正した。
  「main へ必ずマージするのは引継ぎ文であり、実際のコード変更は未完了なら push 済みの
  branch/worktree に残してよい」という形に変更。理由: push 済みのコミットは origin に残るため
  消えない（消えるのは push していないコミットだけ）。次セッションが自動で読むのは main の
  `docs/handoff.md` だけなので、必須なのは引継ぎ文が main に載ることであり、worktree 越しの
  継続開発を妨げるべきではない。`AGENTS.md`・`docs/handoff.md` 前文・`docs/decisions.md`・
  `.claude/skills/checkout/SKILL.md` を書き換えた（このコミットで main にマージ）
- **PR #14** — 上記3提案を引継ぎに記録（このセッションの前段）

## 次にやること

1. **`Use this template` で新規リポジトリを1本作り、実地検証する。**（PR #13 時点から
   積み残していたタスク。まだ未着手）確認する項目:
   - `pnpm install` → `pnpm run check` → `pnpm run build` が通る
   - `/context` で `CLAUDE.md` が Memory files に出る（`@AGENTS.md` と `@docs/handoff.md` が展開される）
   - `.ts` を編集すると Prettier と `tsc` のフックが走る
   - workspace trust を承認する前後で `permissions.allow` の効き方が変わる
   - worktree hook の E2E 検証はこのセッションで実施済みなので、ここでは再確認不要
2. 提案2（Ruleset）は `[曖昧]` のままなので、ユーザーが GitHub UI で実際の設定
   （Require pull request / 必須レビュー人数 / Require status checks）を確認し、`AGENTS.md` の
   記述と食い違いがあれば知らせてほしい
3. `handoff-stamp.sh`（SessionEnd）の worktree での動作は、JSON を直接パイプした手動テストの
   みで確認済み。実際にセッションを終了させないと harness 経由では発火させられないため、
   これ以上の実地検証は次にセッションを終える際に自然に行われる（優先度は低い。ロジックは
   `handoff-check.sh` と同型で、こちらは既に harness 経由で検証済み）

## 注意点

- **`.claude/` 配下は「保護パス」で、`permissions.allow` では事前承認できない。**
  公式ドキュメント（permission-modes の Protected paths 節）に明記。`Edit(.claude/**)` を
  allow に入れても効果がなく、`.claude/settings.json` の編集は毎回確認を求められる。
  止めるレバーは `bypassPermissions` モードのみ（deny ルールも含め全プロンプトを止める）。
  `.claude/settings.local.json`（gitignore 済み）に書いても、次セッションのコンテナには残らず、
  テンプレにも伝播しない。ユーザーはこれを理解した上で **採用しないことを選択済み**
- **CI のジョブ名 `check` は Ruleset の必須チェック名と一致している。** 改名すると必須チェックが
  外れて PR がマージ不能になる。改名するなら Ruleset の Require status checks も同時に更新する
- **`main` への直接 push は Ruleset で禁止されている。** 作業はブランチと PR 経由
- **`Bash(rm *)` と `Bash(git reset --hard *)` が deny されている。** ファイル削除は `git clean`
  や `git rm`、ブランチ同期は `git merge --ff-only` を使う
- **`permissions.allow` に広いパターン（`Bash(git branch *)` など）を足すときは、
  その中に破壊的な部分集合が混じっていないか確認すること。** PR #11 の原因はこれ
- **hook のロジックを「サンプル JSON を手動でパイプする」テストだけで済ませない。**
  `typecheck.sh` の `node_modules` チェックは、手動テストでは常にメインチェックアウトから
  実行していたため見逃していた。`EnterWorktree` で実際に worktree に入って初めて発覚した
- **`main` へ必ずマージするのは「引継ぎ文」であり、コード全体ではない。** 未完了のコード変更は
  push 済みの branch/worktree に残してよい（提案3、このセッションで方針化・実装済み）。
  push 済みのコミットは origin に残るため消えない。消えるのは push していないコミットだけ
- **セッション終了時にモデルへ引継ぎを書かせる公式手段は存在しない。** `SessionEnd` はモデルを
  呼べず予算も 1.5 秒、`Stop` はターン単位でしか発火しない。確実なのは `/checkout` の明示実行
- **`.claude/` 配下は Codex から見えない。** 両ツールで守らせたい内容は `AGENTS.md` に書く
- 公式の `settings` ページだけは全文を読めていない（サイズ超過）。設定キーの一覧は
  `settings-reference` の索引表が根拠（`docs/decisions.md` の「7. 調査の範囲と限界」に記載）

<!-- session-end-stamp -->

## セッション終了時点の状態（自動記録）

- 記録時刻: 2026-08-29 02:20 UTC
- ブランチ: `main`
- HEAD: `bbaa4ef`
- 未コミットの変更: なし
