import { execFileSync } from 'node:child_process';

import { doctorPlan, findRemovedIds, type Plan } from '../plan.js';
import { isMain } from './is-main.js';
import { DEFAULT_PLAN_PATH, loadPlanIfExists, planPathFromArgv } from './load-plan.js';

/**
 * 計画の健康診断（`pnpm run plan:doctor`）。
 *
 * 見るのは「どれだけ作業しても解けない壊れ」だけ。循環依存、取り下げた項目への依存、
 * 存在しない依存先、着手できる項目が1件も無い行き止まり、そして**過去に振った id の消失**。
 */
export function formatDoctor(problems: readonly string[]): string {
  if (problems.length === 0) {
    return '計画に構造的な問題は見つかりませんでした。';
  }
  return [
    `計画に ${problems.length} 件の問題があります。直すまで作業を進めないでください。`,
    '',
    ...problems.map((problem) => `  - ${problem}`),
  ].join('\n');
}

/**
 * 1つ前のコミットの計画ファイルから id を取り出す。
 * git が使えない・過去に無い等はすべて「比較しない」に倒す（診断が落ちるほうが害が大きい）。
 */
export function previousIds(planPath: string): string[] {
  let raw: string;
  try {
    raw = execFileSync('git', ['show', `HEAD:${planPath}`], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    return [];
  }
  try {
    const previous: unknown = JSON.parse(raw);
    if (
      typeof previous !== 'object' ||
      previous === null ||
      !Array.isArray((previous as { items?: unknown }).items)
    ) {
      return [];
    }
    return (previous as { items: Array<{ id?: unknown }> }).items
      .map((item) => item.id)
      .filter((id): id is string => typeof id === 'string');
  } catch {
    return [];
  }
}

export function diagnose(plan: Plan, planPath: string): string[] {
  const problems = doctorPlan(plan);
  const removed = findRemovedIds(
    previousIds(planPath),
    plan.items.map((item) => item.id),
  );
  for (const id of removed) {
    problems.push(
      `${id} が計画から消えています。番号は不変です（過去のコミット・PR・台帳からの参照が壊れます）。やらないと決めたなら status を dropped にしてください`,
    );
  }
  return problems;
}

if (isMain(import.meta.url)) {
  const planPath = planPathFromArgv(process.argv);
  const plan = loadPlanIfExists(planPath);
  if (plan === undefined) {
    console.log(
      `${DEFAULT_PLAN_PATH} がまだありません。/plan-init で全体計画を作ってから使ってください。`,
    );
  } else {
    const problems = diagnose(plan, planPath);
    console.log(formatDoctor(problems));
    if (problems.length > 0) process.exitCode = 1;
  }
}
