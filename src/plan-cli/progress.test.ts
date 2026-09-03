import { describe, expect, it } from 'vitest';

import { countProgress } from '../plan.js';
import { testItem, testPlan } from './fixture.js';
import { formatProgress } from './progress.js';

function render(...items: Parameters<typeof testPlan>[0]): string {
  const plan = testPlan(items);
  return formatProgress(countProgress(plan), plan);
}

/** 人が実物を見るしかない項目。`verifyCommand` は持てない。 */
function humanItem(overrides: Parameters<typeof testItem>[0]) {
  const { verifyCommand: _omitted, ...rest } = testItem({ verifyBy: 'human', ...overrides });
  return rest;
}

describe('formatProgress', () => {
  it('完了数・全体数・残り数を日本語の文章で出す', () => {
    const text = render(
      testItem({ id: 'T001', status: 'verified' }),
      testItem({ id: 'T002' }),
      testItem({ id: 'T003' }),
    );
    expect(text).toContain('全3件のうち1件が終わりました。残り2件です。');
  });

  it('人に見てもらう順番待ちを見出しつきで並べる', () => {
    const text = render(
      humanItem({
        id: 'T001',
        status: 'awaiting_human',
        title: '画面を見せる',
      }),
      testItem({ id: 'T002' }),
    );
    expect(text).toContain('人に見てもらう順番待ち: 1件あります。');
    expect(text).toContain('画面を見せる');
    expect(text).toContain('T001');
  });

  it('順番待ちが無いときはその旨を出す', () => {
    expect(render(testItem({ id: 'T001' }))).toContain('人に見てもらう順番待ち: ありません。');
  });

  it('あとから足した分は、実際に追記があるときだけ出す', () => {
    expect(render(testItem({ id: 'T001' }))).not.toContain('あとから足した分');
    expect(render(testItem({ id: 'T001' }), testItem({ id: 'T002', origin: 'added' }))).toContain(
      'あとから足した分',
    );
  });

  // 取り下げを黙って分母から外すと、数字だけ良くなった理由が読み手に分からない。
  it('取り下げた件数を、数に入れていないことと一緒に出す', () => {
    const text = render(
      testItem({ id: 'T001', status: 'verified' }),
      testItem({ id: 'T002', status: 'dropped' }),
    );
    expect(text).toContain('取り下げた項目: 1件');
    expect(text).toContain('全1件のうち1件が終わりました');
  });

  it('いま手をつけている項目を出す', () => {
    const text = render(testItem({ id: 'T001', status: 'in_progress', title: '途中の作業' }));
    expect(text).toContain('いま手をつけている: 1件あります。');
    expect(text).toContain('途中の作業');
  });

  it('残りの確かめ方の内訳を出す（「全部緑」をどこまで信じてよいかの材料）', () => {
    const text = render(testItem({ id: 'T001' }), humanItem({ id: 'T002' }));
    expect(text).toContain('人が実物を見る 1件');
  });

  // T013: 読み手は非エンジニア。計画ファイルの中で使っている英語の項目名を出さない。
  it('計画ファイルの内部の項目名をそのまま出さない', () => {
    const text = render(
      testItem({ id: 'T001', status: 'verified' }),
      humanItem({ id: 'T002', status: 'awaiting_human' }),
      testItem({ id: 'T003', origin: 'added' }),
      testItem({ id: 'T004', status: 'dropped' }),
      testItem({ id: 'T005', status: 'blocked' }),
      testItem({ id: 'T006', status: 'in_progress' }),
    );
    for (const field of [
      'status',
      'dependsOn',
      'verifyBy',
      'verifyCommand',
      'deliverable',
      'verify',
      'origin',
      'awaitingHuman',
      'awaiting_human',
      'in_progress',
      'initial',
      'added',
      'total',
      'countable',
      'verified',
      'dropped',
      'blocked',
      'done',
    ]) {
      expect(text).not.toContain(field);
    }
  });
});
