#!/usr/bin/env bash
# SessionStart: docs/handoff.md をセッションのコンテキストへ注入する。
#
# 公式仕様では SessionStart の stdout はそのままコンテキストに入るが、
# ここでは additionalContext を使い <session-handoff> タグで囲む。
# 引継ぎ文書と通常のファイル内容を混同させないため。
# https://code.claude.com/docs/en/hooks

set -uo pipefail

cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
[ -s docs/handoff.md ] || exit 0

node -e '
  const fs = require("fs");
  let text;
  try {
    text = fs.readFileSync("docs/handoff.md", "utf8").trim();
  } catch {
    process.exit(0);
  }
  if (!text) process.exit(0);

  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "SessionStart",
        additionalContext:
          "<session-handoff>\n" +
          text +
          "\n</session-handoff>\n\n" +
          "前回セッションからの引継ぎです。作業を始める前に内容を確認してください。" +
          "内容が現状と食い違う場合は、作業のなかで docs/handoff.md を更新してください。",
      },
    }),
  );
' 2>/dev/null

exit 0
