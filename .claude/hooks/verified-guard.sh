#!/usr/bin/env bash
# PreToolUse(Edit|Write): 独立した検証を受けていない項目を verified にするのを止める。
#
# 「作った本人が完了を判定しない」は指示として書かれていたが、実際には作った本人が
# status を書き換えられた。判定役を呼んだ証拠（.claude/.verdict/<id>.json）が無いかぎり
# `verified` への書き換えを通さない。
#
# 判定は素朴に行う。docs/plan.json への編集内容に "verified" が含まれていたら、
# 同じ編集内容に現れる項目 id を全て取り出し、それぞれの記録を確かめる。
# 誤検出（既に verified の行を含む大きな書き換え）は起こりうるが、そのときは
# 記録が既にあるので通る。**記録が無いまま verified を書く**場合だけが止まる。

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

missing=$(
  printf '%s' "$event" | node -e '
    const { existsSync, readFileSync } = require("node:fs");

    let s = "";
    process.stdin.on("data", (d) => (s += d));
    process.stdin.on("end", () => {
      let input;
      try {
        input = JSON.parse(s);
      } catch {
        return;
      }
      const file = input?.tool_input?.file_path ?? "";
      if (!/docs\/plan\.json$/.test(file)) return;

      // 書き込もうとしている中身。Edit なら new_string、Write なら content。
      const payload = String(input?.tool_input?.new_string ?? input?.tool_input?.content ?? "");
      if (!payload.includes("verified")) return;

      const ids = [...new Set(payload.match(/T\d{3,}/g) ?? [])];
      if (ids.length === 0) return;

      // 人が実物を見るしかない項目は、壊す役を省く（その層は人間が担当する）。
      let humanIds = new Set();
      try {
        const plan = JSON.parse(readFileSync("docs/plan.json", "utf8"));
        for (const item of plan.items ?? []) {
          if (item?.verifyBy === "human") humanIds.add(item.id);
        }
      } catch {
        /* 読めなければ全項目に壊す役を求める */
      }

      const problems = [];
      for (const id of ids) {
        const path = ".claude/.verdict/" + id + ".json";
        if (!existsSync(path)) {
          problems.push(id + ": 判定の記録がありません");
          continue;
        }
        let record;
        try {
          record = JSON.parse(readFileSync(path, "utf8"));
        } catch {
          problems.push(id + ": 判定の記録が壊れています");
          continue;
        }
        if (record?.checker?.passed !== true) {
          problems.push(id + ": completion-checker が通していません");
        }
        if (!humanIds.has(id) && record?.adversary?.passed !== true) {
          problems.push(id + ": adversary が通していません");
        }
      }
      process.stdout.write(problems.join("\n"));
    });
  ' 2>/dev/null
) || exit 0

[ -n "$missing" ] || exit 0

{
  echo "独立した検証を受けていない項目を verified にしようとしています。編集を止めました。"
  echo
  printf '%s\n' "$missing" | sed 's/^/  - /'
  echo
  echo "順番はこうです。"
  echo
  echo "  1. completion-checker サブエージェントに verify の手順そのものを渡して判定を受ける"
  echo "  2. adversary サブエージェントに deliverable と verify を渡して壊させる"
  echo "  3. pnpm run plan:verdict <id> checker  passed|failed \"<証拠>\""
  echo "     pnpm run plan:verdict <id> adversary passed|failed \"<証拠>\""
  echo "  4. もう一度 status を verified にする"
  echo
  echo "通らなかった項目は verified にしないでください。直してから、もう一度判定を受けます。"
} >&2

exit 2
