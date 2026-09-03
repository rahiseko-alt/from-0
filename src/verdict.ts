/**
 * 完了判定の記録（`.claude/.verdict/<id>.json`）。
 *
 * 項目を `verified` にしてよいのは、**作った本人以外の2つの役が通したときだけ**。
 *
 * - `completion-checker` — `verify` の手順をなぞって「通った」を出した
 * - `adversary`          — `deliverable` を嘘にする操作を探して「破れなかった」を出した
 *
 * 指示に書くだけでは守られない（実際、`done` は作った本人の判断で付いていた）。ここに残った
 * 記録を `.claude/hooks/verified-guard.sh` が見て、記録の無い `verified` への書き換えを止める。
 *
 * 記録はセッションに閉じるので gitignore する。共有したい結論は `docs/plan.json` の `status` 側。
 */

export interface RoleVerdict {
  /** その役が「通した」か。`checker` は通った、`adversary` は破れなかった、のときだけ true。 */
  passed: boolean;
  /** 記録した日時。 */
  at: string;
  /** 判断の根拠。実行したコマンドと返ってきた内容そのもの。 */
  evidence: string;
}

export interface VerdictRecord {
  id: string;
  checker: RoleVerdict | null;
  adversary: RoleVerdict | null;
}

export type VerdictRole = 'checker' | 'adversary';

export const VERDICT_ROLES: readonly VerdictRole[] = ['checker', 'adversary'];

/** 記録の置き場所。呼び出し側がリポジトリルートからの相対で使う。 */
export const VERDICT_DIR = '.claude/.verdict';

export function verdictPath(id: string): string {
  return `${VERDICT_DIR}/${id}.json`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseRole(value: unknown): RoleVerdict | null {
  if (!isRecord(value)) return null;
  if (typeof value.passed !== 'boolean') return null;
  if (typeof value.at !== 'string') return null;
  if (typeof value.evidence !== 'string') return null;
  return { passed: value.passed, at: value.at, evidence: value.evidence };
}

/** 壊れた記録は「無い」と同じ扱いにする。読めない記録を通過の根拠にしない。 */
export function parseVerdict(id: string, input: unknown): VerdictRecord {
  if (!isRecord(input)) return { id, checker: null, adversary: null };
  return {
    id,
    checker: parseRole(input.checker),
    adversary: parseRole(input.adversary),
  };
}

export function emptyVerdict(id: string): VerdictRecord {
  return { id, checker: null, adversary: null };
}

export interface VerifiedGate {
  ok: boolean;
  /** 通せない理由。空なら `verified` にしてよい。 */
  reasons: string[];
}

/**
 * その項目を `verified` にしてよいかを決める。
 *
 * `verifyBy` が `human` の項目は `adversary` を省く。実物を見るしかないものを機械的に壊しても
 * 意味が無く、その層は人間（`/plan-ask`）が担当する。
 */
export function canMarkVerified(
  record: VerdictRecord,
  options: { skipAdversary?: boolean } = {},
): VerifiedGate {
  const reasons: string[] = [];

  if (record.checker === null) {
    reasons.push(`${record.id}: completion-checker の判定がありません`);
  } else if (!record.checker.passed) {
    reasons.push(`${record.id}: completion-checker が「通らなかった」と判定しています`);
  }

  if (options.skipAdversary !== true) {
    if (record.adversary === null) {
      reasons.push(`${record.id}: adversary の判定がありません`);
    } else if (!record.adversary.passed) {
      reasons.push(`${record.id}: adversary が破れる手順を見つけています`);
    }
  }

  return { ok: reasons.length === 0, reasons };
}
