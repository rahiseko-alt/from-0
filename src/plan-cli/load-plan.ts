import { existsSync, readFileSync } from 'node:fs';

import { parsePlan, type Plan } from '../plan.js';
import { EMPTY_CHECKPOINTS, parseCheckpoints, type Checkpoints } from '../plan-state.js';
import { parseReleaseReview, type ReleaseReview } from '../release.js';

/** 既定の計画ファイル。CLI の第1引数で差し替えられる（テスト用の計画を渡すため）。 */
export const DEFAULT_PLAN_PATH = 'docs/plan.json';
/** 工程の節目の記録。無ければ「まだ何もしていない」として扱う。 */
export const DEFAULT_CHECKPOINTS_PATH = 'docs/checkpoints.json';
/** 公開前の確認の結果。無ければ「まだ確認していない」として扱う。 */
export const DEFAULT_RELEASE_PATH = 'docs/release-review.json';

/**
 * 計画ファイルを読んで検証する。
 * 壊れた計画をそのまま表示すると「動いているように見える」ため、必ず parsePlan を通す。
 */
export function loadPlan(path: string = DEFAULT_PLAN_PATH): Plan {
  return parsePlan(JSON.parse(readFileSync(path, 'utf8')));
}

/** 計画ファイルがまだ無い状態は正常（雛形を複製した直後）。例外にせず undefined を返す。 */
export function loadPlanIfExists(path: string = DEFAULT_PLAN_PATH): Plan | undefined {
  return existsSync(path) ? loadPlan(path) : undefined;
}

export function loadCheckpoints(path: string = DEFAULT_CHECKPOINTS_PATH): Checkpoints {
  if (!existsSync(path)) return EMPTY_CHECKPOINTS;
  return parseCheckpoints(JSON.parse(readFileSync(path, 'utf8')));
}

export function loadReleaseReview(path: string = DEFAULT_RELEASE_PATH): ReleaseReview | undefined {
  if (!existsSync(path)) return undefined;
  return parseReleaseReview(JSON.parse(readFileSync(path, 'utf8')));
}

/** CLI の第1引数を計画ファイルのパスとして受け取る。省略時は既定値。 */
export function planPathFromArgv(argv: readonly string[]): string {
  return argv[2] ?? DEFAULT_PLAN_PATH;
}

/**
 * 独自の引数を取る CLI 用に、`--plan <パス>` だけを取り除いて残りを返す。
 * テストから別の計画ファイルを渡せるようにするためだけの仕組み。
 */
export function splitPlanPath(argv: readonly string[]): { args: string[]; planPath: string } {
  const rest = argv.slice(2);
  const index = rest.indexOf('--plan');
  if (index === -1) return { args: [...rest], planPath: DEFAULT_PLAN_PATH };
  const planPath = rest[index + 1] ?? DEFAULT_PLAN_PATH;
  return { args: [...rest.slice(0, index), ...rest.slice(index + 2)], planPath };
}
