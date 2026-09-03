import { describe, expect, it } from 'vitest';

import {
  canRunInParallel,
  countProgress,
  diagnosePlan,
  doctorPlan,
  findCycles,
  findRemovedIds,
  nextCursor,
  nextId,
  parsePlan,
  readyItems,
  validatePlan,
  validateVerifySteps,
  type Plan,
  type PlanItem,
} from './plan.js';

function item(overrides: Partial<PlanItem> & Pick<PlanItem, 'id'>): PlanItem {
  return {
    title: '見出し',
    deliverable: 'できるもの',
    verify: ['docs/plan.json を開く', '中身が書かれていることを確認する'],
    dependsOn: [],
    files: [`${overrides.id}.html`],
    verifyBy: 'ci',
    verifyCommand: 'pnpm run test',
    status: 'todo',
    origin: 'initial',
    ...overrides,
  };
}

/** 人が実物を見るしかない項目。`verifyCommand` は持てない。 */
function humanItem(overrides: Partial<PlanItem> & Pick<PlanItem, 'id'>): PlanItem {
  const { verifyCommand: _ignored, ...rest } = item({ verifyBy: 'human', ...overrides });
  return rest;
}

function plan(items: PlanItem[]): Plan {
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

  it('id が昇順でないことを検出する（番号を振り直した兆候）', () => {
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

  it('verifyBy と status の値を制限する', () => {
    const errors = validatePlan(
      plan([item({ id: 'T001', verifyBy: 'browser' as never, status: '済' as never })]),
    );
    expect(errors.some((e) => e.includes('verifyBy'))).toBe(true);
    expect(errors.some((e) => e.includes('status'))).toBe(true);
  });

  // C4: 「自動で確かめられる」という信号だけがあって、実際に走らせるコマンドが無い状態を作らせない。
  it('ci を名乗る項目に実際のコマンドが無ければ弾く', () => {
    const { verifyCommand: _omitted, ...withoutCommand } = item({ id: 'T001' });
    const errors = validatePlan(plan([withoutCommand]));
    expect(errors.some((e) => e.includes('verifyCommand'))).toBe(true);
  });

  it('ci 以外の項目にコマンドが書かれていれば弾く', () => {
    const errors = validatePlan(
      plan([{ ...humanItem({ id: 'T001' }), verifyCommand: 'pnpm run test' }]),
    );
    expect(errors.some((e) => e.includes('verifyCommand'))).toBe(true);
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
        item({ id: 'T001', status: 'verified' }),
        item({ id: 'T002', status: 'todo' }),
        item({ id: 'T003', status: 'verified', origin: 'added' }),
      ]),
    );
    expect(progress.initial).toEqual({ verified: 1, countable: 2 });
    expect(progress.added).toEqual({ verified: 1, countable: 1 });
  });

  it('人間の確認待ちを完了に数えない', () => {
    const progress = countProgress(plan([humanItem({ id: 'T001', status: 'awaiting_human' })]));
    expect(progress.initial).toEqual({ verified: 0, countable: 1 });
    expect(progress.awaitingHuman).toEqual(['T001']);
  });

  // 取り下げを完了として数えると、やらないと決めたものが達成率を押し上げる（実際に3項目で起きた）。
  it('取り下げた項目は分母からも分子からも外す', () => {
    const progress = countProgress(
      plan([
        item({ id: 'T001', status: 'verified' }),
        item({ id: 'T002', status: 'dropped' }),
        item({ id: 'T003', status: 'todo' }),
      ]),
    );
    expect(progress.initial).toEqual({ verified: 1, countable: 2 });
    expect(progress.dropped).toEqual(['T002']);
  });

  it('残りの確かめ方の内訳を数える（「全部緑」をどこまで信じてよいかの材料）', () => {
    const progress = countProgress(
      plan([
        item({ id: 'T001', status: 'todo' }),
        humanItem({ id: 'T002', status: 'awaiting_human' }),
        item({ id: 'T003', status: 'verified' }),
      ]),
    );
    expect(progress.unverifiedBy).toEqual({ ci: 1, agent: 0, human: 1 });
  });
});

describe('nextCursor', () => {
  it('依存先が終わっていない項目は選ばない', () => {
    const cursor = nextCursor(
      plan([item({ id: 'T001', status: 'todo' }), item({ id: 'T002', dependsOn: ['T001'] })]),
    );
    expect(cursor).toMatchObject({ kind: 'READY' });
    expect(cursor.kind === 'READY' && cursor.item.id).toBe('T001');
  });

  // 「作り終えた」ではなく「確かめた」だけが下流を解放する。
  it('依存先が verified なら選ぶ', () => {
    const cursor = nextCursor(
      plan([item({ id: 'T001', status: 'verified' }), item({ id: 'T002', dependsOn: ['T001'] })]),
    );
    expect(cursor.kind === 'READY' && cursor.item.id).toBe('T002');
  });

  it('着手中の項目を、未着手より先に返す（再開が最優先）', () => {
    const cursor = nextCursor(
      plan([item({ id: 'T001' }), item({ id: 'T002', status: 'in_progress' })]),
    );
    expect(cursor.kind === 'READY' && cursor.item.id).toBe('T002');
  });

  it('確認待ちしか残っていなければ WAITING_HUMAN を返す', () => {
    const cursor = nextCursor(plan([humanItem({ id: 'T001', status: 'awaiting_human' })]));
    expect(cursor).toEqual({ kind: 'WAITING_HUMAN', ids: ['T001'] });
  });

  it('外の事情で止まっている項目しか残っていなければ BLOCKED を返す', () => {
    const cursor = nextCursor(plan([item({ id: 'T001', status: 'blocked' })]));
    expect(cursor).toEqual({ kind: 'BLOCKED', ids: ['T001'] });
  });

  it('全部片付いていれば COMPLETED を返す', () => {
    const cursor = nextCursor(
      plan([item({ id: 'T001', status: 'verified' }), item({ id: 'T002', status: 'dropped' })]),
    );
    expect(cursor).toEqual({ kind: 'COMPLETED' });
  });

  it('計画が壊れていれば項目を返さない', () => {
    const cursor = nextCursor(
      plan([item({ id: 'T001', dependsOn: ['T002'] }), item({ id: 'T002', dependsOn: ['T001'] })]),
    );
    expect(cursor.kind).toBe('BROKEN');
  });

  // 受入 8: 取り下げは下流を解放しない。
  it('取り下げた項目に依存する項目は着手可能にならない', () => {
    const target = plan([
      item({ id: 'T001', status: 'dropped' }),
      item({ id: 'T002', dependsOn: ['T001'] }),
    ]);
    expect(readyItems(target)).toEqual([]);
    expect(nextCursor(target).kind).toBe('BROKEN');
  });
});

describe('diagnosePlan / doctorPlan', () => {
  it('循環依存を検出する', () => {
    const cycles = findCycles(
      plan([item({ id: 'T001', dependsOn: ['T002'] }), item({ id: 'T002', dependsOn: ['T001'] })]),
    );
    expect(cycles.length).toBe(1);
  });

  it('同じ循環を入り口違いで二重に報告しない', () => {
    const problems = diagnosePlan(
      plan([
        item({ id: 'T001', dependsOn: ['T002'] }),
        item({ id: 'T002', dependsOn: ['T003'] }),
        item({ id: 'T003', dependsOn: ['T001'] }),
      ]),
    );
    expect(problems.filter((p) => p.includes('循環')).length).toBe(1);
  });

  it('取り下げた項目への依存を検出する', () => {
    const problems = diagnosePlan(
      plan([item({ id: 'T001', status: 'dropped' }), item({ id: 'T002', dependsOn: ['T001'] })]),
    );
    expect(problems.some((p) => p.includes('取り下げた'))).toBe(true);
  });

  it('壊れていない計画では何も返さない', () => {
    expect(
      doctorPlan(plan([item({ id: 'T001' }), item({ id: 'T002', dependsOn: ['T001'] })])),
    ).toEqual([]);
  });

  // C6: 「全部終わった」と「詰まっている」を同じ扱いにしない。
  it('未完の項目が残っているのに誰も着手できない行き止まりを検出する', () => {
    const problems = doctorPlan(
      plan([
        item({ id: 'T001', status: 'verified' }),
        item({ id: 'T002', status: 'todo', dependsOn: ['T003'] }),
        item({ id: 'T003', status: 'todo', dependsOn: ['T002'] }),
      ]),
    );
    expect(problems.length).toBeGreaterThan(0);
  });
});

describe('findRemovedIds', () => {
  it('前の版から消えた id を挙げる', () => {
    expect(findRemovedIds(['T001', 'T002'], ['T001', 'T003'])).toEqual(['T002']);
  });

  it('増えただけなら何も挙げない', () => {
    expect(findRemovedIds(['T001'], ['T001', 'T002'])).toEqual([]);
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

// T009: 「テストが通る」のように、何を実行し何が起きれば合格かを示さない書き方を拒む。
describe('validateVerifySteps', () => {
  it('対象も期待結果も示さない書き方を拒む', () => {
    expect(validateVerifySteps(['テストが通る']).length).toBeGreaterThan(0);
  });

  it('対象コマンドと期待結果を示す書き方は通す', () => {
    expect(
      validateVerifySteps(['pnpm run testを実行し、新しいテストが通ることを確認する']),
    ).toEqual([]);
  });

  it('下ごしらえの手順に期待結果が無くても、項目のどこかにあれば通す', () => {
    expect(
      validateVerifySteps([
        'index.html をブラウザで開く',
        '画面幅をスマホ相当（375px）まで狭める',
        '文字が画面からはみ出していないことを確認する',
      ]),
    ).toEqual([]);
  });

  it('期待結果がどの手順にも無ければ拒む', () => {
    const errors = validateVerifySteps(['index.html をブラウザで開く', '画面幅を狭めてみる']);
    expect(errors.some((e) => e.includes('できた'))).toBe(true);
  });

  it('一言だけの手順を拒む', () => {
    const errors = validateVerifySteps(['開く', '表示されることを確認する']);
    expect(errors.some((e) => e.includes('短すぎます'))).toBe(true);
  });

  it('人が見て判断する項目（説明してもらう）も期待結果として認める', () => {
    expect(validateVerifySteps(['実際に画面を見せ、進み具合を説明してもらう'])).toEqual([]);
  });
});

describe('validatePlan と確かめ方の書き方', () => {
  it('曖昧な確かめ方の項目を含む計画はエラーになる', () => {
    const errors = validatePlan(plan([item({ id: 'T001', verify: ['テストが通る'] })]));
    expect(errors.some((e) => e.includes('items[0]'))).toBe(true);
  });
});
