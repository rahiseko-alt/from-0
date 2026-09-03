# 引継ぎ

セッションをまたいで作業を継続するための文書です。役割は**「次にどの branch を見ればいいか」の
ポインタ**に限ります。branch 固有の詳細（何が途中か、次に何をするか）はその branch 自身の
コミットや開いてある PR の本文に書き、ここには短いポインタだけを置いてください。恒久的な
リポジトリのルールもここには書きません（`AGENTS.md`・`docs/decisions.md` を参照）。

同時に複数 branch が進行中の場合は、「次にやること」に branch ごと1エントリで列挙してください。
この雛形は複数 branch の並行開発を想定した状態管理は持っていません。本格的に必要になったら
`docs/decisions.md`「3-b. セッション間の引継ぎ」を読んでから設計し直してください。

- `AGENTS.md` がこのファイルを `@` で import しているため、セッション開始時に自動で読み込まれます
- 未記録の変更が残っていると、`.claude/hooks/handoff-check.sh` が1セッションに1回だけ更新を求めます
- 作業開始時は `/checkin`、区切りでは `/handoff`、終了時は `/checkout` を実行してください
- **進み具合と工程はここに書きません。** `pnpm run plan:progress` と `pnpm run plan:state` が
  数えて出すので、書くと必ず古くなります

**このファイル（引継ぎ文）を更新したら、必ず `main` へマージしてください。** 次のセッションは
`main` を新規クローンし、この docs/handoff.md しか自動では読みません。実際のコード変更は、
未完了なら push 済みの branch/worktree に残したままで構いません（push していれば origin に
残るため消えません）。

---

## いま何をしているか

**外部レビュー報告（`from0reviewreport.md` 改訂版 v2）への対応を実装した。**
ブランチ `claude/needs-attention-sf1cos` に載っている。

報告の骨子は「流れは文書として存在するが、**部品同士が状態機械として接続されていない**」。
指摘17件をソースと突き合わせ、Phase 0〜3 をすべて実装した。対応表は
`docs/decisions.md`「28.」にある。

## 完了したこと

`pnpm run check` 通過（115テスト・2スキップ）、`pnpm run build` 通過。

### 雛形として始まるようにした（報告 C1）

- **`docs/plan.json` を雛形から外した** → `docs/history/plan.from-0.json` へ退避。
  同梱されていると複製直後に `/plan-init` が拒否され、工程が始まらなかった
- `src/plan.file.test.ts` が「**同梱されていないこと**」を検査する
- `docs/history/README.md` に、旧スキーマとの対応表を置いた

### 信号と実態を一致させた

- **`status` を6値に**（`todo` / `in_progress` / `awaiting_human` / `blocked` / `verified` /
  `dropped`）。`done` は廃止。**依存を満たすのは `verified` だけ**、分母から `dropped` を外す
- **`automation` → `verifyBy`**（`ci` / `agent` / `human`）。`ci` は `verifyCommand` が必須
- `plan:progress` が取り下げ件数と、残りの担い手別内訳を出す

### 計画を制御装置にした

- `pnpm run plan:state` — 工程を1つに決める（`src/plan-state.ts`）。**SessionStart フックが
  結果を差し込む**ので、`/checkin` を手で打つ前に現在地が分かる
- `pnpm run plan:doctor` — 循環依存・取り下げへの依存・行き止まり・**消えた番号**を検出
- `plan:next` が5値を返す（`READY` / `WAITING_HUMAN` / `BLOCKED` / `BROKEN` / `COMPLETED`）
- `pnpm run plan:start <id>` ＋ `scope-guard.sh` で**作業範囲を固定**
- 不変制約を **`id` のみ**に縮小（他の欄は現実に合わせて更新可）

### 検証を実態に接続した

- **`adversary` サブエージェントを新設**（`.claude/agents/adversary.md`）。壊すことだけをする
- `pnpm run plan:verdict` ＋ `verified-guard.sh` で、**記録の無い `verified` を止める**
- `handoff-check.sh` の判定を「未コミット **または** 引継ぎ更新後のコミット」に変更
  （コミットしてしまえば素通りする穴を塞いだ）
- `handoff-stamp.sh` の書き先を `.claude/.session-end.md` へ格下げ。
  **`docs/handoff.md` の末尾を切り落とす事故が構造的に消えた**

### 完成後〜公開までをつないだ

- `docs/release-review.json` ＋ `pnpm run release:check`。PASS は証拠必須、
  **判定漏れは UNKNOWN 扱いで公開不可**
- `/release`（通し）、`/release-review`（製品全体）、`/issue-triage`（1件）に分離
- `pnpm run gate:record` で放置台帳を1コマンドで書けるようにした

### 並列を凍結した

`canRunInParallel` が共有資源を見ていないため。`plan:parallel` は凍結の断りを先に出す。
解除条件は `AGENTS.md`「並列で進める」に明記した。

### 実地で発火を確認した

`scope-guard.sh`（3ケース）、`verified-guard.sh`（5ケース）、`plan:state` の自動遷移、
`plan:doctor` / `release:check` の `exit 1`。詳細は `docs/decisions.md`「28.」の表。

**`scope-guard.sh` は模擬ではない発火も観測した。** 検証用の `.claude/.session-state.json` を
消し忘れたまま `docs/decisions.md` を編集しようとして、実際に止められた。

## 次にやること

**レビュー報告 6章の「最終受入テスト」20点を、実際に1周させる。** これが唯一の残件。

Use this template で新しいリポジトリを作り、`/plan-init` から `/release` まで通します。
**1周成功するまで、この雛形を「完成した開発システム」として扱わないこと。**

特に確かめる価値が高いのは次の4点です（机上では通っているが、実地は未経験）。

1. `/plan-init` 直後に `plan:state` が `READY` を返し、SessionStart で自動提示されるか
2. `scope-guard.sh` が、**実際の開発の流れの中で**邪魔にならない粒度か
   （`files` の更新が頻繁すぎると、関門が形骸化する）
3. `adversary` が「破れなかった」を返すだけの置物にならないか
4. `verify` の書き方が、30項目目でも崩れずに保てるか

## 注意点

**恒久的なリポジトリのルールはここに書かない。** `AGENTS.md`（指示）と `docs/decisions.md`
（根拠）を参照する。ここに書くのは、セッションをまたいで再発しうる作業上の落とし穴だけ。

- **`.claude/.session-state.json` を消し忘れると、次のセッションで関係ないファイルが
  編集できなくなる。** 解除は `pnpm run plan:stop`。`/checkout` の手順に入れてある
- **`rm` は `permissions.deny` で禁止されている。** ファイルを消す必要があるときは
  それ用のコマンド（`plan:stop` など）を使うか、スクラッチディレクトリで作業する
- **`node -e` の中でトップレベル `return` は書けない**（`SyntaxError: Illegal return
statement`）。フックで早期リターンしたいときは関数で包む。実際に `scope-guard.sh` で踏んだ
- **フックの検証はスクラッチにレイアウトを作って行う。** リポジトリ直下に検証用の
  `docs/plan.json` を置くと、`plan.file.test.ts`（同梱していないことの検査）が落ちる
- **`docs/history/plan.from-0.json` は旧スキーマのまま。直さないこと。** 当時そう書いたという
  記録に価値がある。検証の対象外
- **`done` が「要件の取り下げ」を意味していた項目が3件あった**（`T019` `T020` `T006`）。
  新しい `dropped` はこれを分母から外す。旧計画の完了率をそのまま信用しないこと
- **「動いた」と「届いた」は別物。** 実行の成否は API で確認できるが、通知が人の手元に
  届いたかは人に聞くしかない
- **PR をスカッシュでマージするとリモートのブランチが自動削除される。** そのまま
  `--force-with-lease` すると `stale info` で失敗する。`git fetch --prune` してから通常の push
- **`git push` がプロキシの 503 で失敗することがある。** 指数バックオフで数回リトライする
- 公式の `settings` ページだけは全文を読めていない（サイズ超過）

### 以前からの積み残し

- GitHub Ruleset の実態は `[曖昧]`。ユーザーが Settings → Rules → Rulesets で確認してほしい
