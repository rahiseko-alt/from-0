# 引継ぎ

セッションをまたいで作業を継続するための文書です。**このファイルだけ読めば再開できる**状態を保ってください。

- `AGENTS.md` がこのファイルを `@` で import しているため、セッション開始時に自動で読み込まれます
- 未記録の変更が残っていると、`.claude/hooks/handoff-check.sh` が1セッションに1回だけ更新を求めます
- セッション終了時、`.claude/hooks/handoff-stamp.sh` が末尾に機械的な事実を追記します
- 作業開始時は `/checkin`、区切りでは `/handoff`、終了時は `/checkout` を実行してください

更新したら **`main` へマージしてください**。コンテナは終了後に破棄され、次のセッションは
`main` を新規クローンするため、作業ブランチにコミットしただけでは失われます。

---

## いま何をしているか

雛形の整備は完了済み。`main` は `bbaa4ef`（PR #13 まで反映）。未マージの PR とオープンな
作業はありません。

直前に、ユーザーから外部評価（総合84〜88/100、Claude Code 中心運用を前提とした再評価）を受け取り、
3件の改善提案が出ている。**まだ事実確認・着手していない**：

1. worktree hook の `cwd` 問題（AGENTS.md の記述と実装が食い違っている疑い）
2. GitHub Ruleset を「PR 必須・レビュー承認0人・CI 必須」という実態に文書側を合わせる、または逆
3. handoff の「必ず main へマージ」方針を、worktree 越しの継続作業を許すよう緩めるか検討

## 完了したこと

PR #1〜#13 をすべてマージ済み。

- **PR #10〜#12**（詳細は git log 参照）— 引継ぎ SHA の修正、`git branch -d`/`-D` の deny 追加、
  PR 監視系 `mcp__Claude_Code_Remote__*` の allow 追加
- **PR #13** — 上記3件の引継ぎ記録
- **`bypassPermissions` モードの検討** — 「使い捨てコンテナだから危険操作のリスクは低い」という
  ユーザーの主張を受けて調査。`.claude/` 配下は公式に「保護パス」で `permissions.allow` では
  事前承認できないことを確認（`.claude/settings.local.json` に `defaultMode: bypassPermissions`
  を書く案を提示）。ただしこの案は **gitignore 済みのため次セッションのコンテナには残らず、
  テンプレにも伝播しない** ことを説明した上で、ユーザーが **見送りを選択**（採用しないこと自体が結論）

## 次にやること

上記「いま何をしているか」の3提案について、まず事実確認する。

1. `.claude/hooks/` の各スクリプトを開き、`${CLAUDE_PROJECT_DIR}` を使っている箇所と、
   worktree 対応のため標準入力 JSON の `cwd` を使うべき箇所を特定する
2. GitHub の Ruleset 設定（Require pull request、必須レビュー人数、Require status checks）を
   実際に確認し、`AGENTS.md` の記述（`main` 直 push 禁止・CI 必須）と一致しているか照合する
3. `docs/handoff.md` 冒頭の「更新したら main へマージしてください」という強制と、
   `.claude/skills/checkout` の運用を、未完了タスクを branch/worktree に残して次セッションへ
   渡すケースを許容する形に緩めるべきか、ユーザーと合意する

いずれも調査・設計判断が要るため、着手前にユーザーへ報告すること。

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
- **引継ぎは `main` にマージしないと失われる。** コンテナ破棄後、次のセッションは `main` を
  新規クローンするため、作業ブランチのコミットは残らない（この方針自体の見直しが上記提案3）
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
