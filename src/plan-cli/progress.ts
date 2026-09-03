import { countProgress, type Plan, type Progress, type Tally } from '../plan.js';
import { isMain } from './is-main.js';
import { loadPlan, planPathFromArgv } from './load-plan.js';

/** 「全10件のうち3件が終わりました。残り7件です。」の1行を作る。 */
function sentence(label: string, counted: Tally): string {
  const rest = counted.countable - counted.verified;
  if (counted.countable === 0) return `${label}: ありません。`;
  return `${label}: 全${counted.countable}件のうち${counted.verified}件が終わりました。残り${rest}件です。`;
}

function listing(plan: Plan, label: string, ids: readonly string[]): string[] {
  if (ids.length === 0) return [];
  const lines = [`${label}: ${ids.length}件あります。`];
  for (const id of ids) {
    const found = plan.items.find((candidate) => candidate.id === id);
    lines.push(`  ・${found?.title ?? id}（${id}）`);
  }
  return lines;
}

/**
 * 進み具合を日本語の文章で表示する。
 * 合計値はファイルに書かず、その場で数えて出す（同時に働く AI が書き換えると競合するため）。
 * 読み手は非エンジニアなので、計画ファイルの中で使っている英語の項目名はそのまま出さない。
 *
 * 「終わった」に数えるのは、独立した検証を通った項目だけ。取り下げた項目は分母から外す
 * （取り下げを完了として数えると、やらないと決めたものが達成率を押し上げる）。
 */
export function formatProgress(progress: Progress, plan: Plan): string {
  const lines = [sentence('進み具合', progress.initial)];

  // 追加分は、実際に追記があったときだけ出す。0件の行は読み手には雑音でしかない。
  if (progress.added.countable > 0) {
    lines.push(sentence('あとから足した分', progress.added));
  }

  if (progress.dropped.length > 0) {
    lines.push(`取り下げた項目: ${progress.dropped.length}件（上の数には入れていません）。`);
  }

  lines.push(...listing(plan, 'いま手をつけている', progress.inProgress));

  if (progress.awaitingHuman.length === 0) {
    lines.push('人に見てもらう順番待ち: ありません。');
  } else {
    lines.push(...listing(plan, '人に見てもらう順番待ち', progress.awaitingHuman));
  }

  lines.push(...listing(plan, '外の事情で止まっている', progress.blocked));

  // 「全部緑です」の中身を見せる。残りのうち何件が人にしか見えないものかで、
  // その緑をどこまで信用してよいかが変わる。
  const { ci, agent, human } = progress.unverifiedBy;
  if (ci + agent + human > 0) {
    lines.push(
      `残りの確かめ方の内訳: コマンドで確かめる ${ci}件 / AI が実物をなぞる ${agent}件 / 人が実物を見る ${human}件。`,
    );
  }

  return lines.join('\n');
}

if (isMain(import.meta.url)) {
  const plan = loadPlan(planPathFromArgv(process.argv));
  console.log(formatProgress(countProgress(plan), plan));
}
