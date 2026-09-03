/**
 * いまプロジェクトがどの工程にいるかを1つに決める（`pnpm run plan:state`）。
 *
 * 「ゴール設定 → 分解 → 開発 → 完成後の確認 → 公開」という流れは文書としては存在していたが、
 * 今どこにいるかを判定する装置が無く、AI が毎回それを思い出す前提になっていた。思い出せないと
 * 最後の項目が終わった時点で「次は何をしますか」と止まる。ここが中央の制御装置。
 */

import { countProgress, doctorPlan, nextCursor, type Plan } from './plan.js';
import type { ReleaseDecision } from './release.js';

/** 全体照合を挟む間隔。「済」がこの件数増えるごとに、過去の項目が壊れていないかを見直す。 */
export const GLOBAL_VERIFY_INTERVAL = 10;

/**
 * 工程の節目の記録（`docs/checkpoints.json`）。
 *
 * 進捗の数字は数えれば出るのでファイルに持たないが、「いつ全体照合したか」は数えても出ない。
 * 持つのは3つだけに絞る。増やすと、同時に働く AI の書き換えが競合する。
 */
export interface Checkpoints {
  /** 最後に全体照合を通した時点の「済」件数。 */
  globalVerifiedCount: number;
  /** 完成した実物がゴールを満たすと確かめた日時。未実施は null。 */
  finalGoalAcceptanceAt: string | null;
  /** 放置台帳を全件見直した日時。未実施は null。 */
  neglectReviewAt: string | null;
}

export const EMPTY_CHECKPOINTS: Checkpoints = {
  globalVerifiedCount: 0,
  finalGoalAcceptanceAt: null,
  neglectReviewAt: null,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

export function validateCheckpoints(input: unknown): string[] {
  if (!isRecord(input)) return ['節目の記録がオブジェクトではありません'];
  const errors: string[] = [];
  if (
    typeof input.globalVerifiedCount !== 'number' ||
    !Number.isInteger(input.globalVerifiedCount)
  ) {
    errors.push('globalVerifiedCount が整数ではありません');
  }
  if (!isNullableString(input.finalGoalAcceptanceAt)) {
    errors.push('finalGoalAcceptanceAt は日時の文字列か null です');
  }
  if (!isNullableString(input.neglectReviewAt)) {
    errors.push('neglectReviewAt は日時の文字列か null です');
  }
  return errors;
}

export function parseCheckpoints(input: unknown): Checkpoints {
  const errors = validateCheckpoints(input);
  if (errors.length > 0) {
    throw new Error(`節目の記録に問題があります:\n${errors.map((e) => `  - ${e}`).join('\n')}`);
  }
  return input as Checkpoints;
}

/**
 * 工程。この順に進み、飛ばせない。
 *
 * `PLAN_REQUIRED → READY/WORKING → (WAITING_HUMAN / BLOCKED) → GLOBAL_VERIFY_REQUIRED →`
 * `FINAL_VERIFY_REQUIRED → NEGLECT_REVIEW_REQUIRED → RELEASE_GATE_REQUIRED → RELEASE_READY`
 */
export type Phase =
  | 'PLAN_REQUIRED'
  | 'BROKEN'
  | 'GLOBAL_VERIFY_REQUIRED'
  | 'WORKING'
  | 'READY'
  | 'WAITING_HUMAN'
  | 'BLOCKED'
  | 'FINAL_VERIFY_REQUIRED'
  | 'NEGLECT_REVIEW_REQUIRED'
  | 'RELEASE_GATE_REQUIRED'
  | 'RELEASE_READY';

export interface PhaseInput {
  /** 計画ファイル。無い（＝まだ分解していない）なら undefined。 */
  plan: Plan | undefined;
  checkpoints: Checkpoints;
  /** リリース判定の結果。判定ファイルが無いなら undefined。 */
  release: ReleaseDecision | undefined;
}

export interface PhaseResult {
  phase: Phase;
  /** 何が起きているか。非エンジニアが読む前提で書く。 */
  summary: string;
  /** 次の一手。ここに書かれたことだけをやる。 */
  nextAction: string;
  /** 補足。詰まっている項目の id や、壊れの内容。 */
  detail: string[];
}

/**
 * 工程を1つに決める。上から順に見て、最初に当てはまったものを返す。
 * 「どれにも当てはまらない」を作らないため、最後は必ず BLOCKED に落ちる。
 */
export function decidePhase(input: PhaseInput): PhaseResult {
  const { plan, checkpoints, release } = input;

  if (plan === undefined) {
    return {
      phase: 'PLAN_REQUIRED',
      summary: '全体計画がまだありません。',
      nextAction: '`/plan-init` でゴールを1文で決め、項目に分けてください。',
      detail: [],
    };
  }

  const problems = doctorPlan(plan);
  if (problems.length > 0) {
    return {
      phase: 'BROKEN',
      summary: '計画そのものが壊れています。このまま作業しても終わりません。',
      nextAction: '`pnpm run plan:doctor` の指摘を直してから作業を始めてください。',
      detail: problems,
    };
  }

  const progress = countProgress(plan);
  const cursor = nextCursor(plan);
  const sinceLastGlobalVerify = progress.total.verified - checkpoints.globalVerifiedCount;
  const everythingSettled = cursor.kind === 'COMPLETED';

  // 全体照合は「10件進むごと」と「ゴール到達時」の両方で挟む。
  // ゴール時は1件でも未照合が残っていれば通さない（そこが最後の砦になるため）。
  const needsGlobalVerify = everythingSettled
    ? sinceLastGlobalVerify > 0
    : sinceLastGlobalVerify >= GLOBAL_VERIFY_INTERVAL;
  if (needsGlobalVerify) {
    return {
      phase: 'GLOBAL_VERIFY_REQUIRED',
      summary: `前回の全体照合から ${sinceLastGlobalVerify} 件が終わりました。過去の項目が壊れていないか見直す番です。`,
      nextAction:
        '`/plan-verify` を実行し、終わったら `docs/checkpoints.json` を更新してください。',
      detail: [],
    };
  }

  if (!everythingSettled) {
    switch (cursor.kind) {
      case 'READY':
        return cursor.item.status === 'in_progress'
          ? {
              phase: 'WORKING',
              summary: `${cursor.item.id}「${cursor.item.title}」に着手した状態で止まっています。`,
              nextAction: `${cursor.item.id} の続きから再開してください。`,
              detail: [],
            }
          : {
              phase: 'READY',
              summary: `次にやるのは ${cursor.item.id}「${cursor.item.title}」です。`,
              nextAction: `\`pnpm run plan:start ${cursor.item.id}\` で作業範囲を固定してから着手してください。`,
              detail: [],
            };
      case 'WAITING_HUMAN':
        return {
          phase: 'WAITING_HUMAN',
          summary: `人に見てもらう順番待ちが ${cursor.ids.length} 件あります。ほかに進められる項目はありません。`,
          nextAction: '`/plan-ask` でまとめて確認をとってください。',
          detail: cursor.ids,
        };
      case 'BROKEN':
        return {
          phase: 'BROKEN',
          summary: '計画そのものが壊れています。',
          nextAction: '`pnpm run plan:doctor` の指摘を直してください。',
          detail: cursor.problems,
        };
      default:
        return {
          phase: 'BLOCKED',
          summary: '進められる項目がありません。外の事情が解けるのを待っています。',
          nextAction: '止まっている項目の待ち先を確認し、解けたものから状態を戻してください。',
          detail: cursor.kind === 'BLOCKED' ? cursor.ids : [],
        };
    }
  }

  if (checkpoints.finalGoalAcceptanceAt === null) {
    return {
      phase: 'FINAL_VERIFY_REQUIRED',
      summary: '項目は全て片付きました。完成した実物がゴールを満たしているかは、まだ見ていません。',
      nextAction: '`/release` の最初の手順（最終ゴール受入）を実行してください。',
      detail: [`ゴール: ${plan.goal}`],
    };
  }

  if (checkpoints.neglectReviewAt === null) {
    return {
      phase: 'NEGLECT_REVIEW_REQUIRED',
      summary: '見送った問題の一覧を、まだ最後まで見直していません。',
      nextAction: '`docs/neglected-log.md` を全件その場で確認してください。',
      detail: [],
    };
  }

  if (release === undefined) {
    return {
      phase: 'RELEASE_GATE_REQUIRED',
      summary: '公開前の確認がまだ行われていません。',
      nextAction: '`/release-review` で 001〜080 を証拠つきで判定してください。',
      detail: [],
    };
  }

  if (!release.allowed) {
    return {
      phase: 'RELEASE_GATE_REQUIRED',
      summary: `公開前の確認に ${release.blockers.length} 件の問題が残っています。`,
      nextAction: '問題を直してから `pnpm run release:check` をもう一度通してください。',
      detail: release.blockers.slice(0, 10),
    };
  }

  return {
    phase: 'RELEASE_READY',
    summary: '公開してよい状態です。',
    nextAction: 'ユーザーに「公開してよいか」だけを聞いてください。',
    detail: [],
  };
}

export function formatPhase(result: PhaseResult): string {
  const lines = [
    `いまの工程: ${result.phase}`,
    '',
    result.summary,
    '',
    `次の一手: ${result.nextAction}`,
  ];
  if (result.detail.length > 0) {
    lines.push('');
    for (const line of result.detail.slice(0, 20)) lines.push(`  - ${line}`);
    if (result.detail.length > 20) lines.push(`  ほか ${result.detail.length - 20} 件`);
  }
  return lines.join('\n');
}
