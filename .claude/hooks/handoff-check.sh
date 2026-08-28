#!/usr/bin/env bash
# Stop: 未記録の変更が残ったままセッションを終わらせないための関門。
#
# 「セッション終了時にモデルに引継ぎを書かせる」手段は公式に存在しない。
# SessionEnd はモデルを呼べず、予算も 1.5 秒しかないため。
# 代わりに Stop（ターン終了）で1セッションに1回だけ差し戻す。
# https://code.claude.com/docs/en/hooks
#
# 発火条件（すべて満たしたときだけ）:
#   1. git リポジトリである
#   2. 作業ツリーに変更がある
#   3. このセッションでまだ差し戻していない
#
# 2回目以降は差し戻さない。毎ターン止めると作業にならないため。

set -uo pipefail

event=$(cat)

cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
git rev-parse --git-dir >/dev/null 2>&1 || exit 0

# 変更が無ければ引き継ぐことも無い
[ -n "$(git status --porcelain 2>/dev/null)" ] || exit 0

session_id=$(
  printf '%s' "$event" | node -e '
    let s = "";
    process.stdin.on("data", (d) => (s += d));
    process.stdin.on("end", () => {
      try {
        const id = JSON.parse(s)?.session_id ?? "";
        process.stdout.write(String(id).replace(/[^A-Za-z0-9_-]/g, ""));
      } catch {
        process.stdout.write("");
      }
    });
  ' 2>/dev/null
) || exit 0

[ -n "$session_id" ] || exit 0

marker=".claude/.handoff-state/${session_id}"
[ -e "$marker" ] && exit 0

mkdir -p .claude/.handoff-state || exit 0
: >"$marker" || exit 0

cat >&2 <<'MSG'
このセッションの引継ぎがまだ記録されていません。docs/handoff.md を更新してください。

次の4項目を、次のセッションが「これだけ読めば再開できる」水準で書いてください。

1. いま何をしているか（目的と、どこまで進んだか）
2. 完了したこと（変更したファイル、出した PR、通した検証）
3. 次にやること（具体的な次の一手。判断待ちがあれば何を待っているか）
4. 注意点（踏んだ落とし穴、未解決の問題、試して駄目だった方法）

書いたら docs/handoff.md をコミットしてください。コミットしないと次のセッションに残りません。
この差し戻しは1セッションに1回だけです。
MSG

exit 2
