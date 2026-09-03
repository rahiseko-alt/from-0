import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

import {
  canMarkVerified,
  emptyVerdict,
  parseVerdict,
  VERDICT_DIR,
  verdictPath,
  VERDICT_ROLES,
  type VerdictRecord,
  type VerdictRole,
} from '../verdict.js';
import { isMain } from './is-main.js';
import { loadPlan, splitPlanPath } from './load-plan.js';

/**
 * 完了判定の記録（`pnpm run plan:verdict <id> <checker|adversary> <passed|failed> "<証拠>"`）。
 *
 * ここに記録が無い項目を `verified` にしようとすると `.claude/hooks/verified-guard.sh` が止める。
 * 記録するのは呼び出し元（`/checkout`）で、判定そのものはサブエージェントが出す。
 */
export function applyVerdict(
  current: VerdictRecord,
  role: VerdictRole,
  passed: boolean,
  evidence: string,
  now: Date,
): VerdictRecord {
  return { ...current, [role]: { passed, at: now.toISOString(), evidence } };
}

export function readVerdict(id: string): VerdictRecord {
  const path = verdictPath(id);
  if (!existsSync(path)) return emptyVerdict(id);
  try {
    return parseVerdict(id, JSON.parse(readFileSync(path, 'utf8')));
  } catch {
    return emptyVerdict(id);
  }
}

export function formatVerdict(record: VerdictRecord, skipAdversary: boolean): string {
  const gate = canMarkVerified(record, { skipAdversary });
  if (gate.ok) {
    return `${record.id} は独立した検証を通りました。docs/plan.json の status を verified にできます。`;
  }
  return [
    `${record.id} はまだ verified にできません。`,
    ...gate.reasons.map((reason) => `  - ${reason}`),
  ].join('\n');
}

if (isMain(import.meta.url)) {
  const { args, planPath } = splitPlanPath(process.argv);
  const [id, role, result, ...evidenceParts] = args;
  const evidence = evidenceParts.join(' ');

  if (
    id === undefined ||
    role === undefined ||
    !VERDICT_ROLES.includes(role as VerdictRole) ||
    (result !== 'passed' && result !== 'failed') ||
    evidence.trim() === ''
  ) {
    console.error(
      '使い方: pnpm run plan:verdict <項目の id> <checker|adversary> <passed|failed> "<証拠>"',
    );
    process.exitCode = 2;
  } else {
    const plan = loadPlan(planPath);
    const item = plan.items.find((candidate) => candidate.id === id);
    if (item === undefined) {
      console.error(`${id} は計画にありません。`);
      process.exitCode = 2;
    } else {
      const next = applyVerdict(
        readVerdict(id),
        role as VerdictRole,
        result === 'passed',
        evidence,
        new Date(),
      );
      mkdirSync(VERDICT_DIR, { recursive: true });
      writeFileSync(verdictPath(id), `${JSON.stringify(next, null, 2)}\n`);
      console.log(formatVerdict(next, item.verifyBy === 'human'));
    }
  }
}
