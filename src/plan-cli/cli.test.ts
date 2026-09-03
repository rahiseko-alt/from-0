import { describe, expect, it } from 'vitest';

import { nextCursor } from '../plan.js';
import { formatDoctor } from './doctor.js';
import { testItem, testPlan } from './fixture.js';
import { formatEntry, formatStamp, GATE_RECORDED_MARKER } from './gate-record.js';
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

describe('scripts/plan-cli.mjs の引数の受け取り', () => {
  // `pnpm run gate:record -- 087 ...` の `--` は pnpm に食われず、そのまま届く（pnpm 10 で確認）。
  // 実際に「使い方」が出るだけで記録できない不具合になったので、ここで固定する。
  it('先頭の -- を1つだけ取り除く', () => {
    const strip = (raw: readonly string[]) => (raw[0] === '--' ? raw.slice(1) : [...raw]);
    expect(strip(['--', '087', 'BACKLOG'])).toEqual(['087', 'BACKLOG']);
    expect(strip(['087', 'BACKLOG'])).toEqual(['087', 'BACKLOG']);
    // 値としての `--` を2つ渡された場合まで面倒を見ない（区切りは1つで足りる）
    expect(strip(['--', '--'])).toEqual(['--']);
    expect(strip([])).toEqual([]);
  });
});

describe('gate:record', () => {
  it('既存の記録と同じ日時の形にそろえる', () => {
    expect(formatStamp(new Date('2026-09-03T13:05:00Z'))).toBe('2026-09-03 13:05 UTC');
  });

  // クラウドのクローンには origin/main が無く、git の差分では「書いたか」を判定できない。
  // 痕跡の置き場所は neglect-check.sh と揃っている必要があるので、ここで固定する。
  it('書いた痕跡を、書き忘れ検出が見る場所に置く', () => {
    expect(GATE_RECORDED_MARKER).toBe('.claude/.handoff-state/gate-recorded');
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
