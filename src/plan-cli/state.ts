import { decidePhase, formatPhase } from '../plan-state.js';
import { decideRelease } from '../release.js';
import { isMain } from './is-main.js';
import {
  loadCheckpoints,
  loadPlanIfExists,
  loadReleaseReview,
  planPathFromArgv,
} from './load-plan.js';

/**
 * いまどの工程にいるかを1行で出す（`pnpm run plan:state`）。
 * SessionStart フックがこれを実行して、セッションの冒頭に差し込む。
 */
if (isMain(import.meta.url)) {
  const plan = loadPlanIfExists(planPathFromArgv(process.argv));
  const review = loadReleaseReview();
  console.log(
    formatPhase(
      decidePhase({
        plan,
        checkpoints: loadCheckpoints(),
        release: review === undefined ? undefined : decideRelease(review),
      }),
    ),
  );
}
