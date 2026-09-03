import { decideRelease, formatReleaseDecision } from '../release.js';
import { isMain } from './is-main.js';
import { DEFAULT_RELEASE_PATH, loadReleaseReview } from './load-plan.js';

/**
 * 公開してよいかを決める（`pnpm run release:check`）。
 *
 * 判定が書かれていない Gate は UNKNOWN として扱い、リリースを止める。
 * 「書き忘れ」を「問題なし」に読み替えないための既定値。
 */
if (isMain(import.meta.url)) {
  const review = loadReleaseReview(process.argv[2] ?? DEFAULT_RELEASE_PATH);
  if (review === undefined) {
    console.log(
      `${DEFAULT_RELEASE_PATH} がありません。公開前の確認がまだ行われていないため、公開できません。`,
    );
    process.exitCode = 1;
  } else {
    const decision = decideRelease(review);
    console.log(formatReleaseDecision(decision));
    if (!decision.allowed) process.exitCode = 1;
  }
}
