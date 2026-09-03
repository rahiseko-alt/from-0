import { nextCursor, type PlanCursor } from '../plan.js';
import { isMain } from './is-main.js';
import { loadPlan, planPathFromArgv } from './load-plan.js';

/**
 * 次の一手を文章にする。
 *
 * 以前は「着手できる項目がありません」の1文で、全部終わったのか・詰まっているのか・
 * 計画が壊れているのかを読み手が区別できなかった。区別できないと、全部終わっているのに
 * 「次は何をしますか」と聞いて止まる。4通りを別々の文章で返す。
 */
export function formatNextItem(cursor: PlanCursor): string {
  switch (cursor.kind) {
    case 'READY': {
      const item = cursor.item;
      return [
        `次に着手するのは ${item.id} です。`,
        '',
        `  やること: ${item.title}`,
        `  終わった状態: ${item.deliverable}`,
        '  確かめ方:',
        ...item.verify.map((step, index) => `    ${index + 1}. ${step}`),
        `  触るファイル: ${item.files.join(', ')}`,
        '',
        `着手する前に \`pnpm run plan:start ${item.id}\` を実行してください（作業範囲がここに固定されます）。`,
      ].join('\n');
    }
    case 'WAITING_HUMAN':
      return [
        `進められる項目はもうありません。人に見てもらう順番待ちが ${cursor.ids.length} 件あります。`,
        `  ${cursor.ids.join(', ')}`,
        '',
        '`/plan-ask` でまとめて確認をとってください。',
      ].join('\n');
    case 'BLOCKED':
      return [
        `進められる項目がありません。外の事情で止まっている項目が ${cursor.ids.length} 件あります。`,
        `  ${cursor.ids.join(', ')}`,
        '',
        '待ち先が解けたものから状態を戻してください。',
      ].join('\n');
    case 'BROKEN':
      return [
        '計画そのものが壊れています。このまま作業しても終わりません。',
        ...cursor.problems.map((problem) => `  - ${problem}`),
        '',
        '`pnpm run plan:doctor` で全部の指摘を出せます。',
      ].join('\n');
    default:
      return [
        '項目は全て片付きました。',
        '',
        '`pnpm run plan:state` で次の工程（完成後の確認・公開前の確認）を確かめてください。',
      ].join('\n');
  }
}

if (isMain(import.meta.url)) {
  console.log(formatNextItem(nextCursor(loadPlan(planPathFromArgv(process.argv)))));
}
