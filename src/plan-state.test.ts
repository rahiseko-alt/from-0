import { describe, expect, it } from 'vitest';

import { testItem, testPlan } from './plan-cli/fixture.js';
import { decidePhase, EMPTY_CHECKPOINTS, validateCheckpoints, type Phase } from './plan-state.js';

function phaseOf(
  items: Parameters<typeof testPlan>[0],
  overrides: Partial<Parameters<typeof decidePhase>[0]> = {},
): Phase {
  return decidePhase({
    plan: testPlan(items),
    checkpoints: EMPTY_CHECKPOINTS,
    release: undefined,
    ...overrides,
  }).phase;
}

describe('decidePhase', () => {
  it('計画がまだ無いなら、まず計画を作る工程になる', () => {
    expect(
      decidePhase({ plan: undefined, checkpoints: EMPTY_CHECKPOINTS, release: undefined }).phase,
    ).toBe('PLAN_REQUIRED');
  });

  it('壊れた計画では作業工程に入らない', () => {
    expect(
      phaseOf([
        testItem({ id: 'T001', dependsOn: ['T002'] }),
        testItem({ id: 'T002', dependsOn: ['T001'] }),
      ]),
    ).toBe('BROKEN');
  });

  it('着手できる項目があれば作業工程になる', () => {
    expect(phaseOf([testItem({ id: 'T001' })])).toBe('READY');
  });

  it('着手中の項目があれば、その続きの工程になる', () => {
    expect(phaseOf([testItem({ id: 'T001', status: 'in_progress' })])).toBe('WORKING');
  });

  it('確認待ちしか残っていなければ、まとめて聞く工程になる', () => {
    const { verifyCommand: _omitted, ...waiting } = testItem({
      id: 'T001',
      status: 'awaiting_human',
      verifyBy: 'human',
    });
    expect(phaseOf([waiting])).toBe('WAITING_HUMAN');
  });

  // 「済」が10増えるごとに、過去の項目が壊れていないかを見に行く。
  it('前回の全体照合から10件終わったら、照合の工程が割り込む', () => {
    const items = Array.from({ length: 10 }, (_, index) =>
      testItem({ id: `T${String(index + 1).padStart(3, '0')}`, status: 'verified' }),
    );
    items.push(testItem({ id: 'T011' }));
    expect(phaseOf(items)).toBe('GLOBAL_VERIFY_REQUIRED');
    expect(phaseOf(items, { checkpoints: { ...EMPTY_CHECKPOINTS, globalVerifiedCount: 10 } })).toBe(
      'READY',
    );
  });

  // 受入 13 / 14: 最後の項目が終わっても「次は何をしますか」と止まらない。
  it('全項目が片付いたら、完成した実物の確認へ自動で進む', () => {
    expect(
      phaseOf([testItem({ id: 'T001', status: 'verified' })], {
        checkpoints: { ...EMPTY_CHECKPOINTS, globalVerifiedCount: 1 },
      }),
    ).toBe('FINAL_VERIFY_REQUIRED');
  });

  it('ゴール到達時は、1件でも未照合が残っていれば先に全体照合させる', () => {
    expect(phaseOf([testItem({ id: 'T001', status: 'verified' })])).toBe('GLOBAL_VERIFY_REQUIRED');
  });

  it('実物の確認が済んだら、見送った問題の見直しへ進む', () => {
    expect(
      phaseOf([testItem({ id: 'T001', status: 'verified' })], {
        checkpoints: {
          globalVerifiedCount: 1,
          finalGoalAcceptanceAt: '2026-09-03T00:00:00Z',
          neglectReviewAt: null,
        },
      }),
    ).toBe('NEGLECT_REVIEW_REQUIRED');
  });

  it('公開前の確認が未実施なら、公開できない', () => {
    expect(
      phaseOf([testItem({ id: 'T001', status: 'verified' })], {
        checkpoints: {
          globalVerifiedCount: 1,
          finalGoalAcceptanceAt: '2026-09-03T00:00:00Z',
          neglectReviewAt: '2026-09-03T00:00:00Z',
        },
      }),
    ).toBe('RELEASE_GATE_REQUIRED');
  });

  it('公開前の確認に問題が残っていれば、公開できない', () => {
    expect(
      phaseOf([testItem({ id: 'T001', status: 'verified' })], {
        checkpoints: {
          globalVerifiedCount: 1,
          finalGoalAcceptanceAt: '2026-09-03T00:00:00Z',
          neglectReviewAt: '2026-09-03T00:00:00Z',
        },
        release: { allowed: false, blockers: ['Gate 003: FAIL'], open: [] },
      }),
    ).toBe('RELEASE_GATE_REQUIRED');
  });

  it('全部通ってはじめて公開してよい状態になる', () => {
    expect(
      phaseOf([testItem({ id: 'T001', status: 'verified' })], {
        checkpoints: {
          globalVerifiedCount: 1,
          finalGoalAcceptanceAt: '2026-09-03T00:00:00Z',
          neglectReviewAt: '2026-09-03T00:00:00Z',
        },
        release: { allowed: true, blockers: [], open: [] },
      }),
    ).toBe('RELEASE_READY');
  });
});

describe('validateCheckpoints', () => {
  it('既定の記録は妥当', () => {
    expect(validateCheckpoints(EMPTY_CHECKPOINTS)).toEqual([]);
  });

  it('件数が数字でなければ弾く', () => {
    expect(validateCheckpoints({ ...EMPTY_CHECKPOINTS, globalVerifiedCount: '10' }).length).toBe(1);
  });
});
