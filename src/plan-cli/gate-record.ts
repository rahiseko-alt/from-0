import { appendFileSync, existsSync } from 'node:fs';

import { isMain } from './is-main.js';

/**
 * 放置台帳への記録（`pnpm run gate:record -- <Gate番号> <BACKLOG|IGNORE|NEARMISS> "<対象箇所>"`）。
 *
 * 台帳は導入以来ほとんど書かれなかった。書かなくても何も起きない構造だったため。
 * 会話の語を数えるフックで止める案もあったが、語の一致は安全装置にならない
 * （書いたつもりの言葉が無ければ素通りする）。**書く側の手数を1コマンドに減らす**ほうを取った。
 * フック（`neglect-check.sh`）は書き忘れの最終検出に格下げしてある。
 */
export const NEGLECT_LOG_PATH = 'docs/neglected-log.md';

export type GateAction = 'BACKLOG' | 'IGNORE' | 'NEARMISS';

export const GATE_ACTIONS: readonly GateAction[] = ['BACKLOG', 'IGNORE', 'NEARMISS'];

const ACTION_LABEL: Record<GateAction, string> = {
  BACKLOG: '今回は直さず、あとで直す',
  IGNORE: '直さないと決めた',
  NEARMISS: '触れたが破ってはいない（ヒヤリハット）',
};

/** UTC の「YYYY-MM-DD HH:MM UTC」。既存の記録と同じ形にそろえる。 */
export function formatStamp(now: Date): string {
  const iso = now.toISOString();
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`;
}

export function formatEntry(
  now: Date,
  gate: string,
  action: GateAction,
  target: string,
  note: string,
): string {
  const lines = [
    '',
    `### ${formatStamp(now)}`,
    '',
    `- 触れたGate: \`${gate}\``,
    `- 対象箇所: ${target}`,
    `- 対応: ${action}（${ACTION_LABEL[action]}）`,
  ];
  if (note.trim() !== '') lines.push(`- ${note.trim()}`);
  return `${lines.join('\n')}\n`;
}

if (isMain(import.meta.url)) {
  const [gate, action, target, ...noteParts] = process.argv.slice(2);

  if (
    gate === undefined ||
    !/^\d{3}$/.test(gate) ||
    action === undefined ||
    !GATE_ACTIONS.includes(action as GateAction) ||
    target === undefined ||
    target.trim() === ''
  ) {
    console.error(
      '使い方: pnpm run gate:record -- <Gate番号3桁> <BACKLOG|IGNORE|NEARMISS> "<対象箇所>" ["<補足>"]',
    );
    process.exitCode = 2;
  } else if (!existsSync(NEGLECT_LOG_PATH)) {
    console.error(`${NEGLECT_LOG_PATH} がありません。`);
    process.exitCode = 2;
  } else {
    appendFileSync(
      NEGLECT_LOG_PATH,
      formatEntry(new Date(), gate, action as GateAction, target, noteParts.join(' ')),
    );
    console.log(`${NEGLECT_LOG_PATH} に Gate ${gate} の記録を追記しました。`);
  }
}
