import { canRunInParallel, readyItems, type Plan, type PlanItem } from '../plan.js';
import { isMain } from './is-main.js';
import { loadPlan, planPathFromArgv } from './load-plan.js';

/**
 * 並列は現在**凍結中**です（`AGENTS.md`「並列で進める」）。
 *
 * この判定は依存関係と触るファイルの重複しか見ておらず、スキーマ・外部 API・環境変数・
 * 生成物のような**共有資源を見ていません**。ファイルが重ならなくても、同じ外部サービスの
 * 設定を両方が書き換えれば壊れます。凍結を解くのは、その宣言を計画に足してからです。
 */
export function parallelPairs(plan: Plan): Array<[PlanItem, PlanItem]> {
  const ready = readyItems(plan);

  const pairs: Array<[PlanItem, PlanItem]> = [];
  for (let i = 0; i < ready.length; i += 1) {
    for (let j = i + 1; j < ready.length; j += 1) {
      const a = ready[i];
      const b = ready[j];
      if (a && b && canRunInParallel(a, b)) pairs.push([a, b]);
    }
  }
  return pairs;
}

const FROZEN_NOTICE = [
  '並列実行はいま止めてあります。1つずつ進めてください。',
  '',
  '止めている理由: 同時に進めてよいかの判定が、依存関係と触るファイルしか見ていないためです。',
  '同じ外部サービスの設定や環境変数を両方が書き換えると、ファイルが重ならなくても壊れます。',
].join('\n');

export function formatParallelPairs(pairs: ReadonlyArray<readonly [PlanItem, PlanItem]>): string {
  if (pairs.length === 0) {
    return [FROZEN_NOTICE, '', '（なお、いま同時に進められる組もありません）'].join('\n');
  }
  const lines = pairs.map(([a, b]) => `- ${a.id} と ${b.id}\n    ${a.title}\n    ${b.title}`);
  return [
    FROZEN_NOTICE,
    '',
    `参考: 依存関係とファイルの重複だけで見れば ${pairs.length} 通りの組があります。`,
    '',
    ...lines,
  ].join('\n');
}

if (isMain(import.meta.url)) {
  console.log(formatParallelPairs(parallelPairs(loadPlan(planPathFromArgv(process.argv)))));
}
