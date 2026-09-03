import { describe, expect, it } from 'vitest';

import { canMarkVerified, emptyVerdict, parseVerdict, type VerdictRecord } from './verdict.js';

function passed(): VerdictRecord {
  return {
    id: 'T001',
    checker: { passed: true, at: '2026-09-03T00:00:00Z', evidence: '手順を上から実行した' },
    adversary: { passed: true, at: '2026-09-03T00:10:00Z', evidence: '破れなかった' },
  };
}

describe('canMarkVerified', () => {
  it('2つの役が通していれば verified にできる', () => {
    expect(canMarkVerified(passed()).ok).toBe(true);
  });

  // 受入 7: 作った本人の判断だけでは「済」にできない。
  it('判定の記録が1つも無ければ通さない', () => {
    const gate = canMarkVerified(emptyVerdict('T001'));
    expect(gate.ok).toBe(false);
    expect(gate.reasons.length).toBe(2);
  });

  it('壊す役が破れていれば通さない', () => {
    const record = passed();
    const gate = canMarkVerified({
      ...record,
      adversary: { passed: false, at: '2026-09-03T00:10:00Z', evidence: '空入力で落ちる' },
    });
    expect(gate.ok).toBe(false);
  });

  it('なぞる役が通していなければ通さない', () => {
    const record = passed();
    const gate = canMarkVerified({
      ...record,
      checker: { passed: false, at: '2026-09-03T00:00:00Z', evidence: '手順1で止まった' },
    });
    expect(gate.ok).toBe(false);
  });

  // 実物を人が見るしかない項目を機械的に壊しても意味が無い。その層は人間が担当する。
  it('人が実物を見る項目では壊す役を省ける', () => {
    const record: VerdictRecord = { ...passed(), adversary: null };
    expect(canMarkVerified(record, { skipAdversary: true }).ok).toBe(true);
  });
});

describe('parseVerdict', () => {
  it('壊れた記録は「無い」と同じ扱いにする', () => {
    expect(parseVerdict('T001', { checker: 'ok' })).toEqual(emptyVerdict('T001'));
  });

  it('中身がそろっていれば読み取る', () => {
    const record = parseVerdict('T001', passed());
    expect(record.checker?.passed).toBe(true);
    expect(record.adversary?.passed).toBe(true);
  });
});
