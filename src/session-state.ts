/**
 * いま手をつけている項目（`.claude/.session-state.json`）。
 *
 * 「1セッション1項目」「範囲外のファイルを触らない」は指示として書かれていたが、
 * 守らせる装置が無かった。着手時にここへ固定し、`.claude/hooks/scope-guard.sh` が
 * 編集のたびに照合する。ファイルが無い＝関門は働かない（雛形をそのまま使う人の邪魔をしない）。
 *
 * セッションに閉じる情報なので gitignore する。
 */

export const SESSION_STATE_PATH = '.claude/.session-state.json';

export interface SessionState {
  /** 作業中の項目の id。 */
  activeItem: string;
  /** その項目が触ってよいファイル。計画の `files` をそのまま写す。 */
  files: string[];
  /** 固定した日時。 */
  startedAt: string;
}

/**
 * 項目に関係なく、いつでも触ってよいファイル。
 *
 * 引継ぎ・台帳・計画そのものを関門で止めると、「範囲を広げるために計画を直す」ことすら
 * できなくなって詰まる。逆に言えば、ここに挙がっていないファイルを触りたくなったら、
 * **先に計画の `files` を更新する**のが正しい順番。
 */
export const ALWAYS_ALLOWED = [
  'docs/plan.json',
  'docs/checkpoints.json',
  'docs/handoff.md',
  'docs/neglected-log.md',
  'docs/failure-action-log.md',
  'docs/release-review.json',
  SESSION_STATE_PATH,
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** 壊れた記録は「無い」と同じ扱い。読めない記録で編集を止めない。 */
export function parseSessionState(input: unknown): SessionState | undefined {
  if (!isRecord(input)) return undefined;
  if (typeof input.activeItem !== 'string' || input.activeItem === '') return undefined;
  if (!Array.isArray(input.files) || !input.files.every((f) => typeof f === 'string')) {
    return undefined;
  }
  return {
    activeItem: input.activeItem,
    files: input.files as string[],
    startedAt: typeof input.startedAt === 'string' ? input.startedAt : '',
  };
}

/**
 * そのファイルを編集してよいか。
 * パスはリポジトリルートからの相対で渡す（`.claude/hooks/scope-guard.sh` が変換する）。
 */
export function isWithinScope(state: SessionState, relativePath: string): boolean {
  if (ALWAYS_ALLOWED.includes(relativePath)) return true;
  return state.files.some((allowed) => {
    if (allowed === relativePath) return true;
    // 計画の `files` にディレクトリを書いた場合は、その配下を許す。
    return allowed.endsWith('/') && relativePath.startsWith(allowed);
  });
}
