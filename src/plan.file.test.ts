import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { countProgress, doctorPlan, nextCursor, parsePlan, validatePlan } from './plan.js';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const examplePath = join(repoRoot, 'docs', 'plan.example.json');
const planPath = join(repoRoot, 'docs', 'plan.json');

function read(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'));
}

describe('docs/plan.example.json', () => {
  it('見本そのものが検証を通る', () => {
    expect(validatePlan(read(examplePath))).toEqual([]);
  });

  it('確かめ方の担い手を3種類とも含んでいる（書き分けの見本になっている）', () => {
    const plan = parsePlan(read(examplePath));
    const kinds = new Set(plan.items.map((item) => item.verifyBy));
    expect([...kinds].sort()).toEqual(['agent', 'ci', 'human']);
  });

  it('見本の依存グラフが壊れていない', () => {
    expect(doctorPlan(parsePlan(read(examplePath)))).toEqual([]);
  });

  it('依存先が未確認の項目は次の一手に選ばれない', () => {
    const cursor = nextCursor(parsePlan(read(examplePath)));
    expect(cursor.kind === 'READY' && cursor.item.id).toBe('T003');
  });

  it('当初計画と追加分を分けて数えられる', () => {
    const progress = countProgress(parsePlan(read(examplePath)));
    expect(progress.initial.countable).toBeGreaterThan(0);
    expect(progress.added.countable).toBeGreaterThan(0);
  });
});

// C1: 雛形には計画ファイルを同梱しない。同梱すると、複製した直後に /plan-init が
// 「既に存在する」と拒み、plan:next が「着手できる項目がありません」を返して工程が始まらない。
// from-0 自身が作った計画は docs/history/ に退避してある。
describe('雛形の初期状態', () => {
  it('docs/plan.json を同梱していない', () => {
    expect(existsSync(planPath)).toBe(false);
  });
});

// 実際の計画ファイルは、このリポジトリを雛形として使い始めてから /plan-init で作られる。
// 存在するときだけ検証する。これが「番号は不変・依存は健全」を CI で守らせる本体。
describe.skipIf(!existsSync(planPath))('docs/plan.json', () => {
  it('計画ファイルが検証を通る', () => {
    expect(validatePlan(read(planPath))).toEqual([]);
  });

  it('依存グラフに循環も行き止まりもない', () => {
    expect(doctorPlan(parsePlan(read(planPath)))).toEqual([]);
  });
});
