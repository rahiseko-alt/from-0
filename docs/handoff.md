# 引継ぎ

セッションをまたいで作業を継続するための文書です。**このファイルだけ読めば再開できる**状態を保ってください。

- セッション開始時、`.claude/hooks/handoff-load.sh` がこの内容をコンテキストへ自動で注入します
- 未記録の変更が残っていると、`.claude/hooks/handoff-check.sh` が1セッションに1回だけ更新を求めます
- セッション終了時、`.claude/hooks/handoff-stamp.sh` が末尾に機械的な事実を追記します
- 明示的に更新したいときは `/handoff` を実行してください

更新したら**コミットしてください**。コミットしないと次のセッションに残りません。

---

## いま何をしているか

雛形の整備は完了済み。次の作業は未着手。

## 完了したこと

- `AGENTS.md` を正本とする指示ファイルの構成（`CLAUDE.md` は `@AGENTS.md` の import のみ）
- 権限・フック・CI・GitHub Ruleset の設定
- 判断の根拠を `docs/decisions.md` に分離

## 次にやること

- Use this template で新規リポジトリを1本作り、`pnpm install` → `pnpm run check` が通ることと、
  `/context` で `CLAUDE.md` が Memory files に出ることを確認する

## 注意点

- CI のジョブ名 `check` は Ruleset の必須チェック名と一致している。改名すると PR がマージ不能になる
- `main` への直接 push は Ruleset で禁止されている。作業はブランチと PR 経由で行う
