import { describe, expect, it } from 'vitest';

import { nextCursor } from '../plan.js';
import { formatDoctor } from './doctor.js';
import { testItem, testPlan } from './fixture.js';
import { formatEntry, formatStamp } from './gate-record.js';
import { formatNextItem } from './next-item.js';
import { buildSessionState } from './start.js';
import { applyVerdict, formatVerdict } from './verdict.js';

describe('formatNextItem', () => {
  // C6: 「着手できる項目がありません」の1文では、全部終わったのか詰まったのか読み手が区別できない。
  it('全部終わったときと詰まったときで違う文章を出す', () => {
    const completed = formatNextItem(
      nextCursor(testPlan([testItem({ id: 'T001', status: 'verified' })])),
    );
    const blocked = formatNextItem(
      nextCursor(testPlan([testItem({ id: 'T001', status: 'blocked' })])),
    );
    expect(completed).toContain('全て片付きました');
    expect(blocked).toContain('外の事情');
    expect(completed).not.toBe(blocked);
  });

  it('次の項目には、作業範囲を固定する手順を添える', () => {
    const text = formatNextItem(nextCursor(testPlan([testItem({ id: 'T001' })])));
    expect(text).toContain('plan:start T001');
  });

  it('計画が壊れていれば、項目ではなく壊れの内容を出す', () => {
    const text = formatNextItem(
      nextCursor(
        testPlan([
          testItem({ id: 'T001', dependsOn: ['T002'] }),
          testItem({ id: 'T002', dependsOn: ['T001'] }),
        ]),
      ),
    );
    expect(text).toContain('壊れています');
  });
});

describe('formatDoctor', () => {
  it('問題が無ければその旨だけを出す', () => {
    expect(formatDoctor([])).toContain('見つかりませんでした');
  });

  it('問題があれば件数と中身を出す', () => {
    expect(formatDoctor(['依存が循環しています: T001 → T002 → T001'])).toContain('1 件');
  });
});

describe('buildSessionState', () => {
  it('計画の触るファイルをそのまま写す', () => {
    const plan = testPlan([testItem({ id: 'T001', files: ['a.ts', 'b.ts'] })]);
    const state = buildSessionState(plan, 'T001', new Date('2026-09-03T00:00:00Z'));
    expect(state).toEqual({
      activeItem: 'T001',
      files: ['a.ts', 'b.ts'],
      startedAt: '2026-09-03T00:00:00.000Z',
    });
  });

  it('計画に無い項目は固定できない', () => {
    expect(() =>
      buildSessionState(testPlan([testItem({ id: 'T001' })]), 'T999', new Date()),
    ).toThrow(/計画にありません/);
  });

  it('終わった項目は作業対象にできない', () => {
    const plan = testPlan([testItem({ id: 'T001', status: 'verified' })]);
    expect(() => buildSessionState(plan, 'T001', new Date())).toThrow(/終わっています/);
  });
});

describe('applyVerdict', () => {
  it('役ごとに上書きし、もう一方は残す', () => {
    const now = new Date('2026-09-03T00:00:00Z');
    const afterChecker = applyVerdict(
      { id: 'T001', checker: null, adversary: null },
      'checker',
      true,
      '手順を上から実行した',
      now,
    );
    const afterAdversary = applyVerdict(afterChecker, 'adversary', true, '破れなかった', now);
    expect(afterAdversary.checker?.passed).toBe(true);
    expect(formatVerdict(afterAdversary, false)).toContain('verified にできます');
  });

  it('片方だけなら、まだ通せないことを理由つきで出す', () => {
    const record = applyVerdict(
      { id: 'T001', checker: null, adversary: null },
      'checker',
      true,
      'なぞった',
      new Date(),
    );
    expect(formatVerdict(record, false)).toContain('adversary');
  });
});

describe('gate:record', () => {
  it('既存の記録と同じ日時の形にそろえる', () => {
    expect(formatStamp(new Date('2026-09-03T13:05:00Z'))).toBe('2026-09-03 13:05 UTC');
  });

  it('日時・Gate番号・対象箇所の3点を必ず含める', () => {
    const entry = formatEntry(
      new Date('2026-09-03T13:05:00Z'),
      '087',
      'BACKLOG',
      'scripts/plan-cli.mjs',
      '',
    );
    expect(entry).toContain('2026-09-03 13:05 UTC');
    expect(entry).toContain('`087`');
    expect(entry).toContain('scripts/plan-cli.mjs');
  });
});
