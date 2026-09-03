import { describe, expect, it } from 'vitest';

import { isWithinScope, parseSessionState, type SessionState } from './session-state.js';

const state: SessionState = {
  activeItem: 'T011',
  files: ['src/plan.ts', 'docs/'],
  startedAt: '2026-09-03T00:00:00Z',
};

describe('isWithinScope', () => {
  it('作業中の項目が挙げたファイルは触れる', () => {
    expect(isWithinScope(state, 'src/plan.ts')).toBe(true);
  });

  // 受入 6: 範囲外を編集しようとしたら止まる。
  it('挙げていないファイルは触れない', () => {
    expect(isWithinScope(state, 'src/index.ts')).toBe(false);
  });

  it('末尾がスラッシュならその配下を許す', () => {
    expect(isWithinScope(state, 'docs/decisions.md')).toBe(true);
  });

  // 範囲を広げるには計画を直す必要があるので、計画と引継ぎと台帳はいつでも触れる。
  it('計画・引継ぎ・台帳はいつでも触れる', () => {
    expect(isWithinScope(state, 'docs/plan.json')).toBe(true);
    expect(isWithinScope(state, 'docs/handoff.md')).toBe(true);
    expect(isWithinScope(state, 'docs/neglected-log.md')).toBe(true);
  });
});

describe('parseSessionState', () => {
  it('壊れた記録では関門を働かせない', () => {
    expect(parseSessionState({ activeItem: 42 })).toBeUndefined();
    expect(parseSessionState(null)).toBeUndefined();
  });

  it('中身がそろっていれば読み取る', () => {
    expect(parseSessionState(state)?.activeItem).toBe('T011');
  });
});
