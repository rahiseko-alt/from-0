#!/usr/bin/env bash
# TypeScript ファイルの編集後に、バックグラウンドで型検査を走らせる。
#
# AGENTS.md の「strict 前提・any を使わない」は助言にすぎず、守られる保証がない。
# tsc の結果をフックで差し戻すことで、型エラーは必ず次のターンで Claude に届く。
# 公式ドキュメント: https://code.claude.com/docs/en/hooks
#
# async: true で登録しているため Claude の作業を止めない。
# 成功時は何も出力しない（毎回の成功報告はコンテキストの無駄なため）。

set -uo pipefail

event=$(cat)

file_path=$(
  printf '%s' "$event" | node -e '
    let s = "";
    process.stdin.on("data", (d) => (s += d));
    process.stdin.on("end", () => {
      try {
        const input = JSON.parse(s);
        process.stdout.write(input?.tool_input?.file_path ?? "");
      } catch {
        process.stdout.write("");
      }
    });
  '
) || exit 0

[ -n "$file_path" ] || exit 0

case "$file_path" in
*.ts | *.tsx) ;;
*) exit 0 ;;
esac

cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0

# 依存が未インストールの場合は黙って抜ける（SessionStart フックが入れる）
[ -d node_modules ] || exit 0

if result=$(pnpm run typecheck 2>&1); then
  exit 0
fi

# 失敗時だけ additionalContext で Claude に差し戻す
printf '%s' "$result" | node -e '
  let s = "";
  process.stdin.on("data", (d) => (s += d));
  process.stdin.on("end", () => {
    process.stdout.write(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "PostToolUse",
          additionalContext:
            "型検査に失敗しました。修正してください:\n" + s.slice(-4000),
        },
      }),
    );
  });
'

exit 0
