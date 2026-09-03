import { describe, expect, it } from 'vitest';

import { testItem, testPlan } from './fixture.js';
import { formatParallelPairs, parallelPairs } from './parallel.js';

describe('parallelPairs', () => {
  it('依存が無くファイルも重ならない2項目を組として挙げる', () => {
    const plan = testPlan([testItem({ id: 'T001' }), testItem({ id: 'T002' })]);
    expect(parallelPairs(plan).map(([a, b]) => [a.id, b.id])).toEqual([['T001', 'T002']]);
  });

  it('依存関係がある組は挙げない', () => {
    const plan = testPlan([
      testItem({ id: 'T001' }),
      testItem({ id: 'T002', dependsOn: ['T001'] }),
    ]);
    expect(parallelPairs(plan)).toEqual([]);
  });

  it('触るファイルが重なる組は挙げない', () => {
    const plan = testPlan([
      testItem({ id: 'T001', files: ['package.json'] }),
      testItem({ id: 'T002', files: ['package.json'] }),
    ]);
    expect(parallelPairs(plan)).toEqual([]);
  });

  it('依存先が未確認の項目は候補にしない（着手できないため）', () => {
    const plan = testPlan([
      testItem({ id: 'T001' }),
      testItem({ id: 'T002', dependsOn: ['T003'] }),
      testItem({ id: 'T003' }),
    ]);
    const pairs = parallelPairs(plan).map(([a, b]) => `${a.id}+${b.id}`);
    expect(pairs).toEqual(['T001+T003']);
  });

  it('依存先が確認済みなら候補になる', () => {
    const plan = testPlan([
      testItem({ id: 'T001', status: 'verified' }),
      testItem({ id: 'T002', dependsOn: ['T001'] }),
      testItem({ id: 'T003' }),
    ]);
    expect(parallelPairs(plan).map(([a, b]) => `${a.id}+${b.id}`)).toEqual(['T002+T003']);
  });

  it('終わった項目は候補にしない', () => {
    const plan = testPlan([testItem({ id: 'T001', status: 'verified' }), testItem({ id: 'T002' })]);
    expect(parallelPairs(plan)).toEqual([]);
  });
});

describe('formatParallelPairs', () => {
  // 並列は凍結中。組が挙がっても「やってよい」と読ませない。
  it('組が無いときも凍結中であることを先に伝える', () => {
    const text = formatParallelPairs([]);
    expect(text).toContain('1つずつ');
    expect(text).toContain('止めてあります');
  });

  it('組があるときも凍結の断りを先に出す', () => {
    const a = testItem({ id: 'T001' });
    const b = testItem({ id: 'T002' });
    const text = formatParallelPairs([[a, b]]);
    expect(text.indexOf('止めてあります')).toBeLessThan(text.indexOf('T001 と T002'));
    expect(text).toContain(a.title);
    expect(text).toContain(b.title);
  });
});
