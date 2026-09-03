/**
 * リリース判定（`docs/release-review.json` と `pnpm run release:check`）。
 *
 * `docs/test-policy.md` の Gate 表は「上から判定して最初の NO で止まる」手順として書かれているが、
 * 実行する装置が無く、YES 判定に証拠を添える欄も無かった。そのため「全部 YES です」という
 * 文章だけでリリース可能に見えてしまう。ここでは判定を機械可読な形に落とし、
 * **証拠のない PASS を弾く**。
 */

/** Gate ごとの判定。UNKNOWN は「確認できなかった」であり、NO と同じ重さで扱う。 */
export type GateVerdict = 'PASS' | 'FAIL' | 'N/A' | 'UNKNOWN';

export interface GateEntry {
  /** Gate 番号。`docs/test-policy.md` の 001〜100 に対応する3桁のゼロ埋め。 */
  gate: string;
  verdict: GateVerdict;
  /** PASS のときだけ必須。何を見てそう判定したか。 */
  evidence?: string;
  /** N/A のときだけ必須。なぜこの製品に当てはまらないか。 */
  reason?: string;
}

export interface ReleaseReview {
  /** 判定した日時。 */
  reviewedAt: string;
  /** 判定した時点のコミット。あとから「どの状態を見たのか」を追えるようにする。 */
  head: string;
  entries: GateEntry[];
}

/** ここに NO が1件でもあればリリース不可（`docs/test-policy.md`「Release Gate」）。 */
export const REQUIRED_GATE_RANGE = { from: 1, to: 80 } as const;
/** 実運用上問題になるものだけ直す。リリースは止めない。 */
export const CONDITIONAL_GATE_RANGE = { from: 81, to: 90 } as const;
/** 明示要件・高頻度の実害がある場合のみ直す。リリースは止めない。 */
export const OPTIONAL_GATE_RANGE = { from: 91, to: 100 } as const;

const VERDICTS: readonly GateVerdict[] = ['PASS', 'FAIL', 'N/A', 'UNKNOWN'];
const GATE_PATTERN = /^\d{3}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function gateNumbers(range: { from: number; to: number }): string[] {
  const result: string[] = [];
  for (let n = range.from; n <= range.to; n += 1) result.push(String(n).padStart(3, '0'));
  return result;
}

/** リリース判定ファイルの形を検査する。空配列なら妥当。 */
export function validateReleaseReview(input: unknown): string[] {
  const errors: string[] = [];
  if (!isRecord(input)) return ['リリース判定ファイルの中身がオブジェクトではありません'];

  if (typeof input.reviewedAt !== 'string' || input.reviewedAt.trim() === '') {
    errors.push('reviewedAt（判定した日時）が空です');
  }
  if (typeof input.head !== 'string' || input.head.trim() === '') {
    errors.push('head（判定した時点のコミット）が空です');
  }
  if (!Array.isArray(input.entries)) {
    errors.push('entries が配列ではありません');
    return errors;
  }

  const seen = new Set<string>();
  input.entries.forEach((raw, index) => {
    const where = `entries[${index}]`;
    if (!isRecord(raw)) {
      errors.push(`${where}: 判定がオブジェクトではありません`);
      return;
    }
    const gate = raw.gate;
    if (typeof gate !== 'string' || !GATE_PATTERN.test(gate)) {
      errors.push(`${where}: gate は 001 のような3桁です（実際: ${String(gate)}）`);
    } else {
      const n = Number(gate);
      if (n < 1 || n > OPTIONAL_GATE_RANGE.to) {
        errors.push(`${where}: gate ${gate} は 001〜100 の範囲外です`);
      }
      if (seen.has(gate)) errors.push(`${where}: gate ${gate} が重複しています`);
      seen.add(gate);
    }
    if (!VERDICTS.includes(raw.verdict as GateVerdict)) {
      errors.push(
        `${where}: verdict は ${VERDICTS.join(' / ')} です（実際: ${String(raw.verdict)}）`,
      );
      return;
    }
    // 証拠のない PASS を弾く。これがこのファイルの一番の目的。
    if (
      raw.verdict === 'PASS' &&
      (typeof raw.evidence !== 'string' || raw.evidence.trim() === '')
    ) {
      errors.push(`${where}: PASS には evidence（何を見てそう判定したか）が必要です`);
    }
    if (raw.verdict === 'N/A' && (typeof raw.reason !== 'string' || raw.reason.trim() === '')) {
      errors.push(`${where}: N/A には reason（なぜ当てはまらないか）が必要です`);
    }
  });

  return errors;
}

export function parseReleaseReview(input: unknown): ReleaseReview {
  const errors = validateReleaseReview(input);
  if (errors.length > 0) {
    throw new Error(
      `リリース判定ファイルに問題があります:\n${errors.map((e) => `  - ${e}`).join('\n')}`,
    );
  }
  return input as ReleaseReview;
}

export interface ReleaseDecision {
  allowed: boolean;
  /** リリースを止めている理由。空ならリリース可。 */
  blockers: string[];
  /** 止めはしないが残っている問題。 */
  open: string[];
}

/**
 * リリースしてよいかを決める。
 *
 * 001〜080 は全て PASS（証拠つき）か N/A（理由つき）でなければならない。
 * **判定が書かれていない Gate は UNKNOWN として扱う**。書き忘れを「問題なし」に読み替えない。
 */
export function decideRelease(review: ReleaseReview): ReleaseDecision {
  const byGate = new Map(review.entries.map((entry) => [entry.gate, entry]));
  const blockers: string[] = [];
  const open: string[] = [];

  for (const gate of gateNumbers(REQUIRED_GATE_RANGE)) {
    const entry = byGate.get(gate);
    if (entry === undefined) {
      blockers.push(`Gate ${gate}: 判定が書かれていません（UNKNOWN として扱います）`);
      continue;
    }
    if (entry.verdict === 'FAIL' || entry.verdict === 'UNKNOWN') {
      blockers.push(`Gate ${gate}: ${entry.verdict}`);
    }
  }

  for (const gate of [
    ...gateNumbers(CONDITIONAL_GATE_RANGE),
    ...gateNumbers(OPTIONAL_GATE_RANGE),
  ]) {
    const entry = byGate.get(gate);
    if (entry === undefined || entry.verdict === 'FAIL' || entry.verdict === 'UNKNOWN') {
      open.push(`Gate ${gate}: ${entry?.verdict ?? '判定なし'}`);
    }
  }

  return { allowed: blockers.length === 0, blockers, open };
}

export function formatReleaseDecision(decision: ReleaseDecision): string {
  const lines: string[] = [];
  if (decision.allowed) {
    lines.push('公開してよい状態です（必須の確認 001〜080 に、未確認も不合格もありません）。');
  } else {
    lines.push(`公開できません。必須の確認に ${decision.blockers.length} 件の問題があります。`);
    lines.push('');
    for (const blocker of decision.blockers.slice(0, 20)) lines.push(`  - ${blocker}`);
    if (decision.blockers.length > 20) {
      lines.push(`  ほか ${decision.blockers.length - 20} 件`);
    }
  }
  if (decision.open.length > 0) {
    lines.push('');
    lines.push(`公開は止めないが残っている問題: ${decision.open.length} 件`);
  }
  return lines.join('\n');
}
