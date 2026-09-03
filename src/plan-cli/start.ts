import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import type { Plan } from '../plan.js';
import { SESSION_STATE_PATH, type SessionState } from '../session-state.js';
import { isMain } from './is-main.js';
import { loadPlan, splitPlanPath } from './load-plan.js';

/**
 * 作業範囲を固定する（`pnpm run plan:start T011` / `pnpm run plan:stop`）。
 *
 * 計画の `files` をそのまま `.claude/.session-state.json` に写す。以降、そこに無いファイルの
 * 編集は `.claude/hooks/scope-guard.sh` が止める。範囲を広げたくなったら、
 * **先に計画の `files` を直してから** もう一度これを実行する。
 */
export function buildSessionState(plan: Plan, id: string, now: Date): SessionState {
  const item = plan.items.find((candidate) => candidate.id === id);
  if (item === undefined) {
    throw new Error(`${id} は計画にありません。pnpm run plan:next で次の項目を確認してください。`);
  }
  if (item.status === 'verified' || item.status === 'dropped') {
    throw new Error(`${id} はもう終わっています（作業対象になりません）。`);
  }
  return { activeItem: id, files: [...item.files], startedAt: now.toISOString() };
}

export function formatStarted(state: SessionState, title: string): string {
  return [
    `${state.activeItem}「${title}」を作業中にしました。`,
    '',
    '触ってよいファイル:',
    ...state.files.map((file) => `  - ${file}`),
    '',
    'ここに無いファイルを編集しようとすると止まります。必要になったら、先に docs/plan.json の',
    'files を直してから `pnpm run plan:start` をもう一度実行してください。',
  ].join('\n');
}

function write(state: SessionState): void {
  mkdirSync(dirname(SESSION_STATE_PATH), { recursive: true });
  writeFileSync(SESSION_STATE_PATH, `${JSON.stringify(state, null, 2)}\n`);
}

if (isMain(import.meta.url)) {
  const { args, planPath } = splitPlanPath(process.argv);
  const id = args[0];

  if (id === '--clear') {
    rmSync(SESSION_STATE_PATH, { force: true });
    console.log('作業範囲の固定を解除しました。');
  } else if (id === undefined) {
    console.error('使い方: pnpm run plan:start <項目の id>（解除は pnpm run plan:stop）');
    process.exitCode = 2;
  } else {
    const plan = loadPlan(planPath);
    const state = buildSessionState(plan, id, new Date());
    write(state);
    const title = plan.items.find((item) => item.id === id)?.title ?? id;
    console.log(formatStarted(state, title));
  }
}
