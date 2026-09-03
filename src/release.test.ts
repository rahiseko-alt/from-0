import { describe, expect, it } from 'vitest';

import {
  decideRelease,
  validateReleaseReview,
  type GateEntry,
  type ReleaseReview,
} from './release.js';

function review(entries: GateEntry[]): ReleaseReview {
  return { reviewedAt: '2026-09-03T00:00:00Z', head: 'abc1234', entries };
}

/** 001〜080 を全て PASS（証拠つき）で埋めた判定。 */
function allPass(overrides: GateEntry[] = []): ReleaseReview {
  const entries: GateEntry[] = [];
  for (let n = 1; n <= 80; n += 1) {
    entries.push({
      gate: String(n).padStart(3, '0'),
      verdict: 'PASS',
      evidence: 'pnpm run check 通過',
    });
  }
  for (const override of overrides) {
    const index = entries.findIndex((entry) => entry.gate === override.gate);
    if (index === -1) entries.push(override);
    else entries[index] = override;
  }
  return review(entries);
}

describe('validateReleaseReview', () => {
  it('証拠の無い PASS を弾く', () => {
    const errors = validateReleaseReview(review([{ gate: '001', verdict: 'PASS' }]));
    expect(errors.some((e) => e.includes('evidence'))).toBe(true);
  });

  it('理由の無い N/A を弾く', () => {
    const errors = validateReleaseReview(review([{ gate: '001', verdict: 'N/A' }]));
    expect(errors.some((e) => e.includes('reason'))).toBe(true);
  });

  it('範囲外の Gate 番号を弾く', () => {
    const errors = validateReleaseReview(
      review([{ gate: '101', verdict: 'PASS', evidence: 'あり' }]),
    );
    expect(errors.some((e) => e.includes('範囲外'))).toBe(true);
  });

  it('同じ Gate の二重判定を弾く', () => {
    const errors = validateReleaseReview(
      review([
        { gate: '001', verdict: 'PASS', evidence: 'あり' },
        { gate: '001', verdict: 'FAIL' },
      ]),
    );
    expect(errors.some((e) => e.includes('重複'))).toBe(true);
  });
});

describe('decideRelease', () => {
  it('必須の確認が全て通っていれば公開してよい', () => {
    expect(decideRelease(allPass()).allowed).toBe(true);
  });

  // 受入 18: 未確認は「問題なし」ではない。
  it('判定が書かれていない必須の確認は、未確認として公開を止める', () => {
    const partial = review([{ gate: '001', verdict: 'PASS', evidence: 'あり' }]);
    const decision = decideRelease(partial);
    expect(decision.allowed).toBe(false);
    expect(decision.blockers.length).toBe(79);
  });

  it('必須の確認に不合格があれば公開を止める', () => {
    const decision = decideRelease(allPass([{ gate: '023', verdict: 'FAIL' }]));
    expect(decision.allowed).toBe(false);
    expect(decision.blockers).toContain('Gate 023: FAIL');
  });

  it('必須の確認に UNKNOWN があれば公開を止める', () => {
    const decision = decideRelease(allPass([{ gate: '040', verdict: 'UNKNOWN' }]));
    expect(decision.allowed).toBe(false);
  });

  it('理由つきの N/A は公開を止めない', () => {
    const decision = decideRelease(
      allPass([{ gate: '007', verdict: 'N/A', reason: '決済機能そのものが無い' }]),
    );
    expect(decision.allowed).toBe(true);
  });

  it('081 以降の未解決は公開を止めないが、残件として挙げる', () => {
    const decision = decideRelease(allPass([{ gate: '087', verdict: 'FAIL' }]));
    expect(decision.allowed).toBe(true);
    expect(decision.open).toContain('Gate 087: FAIL');
  });
});
