import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  canRunInParallel,
  countProgress,
  formatProgress,
  nextId,
  nextItem,
  parsePlan,
  validatePlan,
} from './check-plan.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

function item(overrides) {
  return {
    title: '見出し',
    deliverable: 'できるもの',
    verify: ['開く', '見る'],
    dependsOn: [],
    files: [`${overrides.id}.html`],
    automation: 'ci',
    status: 'todo',
    origin: 'initial',
    ...overrides,
  };
}

function plan(items) {
  return { goal: '問題がなければ即リリースできる状態', items };
}

describe('validatePlan', () => {
  it('妥当な計画では違反を返さない', () => {
    expect(validatePlan(plan([item({ id: 'T001' }), item({ id: 'T002' })]))).toEqual([]);
  });

  it('id の重複を検出する', () => {
    const errors = validatePlan(plan([item({ id: 'T001' }), item({ id: 'T001' })]));
    expect(errors.some((e) => e.includes('重複'))).toBe(true);
  });

  it('id が昇順でないことを検出する（既存項目の書き換えの兆候）', () => {
    const errors = validatePlan(plan([item({ id: 'T002' }), item({ id: 'T001' })]));
    expect(errors.some((e) => e.includes('昇順'))).toBe(true);
  });

  it('確かめ方が空の項目を弾く', () => {
    const errors = validatePlan(plan([item({ id: 'T001', verify: [] })]));
    expect(errors.some((e) => e.includes('確かめ方'))).toBe(true);
  });

  it('触るファイルが空の項目を弾く', () => {
    const errors = validatePlan(plan([item({ id: 'T001', files: [] })]));
    expect(errors.some((e) => e.includes('触るファイル'))).toBe(true);
  });

  it('存在しない依存先を検出する', () => {
    const errors = validatePlan(plan([item({ id: 'T001', dependsOn: ['T999'] })]));
    expect(errors.some((e) => e.includes('T999'))).toBe(true);
  });

  it('自分自身への依存を検出する', () => {
    const errors = validatePlan(plan([item({ id: 'T001', dependsOn: ['T001'] })]));
    expect(errors.some((e) => e.includes('自分自身'))).toBe(true);
  });

  it('automation と status の値を制限する', () => {
    const errors = validatePlan(plan([item({ id: 'T001', automation: 'browser', status: '済' })]));
    expect(errors.some((e) => e.includes('automation'))).toBe(true);
    expect(errors.some((e) => e.includes('status'))).toBe(true);
  });

  it('ゴールが空の計画を弾く', () => {
    expect(validatePlan({ goal: '   ', items: [] }).some((e) => e.includes('goal'))).toBe(true);
  });

  it('違反を最初の1件で打ち切らない', () => {
    const errors = validatePlan(plan([item({ id: 'T001', verify: [], files: [] })]));
    expect(errors.length).toBeGreaterThan(1);
  });
});

describe('parsePlan', () => {
  it('違反があれば例外を投げる', () => {
    expect(() => parsePlan(plan([item({ id: 'T001', verify: [] })]))).toThrow(/確かめ方/);
  });
});

describe('countProgress', () => {
  it('当初計画と追加分を分けて数える', () => {
    const progress = countProgress(
      plan([
        item({ id: 'T001', status: 'done' }),
        item({ id: 'T002', status: 'todo' }),
        item({ id: 'T003', status: 'done', origin: 'added' }),
      ]),
    );
    expect(progress.initial).toEqual({ done: 1, total: 2 });
    expect(progress.added).toEqual({ done: 1, total: 1 });
  });

  it('人間の確認待ちを完了に数えない', () => {
    const progress = countProgress(
      plan([item({ id: 'T001', status: 'awaiting_human', automation: 'human' })]),
    );
    expect(progress.initial).toEqual({ done: 0, total: 1 });
    expect(progress.awaitingHuman).toEqual(['T001']);
  });
});

describe('nextItem', () => {
  it('依存先が完了していない項目は選ばない', () => {
    const chosen = nextItem(
      plan([item({ id: 'T001', status: 'todo' }), item({ id: 'T002', dependsOn: ['T001'] })]),
    );
    expect(chosen?.id).toBe('T001');
  });

  it('依存先が完了していれば選ぶ', () => {
    const chosen = nextItem(
      plan([item({ id: 'T001', status: 'done' }), item({ id: 'T002', dependsOn: ['T001'] })]),
    );
    expect(chosen?.id).toBe('T002');
  });

  it('確認待ちの項目は選び直さない', () => {
    expect(nextItem(plan([item({ id: 'T001', status: 'awaiting_human' })]))).toBeUndefined();
  });
});

describe('canRunInParallel', () => {
  it('依存も重複ファイルもなければ並列にできる', () => {
    expect(
      canRunInParallel(
        item({ id: 'T001', files: ['a.html'] }),
        item({ id: 'T002', files: ['b.html'] }),
      ),
    ).toBe(true);
  });

  it('触るファイルが重なれば並列にできない', () => {
    expect(
      canRunInParallel(
        item({ id: 'T001', files: ['a.html', 'style.css'] }),
        item({ id: 'T002', files: ['style.css'] }),
      ),
    ).toBe(false);
  });

  it('依存関係があれば並列にできない', () => {
    expect(
      canRunInParallel(
        item({ id: 'T001', files: ['a.html'] }),
        item({ id: 'T002', files: ['b.html'], dependsOn: ['T001'] }),
      ),
    ).toBe(false);
  });
});

describe('nextId', () => {
  it('既存の最大値の次を返す（欠番は埋めない）', () => {
    expect(nextId(plan([item({ id: 'T001' }), item({ id: 'T008' })]))).toBe('T009');
  });
});

describe('formatProgress', () => {
  it('追加分と確認待ちが無ければ当初計画だけを出す', () => {
    const text = formatProgress(countProgress(plan([item({ id: 'T001' })])));
    expect(text).toBe('当初計画 0/1');
  });

  it('追加分と確認待ちを別枠で出す', () => {
    const text = formatProgress(
      countProgress(
        plan([
          item({ id: 'T001', status: 'done' }),
          item({ id: 'T002', status: 'awaiting_human', origin: 'added' }),
        ]),
      ),
    );
    expect(text).toContain('当初計画 1/1');
    expect(text).toContain('追加分 0/1');
    expect(text).toContain('確認待ち 1件');
  });
});

describe('docs/plan.example.json', () => {
  const example = JSON.parse(readFileSync(join(repoRoot, 'docs', 'plan.example.json'), 'utf8'));

  it('見本そのものが検証を通る', () => {
    expect(validatePlan(example)).toEqual([]);
  });

  it('CI で確認できる項目と人間が確認するしかない項目の両方を含む', () => {
    expect(example.items.some((i) => i.automation === 'human')).toBe(true);
    expect(example.items.some((i) => i.automation === 'ci')).toBe(true);
  });

  it('依存先が未完了の項目は次の一手に選ばれない', () => {
    expect(nextItem(example)?.id).toBe('T003');
  });
});
