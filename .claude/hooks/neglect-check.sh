#!/usr/bin/env bash
# Stop: docs/test-policy.md の Gate に触れたのに、放置台帳へ書かないまま
# 作業を続けるのを止めるための関門。設計は docs/decisions.md「18.」。
#
# docs/neglected-log.md は導入以来エントリ0件だった。書かなくても CI は緑で
# /checkout も通る——書かないことに何のペナルティも無い構造だったため。
#
# 会話の意味は判定しない。LLM を呼ばず、語の有無だけを見る。
# 誤検出は許容する。書かない放置より、たまに余計に聞かれるほうが安い。
#
# **これは書き忘れの最終検出であって、安全装置ではない。** 会話に語が現れなければ素通りする
# （書いたつもりの言葉を使わなければ検出されない）。台帳を埋める本体は
# `pnpm run gate:record`（記録を1コマンドにして、書く側の手数を減らすほう）。
#
# 引数に --check を渡すと、差し戻しメッセージを出さずに判定結果だけを返す
# （0 = 書き漏らしている / 1 = 問題なし）。handoff-check.sh から呼ばれる。

set -uo pipefail

check_only=0
[ "${1:-}" = "--check" ] && check_only=1

event=$(cat)

json_field() {
  printf '%s' "$event" | node -e '
    const field = process.argv[1];
    let s = "";
    process.stdin.on("data", (d) => (s += d));
    process.stdin.on("end", () => {
      try {
        process.stdout.write(String(JSON.parse(s)?.[field] ?? ""));
      } catch {
        process.stdout.write("");
      }
    });
  ' "$1" 2>/dev/null
}

# worktree に入っていても ${CLAUDE_PROJECT_DIR} はメインのチェックアウトを指したままなので、
# 標準入力 JSON の cwd を優先する。
cwd=$(json_field cwd) || exit 0
cd "${cwd:-${CLAUDE_PROJECT_DIR:-.}}" || exit 0
git rev-parse --git-dir >/dev/null 2>&1 || exit 0

ledger="docs/neglected-log.md"
[ -f "$ledger" ] || exit 0

# この作業で台帳に追記があれば、書き漏らしではない。手がかりは3つ。
#
# 1. 作業ツリーに未コミットの追記がある
# 2. 既定ブランチとの差分に台帳が入っている
# 3. このコンテナで `pnpm run gate:record` が実行された痕跡がある
#
# 3 が要るのは、**クラウドセッションのクローンに `origin/main` が無い**ため。
# 以前は基準を取れないと `HEAD` にフォールバックしていたが、それは「コミット済みの
# 変更は常に差分なし」を意味し、判定が空振りして**必ず誤検出**していた（実際に踏んだ）。
# 基準が取れないときは、書いた側が残す痕跡のほうを見る。

# 未コミットの追記
if ! git diff --quiet -- "$ledger" 2>/dev/null; then
  exit 1
fi

# gate:record を通した痕跡（gitignore 済み。コンテナに閉じる）
[ -e ".claude/.handoff-state/gate-recorded" ] && exit 1

# 既定ブランチとの差分。取れないときは比較しない（無理に HEAD で代用しない）
base=""
for candidate in origin/main origin/master; do
  if git rev-parse --verify --quiet "$candidate" >/dev/null 2>&1; then
    base="$candidate"
    break
  fi
done
if [ -n "$base" ] && ! git diff --quiet "$base" -- "$ledger" 2>/dev/null; then
  exit 1
fi

transcript=$(json_field transcript_path) || exit 0
[ -n "$transcript" ] && [ -f "$transcript" ] || exit 1

# Gate に触れた手がかり。081〜100 は Backlog Rule の対象範囲。
signals='FAILED_GATE|BACKLOG|IGNORE|見送|後回し|今回は直さない|バックログ|Gate 0[89][0-9]|Gate 100'
grep -qE "$signals" "$transcript" 2>/dev/null || exit 1

[ "$check_only" -eq 1 ] && exit 0

# 差し戻しは1セッションに1回だけ。毎ターン止めると作業にならない。
session_id=$(json_field session_id | tr -cd 'A-Za-z0-9_-') || exit 0
[ -n "$session_id" ] || exit 0

marker=".claude/.handoff-state/neglect-${session_id}"
[ -e "$marker" ] && exit 0
mkdir -p .claude/.handoff-state || exit 0
: >"$marker" || exit 0

cat >&2 <<'MSG'
このセッションで docs/test-policy.md の Gate に触れた形跡がありますが、
docs/neglected-log.md に何も書かれていません。

「触れたが破らなかった」（ヒヤリハット）なら、いま書いてください。次の3点だけで足ります。

- 日時
- 触れた Gate 番号・カテゴリ（例: 023 データ整合性）
- 対象箇所（ファイル・機能）

理由は書かなくて構いません。読み手が実際にその箇所へ確認しに行けることが目的です。

Gate に触れていない（言葉が偶然一致しただけ）なら、そのまま続けて構いません。
この差し戻しは1セッションに1回だけです。
MSG

exit 2
