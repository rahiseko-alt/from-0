#!/usr/bin/env bash
# PreToolUse(Edit|Write): 作業中の項目が挙げていないファイルの編集を止める。
#
# 「1セッション1項目」「範囲外のファイルを触らない」は指示として書かれていたが、守らせる
# 装置が無かった。指示は助言、フックは決定論的（公式ドキュメントの区別）。
# https://code.claude.com/docs/en/hooks
#
# 関門が働くのは `.claude/.session-state.json` があるときだけ。無ければ素通りする
# （雛形をそのまま使う人や、計画を持たない作業の邪魔をしないため）。
#
# 範囲を広げたくなったら、**先に docs/plan.json の files を直してから**
# `pnpm run plan:start <id>` をもう一度実行する。この順番自体がレビュー可能な記録になる。

set -uo pipefail

event=$(cat)

json_field() {
  printf '%s' "$event" | node -e '
    const path = process.argv[1].split(".");
    let s = "";
    process.stdin.on("data", (d) => (s += d));
    process.stdin.on("end", () => {
      try {
        let v = JSON.parse(s);
        for (const key of path) v = v?.[key];
        process.stdout.write(typeof v === "string" ? v : "");
      } catch {
        process.stdout.write("");
      }
    });
  ' "$1" 2>/dev/null
}

cwd=$(json_field cwd) || exit 0
cd "${cwd:-${CLAUDE_PROJECT_DIR:-.}}" || exit 0

[ -f .claude/.session-state.json ] || exit 0

file_path=$(json_field tool_input.file_path) || exit 0
[ -n "$file_path" ] || exit 0

verdict=$(
  FILE_PATH="$file_path" node -e '
    const { readFileSync } = require("node:fs");
    const { relative, resolve } = require("node:path");

    // 判定の本体は src/session-state.ts。ここは dist を読まずに済ませたいので、
    // 同じ規則を最小限だけ写している（フックはビルド前でも動く必要がある）。
    const ALWAYS_ALLOWED = [
      "docs/plan.json",
      "docs/checkpoints.json",
      "docs/handoff.md",
      "docs/neglected-log.md",
      "docs/failure-action-log.md",
      "docs/release-review.json",
      ".claude/.session-state.json",
    ];

    // node -e の中でトップレベル return は書けない（SyntaxError: Illegal return statement）。
    // 早期リターンを使いたいので関数で包む。
    function judge() {
      let state;
      try {
        state = JSON.parse(readFileSync(".claude/.session-state.json", "utf8"));
      } catch {
        return "";
      }
      if (typeof state?.activeItem !== "string" || !Array.isArray(state.files)) return "";

      const rel = relative(process.cwd(), resolve(process.env.FILE_PATH));
      // リポジトリの外は関門の担当外。
      if (rel.startsWith("..")) return "";
      if (ALWAYS_ALLOWED.includes(rel)) return "";

      const allowed = state.files.some(
        (f) => f === rel || (typeof f === "string" && f.endsWith("/") && rel.startsWith(f)),
      );
      if (allowed) return "";

      return state.activeItem + "\t" + state.files.join(", ") + "\t" + rel;
    }

    process.stdout.write(judge());
  ' 2>/dev/null
) || exit 0

[ -n "$verdict" ] || exit 0

item=$(printf '%s' "$verdict" | cut -f1)
allowed=$(printf '%s' "$verdict" | cut -f2)
target=$(printf '%s' "$verdict" | cut -f3)

cat >&2 <<MSG
${target} は、いま作業中の ${item} の範囲外です。編集を止めました。

${item} が触ってよいファイル: ${allowed}

このファイルが本当に必要なら、順番はこうです。

  1. docs/plan.json の ${item} の files に ${target} を足す
  2. pnpm run plan:start ${item} を実行し直す
  3. もう一度編集する

必要でないなら、別の項目の作業です。いまのセッションでは扱わないでください。
MSG

exit 2
