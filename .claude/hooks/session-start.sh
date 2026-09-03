#!/usr/bin/env bash
# SessionStart: いまどの工程にいるかを、セッションの冒頭に差し込む。
#
# 「今どのフェーズか」を判定する中央の制御が無く、AI が毎回それを思い出す前提になっていた。
# 思い出せないと、最後の項目が終わった時点で「次は何をしますか」と止まる。
# additionalContext で差し込めば、/checkin を手で打つ前に現在地が分かる。
# https://code.claude.com/docs/en/hooks
#
# 失敗はすべて黙って無視する。セッションの立ち上がりを妨げないため。

set -uo pipefail

event=$(cat)

cwd=$(
  printf '%s' "$event" | node -e '
    let s = "";
    process.stdin.on("data", (d) => (s += d));
    process.stdin.on("end", () => {
      try {
        process.stdout.write(JSON.parse(s)?.cwd ?? "");
      } catch {
        process.stdout.write("");
      }
    });
  '
) || exit 0

cd "${cwd:-${CLAUDE_PROJECT_DIR:-.}}" || exit 0
[ -f package.json ] || exit 0

state=$(pnpm run --silent plan:state 2>/dev/null) || exit 0
[ -n "$state" ] || exit 0

# 作業範囲が固定されたままセッションが変わることがある。範囲も一緒に見せる。
scope=""
if [ -f .claude/.session-state.json ]; then
  scope=$(
    node -e '
      const { readFileSync } = require("node:fs");
      try {
        const s = JSON.parse(readFileSync(".claude/.session-state.json", "utf8"));
        if (typeof s?.activeItem === "string") {
          process.stdout.write(
            "\n\n作業範囲が " + s.activeItem + " に固定されています。触ってよいファイル: " +
              (Array.isArray(s.files) ? s.files.join(", ") : "") +
              "\n別の項目に移るときは pnpm run plan:start <id>、解除は pnpm run plan:stop です。",
          );
        }
      } catch {
        /* 壊れていれば何も出さない */
      }
    ' 2>/dev/null
  ) || scope=""
fi

STATE="$state" SCOPE="$scope" node -e '
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "SessionStart",
        additionalContext:
          "このリポジトリの現在地（pnpm run plan:state の結果）:\n\n" +
          process.env.STATE +
          (process.env.SCOPE || ""),
      },
    }),
  );
' 2>/dev/null

exit 0
