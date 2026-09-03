#!/usr/bin/env bash
# SessionEnd: セッション終了時点の事実を、**手元の診断用ファイル**に残す。
#
# 以前はこの内容を docs/handoff.md の末尾に直接書いていた。しかし SessionEnd の後に
# commit も push も行われないため、その追記は origin に届かない。届かない情報を
# 引継ぎ文（次のセッションが唯一自動で読むファイル）に混ぜると、
# 「書いてあるのに次のセッションからは見えない」という食い違いが生まれる。
# 実際、目印の文字列を本文に書いてしまって末尾が切り落とされる事故も起きた。
#
# そこで永続化は /checkout の責任（commit してマージするところまで）に一本化し、
# このフックは .claude/.session-end.md（gitignore 済み）への記録だけに格下げした。
# コンテナが残っている間の「さっきのセッションは何をどこまで持っていたか」を見るために使う。
# https://code.claude.com/docs/en/hooks

set -uo pipefail

event=$(cat)

# worktree に入っていても ${CLAUDE_PROJECT_DIR} はメインのチェックアウトを指したままなので、
# 標準入力 JSON の cwd（Claude が実際に作業しているディレクトリ）を優先する。
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
git rev-parse --git-dir >/dev/null 2>&1 || exit 0

branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "?")
head=$(git rev-parse --short HEAD 2>/dev/null || echo "?")
changed=$(git status --porcelain 2>/dev/null | head -20)
unpushed=$(git log --branches --not --remotes --oneline 2>/dev/null | head -20)
stamp=$(date -u '+%Y-%m-%d %H:%M UTC')

mkdir -p .claude 2>/dev/null || exit 0

{
  echo "# セッション終了時点の状態（自動記録・手元だけ）"
  echo
  echo "このファイルは origin に届きません。次のセッションへ渡したいことは docs/handoff.md に書き、"
  echo "/checkout で main へマージしてください。"
  echo
  echo "- 記録時刻: ${stamp}"
  echo "- ブランチ: \`${branch}\`"
  echo "- HEAD: \`${head}\`"
  if [ -n "$changed" ]; then
    echo "- 未コミットの変更:"
    echo
    echo '```'
    echo "$changed"
    echo '```'
  else
    echo "- 未コミットの変更: なし"
  fi
  if [ -n "$unpushed" ]; then
    echo "- push していないコミット:"
    echo
    echo '```'
    echo "$unpushed"
    echo '```'
  else
    echo "- push していないコミット: なし"
  fi
} >.claude/.session-end.md 2>/dev/null

exit 0
