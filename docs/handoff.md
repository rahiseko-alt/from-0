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

雛形の整備は完了済み。`main` は `850911a`（PR #12 まで反映）。未マージの PR とオープンな
作業はありません。次の作業は未着手です。

## 完了したこと

PR #1〜#12 をすべてマージ済み。今回のセッションで進めたのは PR #10〜#12。

- **PR #10** — 引継ぎに書かれていた `main` の SHA のずれ（`2320fe2` → 実際は `4fb64cf`）を修正。
  修正コミットの過程で `SessionEnd` フック（`handoff-stamp.sh`）が出力する行末空白が
  Prettier の `format:check` を落としていたことが分かり、フック自体も修正した
- **PR #11** — PR #10 で `permissions.allow` に追加した `Bash(git branch *)` が
  `git branch -d`/`-D`（削除）まで無確認で通してしまう問題を修正。allow を狭めるのではなく、
  `rm`/`git reset --hard` と同じ形で破壊的な部分集合だけを `permissions.deny` に追加した
  （deny は allow より優先されるため）
- **PR #12** — PR 監視で毎回確認を求められていた `mcp__Claude_Code_Remote__*`
  （`subscribe_pr_activity` / `unsubscribe_pr_activity` / `create_trigger` / `update_trigger` /
  `delete_trigger` / `fire_trigger` / `send_later`）を `permissions.allow` に追加。
  コードやリポジトリの状態を変更しないツールに限定した
- 検証は毎回 `pnpm run check`（format:check / typecheck / test）が通ることを確認済み

各 PR とも squash マージ。`docs/decisions.md` の「2. 権限」節に、今回追加した判断
（deny の優先順位、読み取り専用 git の allow、PR 監視ツールの allow）を理由つきで記載済み。

GitHub 側は Ruleset・Template repository・Allow auto-merge・head ブランチ自動削除が有効。

## 次にやること

**Use this template で新規リポジトリを1本作り、実地検証する。**（未着手のまま持ち越し） 確認する項目:

1. `pnpm install` → `pnpm run check` → `pnpm run build` が通る
2. `/context` で `CLAUDE.md` が Memory files に出る（`@AGENTS.md` と `@docs/handoff.md` が展開される）
3. `.ts` を編集すると Prettier と `tsc` のフックが走る
4. workspace trust を承認する前後で `permissions.allow` の効き方が変わる

雛形自体に未着手の課題はありません。

## 注意点

- **`.claude/` 配下は「保護パス」で、`permissions.allow` では事前承認できない。**
  公式ドキュメント（permission-modes の Protected paths 節）に明記。`Edit(.claude/**)` を
  allow に入れても効果がなく、`.claude/settings.json` の編集は毎回確認を求められる。
  これを止めるレバーは `bypassPermissions` モードのみ（deny ルールも含め全プロンプトを止める）。
  今回ユーザーに提案したが、**「テンプレにもリポジトリにも永続しない」ことを説明した上で見送った**
  （`.claude/settings.local.json` は gitignore 済みで、コンテナ破棄後は次セッションに残らない）
- **CI のジョブ名 `check` は Ruleset の必須チェック名と一致している。** 改名すると必須チェックが
  外れて PR がマージ不能になる。改名するなら Ruleset の Require status checks も同時に更新する
- **`main` への直接 push は Ruleset で禁止されている。** 作業はブランチと PR 経由
- **`Bash(rm *)` と `Bash(git reset --hard *)` が deny されている。** ファイル削除は `git clean`
  や `git rm`、ブランチ同期は `git merge --ff-only` を使う
- **`permissions.allow` に広いパターン（`Bash(git branch *)` など）を足すときは、
  その中に破壊的な部分集合が混じっていないか確認すること。** PR #11 の原因はこれ
- **引継ぎは `main` にマージしないと失われる。** コンテナ破棄後、次のセッションは `main` を
  新規クローンするため、作業ブランチのコミットは残らない
- **セッション終了時にモデルへ引継ぎを書かせる公式手段は存在しない。** `SessionEnd` はモデルを
  呼べず予算も 1.5 秒、`Stop` はターン単位でしか発火しない。確実なのは `/checkout` の明示実行
- **`.claude/` 配下は Codex から見えない。** 両ツールで守らせたい内容は `AGENTS.md` に書く
- 公式の `settings` ページだけは全文を読めていない（サイズ超過）。設定キーの一覧は
  `settings-reference` の索引表が根拠（`docs/decisions.md` の「7. 調査の範囲と限界」に記載）

<!-- session-end-stamp -->

## セッション終了時点の状態（自動記録）

- 記録時刻: 2026-08-29 01:57 UTC
- ブランチ: `main`
- HEAD: `850911a`
- 未コミットの変更: なし
