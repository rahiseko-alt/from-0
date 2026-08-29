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

雛形の整備は完了済み。`main` は `4fb64cf`（PR #9 まで反映）。未マージの PR とオープンな
作業はありません。次の作業は未着手です。

## 完了したこと

PR #1〜#8 をすべてマージ済み。

- **指示ファイルの構成** — `AGENTS.md` が唯一の正本。`CLAUDE.md` は `@AGENTS.md` の import のみ。
  Codex は `AGENTS.md` を直読み、Claude Code は import 経由で同じ実体を読む
- **応答方針** — 既存資産の活用優先、迎合しない、`[曖昧]` タグ、非エンジニア向けの説明、
  報告は何をどうしたかだけ（`AGENTS.md` の「応答と作業の進め方」）
- **決定論的な強制** — `engine-strict` で Node バージョン、PostToolUse フックで Prettier と `tsc`、
  `permissions.deny` で秘密情報・`dist/`・ロックファイル、Ruleset で `main` 直 push と CI
- **CI** — `.github/workflows/ci.yml`。ジョブ名 `check` で `pnpm run check` と `pnpm run build`
- **引継ぎの仕組み** — 読み込みは `@docs/handoff.md` import、書き込みは Stop フックの差し戻しと
  SessionEnd の機械記録、操作は `/checkin` `/checkout` `/handoff` の3スキル
- **根拠の記録** — `docs/decisions.md` に、各項目を「公式」（出典 URL つき）と「判断」（理由と
  変更してよい条件つき）に区分して記載

GitHub 側は Ruleset・Template repository・Allow auto-merge・head ブランチ自動削除が有効。

## 次にやること

**Use this template で新規リポジトリを1本作り、実地検証する。** 確認する項目:

1. `pnpm install` → `pnpm run check` → `pnpm run build` が通る
2. `/context` で `CLAUDE.md` が Memory files に出る（`@AGENTS.md` と `@docs/handoff.md` が展開される）
3. `.ts` を編集すると Prettier と `tsc` のフックが走る
4. workspace trust を承認する前後で `permissions.allow` の効き方が変わる

雛形自体に未着手の課題はありません。

## 注意点

- **CI のジョブ名 `check` は Ruleset の必須チェック名と一致している。** 改名すると必須チェックが
  外れて PR がマージ不能になる。改名するなら Ruleset の Require status checks も同時に更新する
- **`main` への直接 push は Ruleset で禁止されている。** 作業はブランチと PR 経由
- **`Bash(rm *)` と `Bash(git reset --hard *)` が deny されている。** このセッションで実際に
  拒否された。ファイル削除は `git clean` や `git rm`、ブランチ同期は `git merge --ff-only` を使う
- **引継ぎは `main` にマージしないと失われる。** コンテナ破棄後、次のセッションは `main` を
  新規クローンするため、作業ブランチのコミットは残らない
- **セッション終了時にモデルへ引継ぎを書かせる公式手段は存在しない。** `SessionEnd` はモデルを
  呼べず予算も 1.5 秒、`Stop` はターン単位でしか発火しない。確実なのは `/checkout` の明示実行
- **`.claude/` 配下は Codex から見えない。** 両ツールで守らせたい内容は `AGENTS.md` に書く
- 公式の `settings` ページだけは全文を読めていない（サイズ超過）。設定キーの一覧は
  `settings-reference` の索引表が根拠（`docs/decisions.md` の「7. 調査の範囲と限界」に記載）

<!-- session-end-stamp -->

## セッション終了時点の状態（自動記録）

- 記録時刻: 2026-08-29 01:03 UTC
- ブランチ: `claude/checkin-67y0sw`
- HEAD: `eaa0d94`
- 未コミットの変更: なし
