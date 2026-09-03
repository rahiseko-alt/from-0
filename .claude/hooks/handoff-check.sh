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
#   2. 引継ぎが古い（未コミットの変更がある、または引継ぎを最後に更新した後で
#      このブランチ独自のコミットが積まれている）
#   3. このセッションでまだ差し戻していない
#
# 2 を「作業ツリーに変更があるか」だけで見ていた頃は、**コミットしてしまえば素通り**した。
# 引継ぎを書かずにコミットまで済ませるのが一番ありがちな抜け方なので、そこを塞いでいる。
#
# 2回目以降は差し戻さない。毎ターン止めると作業にならないため。

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

stale=""

# 未コミットの変更があれば、当然まだ引き継げていない。
[ -n "$(git status --porcelain 2>/dev/null)" ] && stale="yes"

# コミット済みでも、引継ぎを最後に更新した後にこのブランチ独自のコミットが積まれていれば古い。
# origin/main に既にあるコミットは数えない（main を眺めるだけのセッションで鳴らさないため）。
if [ -z "$stale" ]; then
  last=$(git log -1 --format=%H -- docs/handoff.md 2>/dev/null || true)
  if [ -n "$last" ]; then
    if git rev-parse --verify --quiet origin/main >/dev/null 2>&1; then
      newer=$(git rev-list --count "$last..HEAD" --not origin/main 2>/dev/null || echo 0)
    else
      newer=$(git rev-list --count "$last..HEAD" 2>/dev/null || echo 0)
    fi
    [ "${newer:-0}" -gt 0 ] && stale="yes"
  fi
fi

[ -n "$stale" ] || exit 0

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

# T023: 台帳に書かれないまま締めに進むのを、引継ぎの差し戻しと同じ場所で止める。
# 判定は neglect-check.sh に任せる（手がかりの正本を2箇所に置かないため）。
ledger_warning=""
if printf '%s' "$event" | "$(dirname "$0")/neglect-check.sh" --check; then
  ledger_warning="yes"
fi

cat >&2 <<'MSG'
このセッションの引継ぎがまだ記録されていません。docs/handoff.md を更新してください。

次の4項目を、次のセッションが「これだけ読めば再開できる」水準で書いてください。

1. いま何をしているか（目的と、どこまで進んだか）
2. 完了したこと（変更したファイル、出した PR、通した検証）
3. 次にやること（具体的な次の一手。判断待ちがあれば何を待っているか）
4. 注意点（踏んだ落とし穴、未解決の問題、試して駄目だった方法）

書いたら main へマージするところまで完了させてください（/checkout がその手順です）。

コミットしただけでは作業ブランチに留まります。セッションのコンテナは終了後に破棄され、
次のセッションは main を新規クローンするため、マージしていない引継ぎは失われます。
「PR を出した」で止めないでください。

この差し戻しは1セッションに1回だけです。
MSG

if [ -n "$ledger_warning" ]; then
  cat >&2 <<'MSG'

あわせて: docs/test-policy.md の Gate に触れた形跡がありますが、
docs/neglected-log.md に何も書かれていません。日時・触れた Gate 番号・対象箇所の3点を
書いてから締めてください（理由は不要です）。
MSG
fi

exit 2
