#!/usr/bin/env node
/**
 * 全体計画（docs/plan.json）の検証。
 *
 * 全体計画は一度だけ作り、以降は本文を書き換えない。変更してよいのは各項目の status と、
 * 末尾への新項目の追記だけ。この制約は人間の注意力では守れないため、ここで機械的に検証する。
 *
 * **このファイルは依存関係ゼロの素の JavaScript です。** プロジェクト本体が Python でも
 * Go でも React でも、Node さえあればそのまま動きます。雛形の技術構成に縛られないための措置。
 *
 *   node scripts/check-plan.mjs              docs/plan.json を検証する
 *   node scripts/check-plan.mjs <path>       指定したファイルを検証する
 */

import { readFileSync } from 'node:fs';
import { argv, exit } from 'node:process';

/** 確認手段。ci は自動で確かめられる、human は人間が実物を見るしかない。 */
export const AUTOMATIONS = ['ci', 'human'];

/**
 * 項目の状態。awaiting_human は AI 側の作業が終わり、人間の確認だけが残っている状態。
 * 溜めて一括で聞くため、完了とは別の状態として持つ。
 */
export const STATUSES = ['todo', 'awaiting_human', 'done'];

/** 当初計画か、途中で追加されたか。進捗を別枠で表示するために持つ。 */
export const ORIGINS = ['initial', 'added'];

const ID_PATTERN = /^T\d{3,}$/;

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringArray(value) {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

/**
 * 計画を検証し、違反を全て返す。空配列なら妥当。
 *
 * 最初の違反で打ち切らないのは、書いた人が一度に全部直せるようにするため。
 */
export function validatePlan(input) {
  const errors = [];

  if (!isRecord(input)) {
    return ['計画ファイルの中身がオブジェクトではありません'];
  }
  if (typeof input.goal !== 'string' || input.goal.trim() === '') {
    errors.push('goal（大計画のゴール）が空です');
  }
  if (!Array.isArray(input.items)) {
    errors.push('items が配列ではありません');
    return errors;
  }

  const seen = new Set();
  let previousNumber = 0;

  input.items.forEach((raw, index) => {
    const where = `items[${index}]`;
    if (!isRecord(raw)) {
      errors.push(`${where}: 項目がオブジェクトではありません`);
      return;
    }

    if (typeof raw.id !== 'string' || !ID_PATTERN.test(raw.id)) {
      errors.push(`${where}: id は T001 のような形式にしてください（実際: ${String(raw.id)}）`);
    } else {
      if (seen.has(raw.id)) {
        errors.push(`${where}: id ${raw.id} が重複しています`);
      }
      seen.add(raw.id);

      // 番号は不変・単調増加。追加は必ず末尾へ最大値+1 で行うため、
      // 順序が崩れていること自体が「既存項目を書き換えた」証拠になる。
      const current = Number(raw.id.slice(1));
      if (current <= previousNumber) {
        const prev = `T${String(previousNumber).padStart(3, '0')}`;
        errors.push(`${where}: id ${raw.id} が昇順ではありません（直前は ${prev}）`);
      }
      previousNumber = Math.max(previousNumber, current);
    }

    if (typeof raw.title !== 'string' || raw.title.trim() === '') {
      errors.push(`${where}: title が空です`);
    }
    if (typeof raw.deliverable !== 'string' || raw.deliverable.trim() === '') {
      errors.push(`${where}: deliverable（できるもの）が空です`);
    }
    if (!isStringArray(raw.verify) || raw.verify.length === 0) {
      errors.push(
        `${where}: verify（確かめ方）が空です。確かめ方を書けない項目は粒度が大きすぎます`,
      );
    }
    if (!isStringArray(raw.dependsOn)) {
      errors.push(`${where}: dependsOn が文字列の配列ではありません`);
    }
    if (!isStringArray(raw.files) || raw.files.length === 0) {
      errors.push(`${where}: files（触るファイル）が空です`);
    }
    if (!AUTOMATIONS.includes(raw.automation)) {
      errors.push(`${where}: automation は ci か human です（実際: ${String(raw.automation)}）`);
    }
    if (!STATUSES.includes(raw.status)) {
      errors.push(
        `${where}: status は todo / awaiting_human / done です（実際: ${String(raw.status)}）`,
      );
    }
    if (!ORIGINS.includes(raw.origin)) {
      errors.push(`${where}: origin は initial か added です（実際: ${String(raw.origin)}）`);
    }
  });

  // 依存先の存在確認は、全 id が出そろってから行う。
  input.items.forEach((raw, index) => {
    if (!isRecord(raw) || !isStringArray(raw.dependsOn)) return;
    for (const dep of raw.dependsOn) {
      if (!seen.has(dep)) {
        errors.push(`items[${index}]: 依存先 ${dep} が計画に存在しません`);
      }
      if (dep === raw.id) {
        errors.push(`items[${index}]: 自分自身に依存しています`);
      }
    }
  });

  return errors;
}

/** 検証を通った計画として読み込む。違反があれば例外を投げる。 */
export function parsePlan(input) {
  const errors = validatePlan(input);
  if (errors.length > 0) {
    throw new Error(`計画ファイルに問題があります:\n${errors.map((e) => `  - ${e}`).join('\n')}`);
  }
  return input;
}

/**
 * 進捗を数える。計画ファイルに進捗を書き込まないのは、複数の AI が同時に働くとき
 * 合計値の書き換えが競合するため。数えれば必ず正しい値になる。
 */
export function countProgress(plan) {
  const tally = (origin) => {
    const items = plan.items.filter((item) => item.origin === origin);
    return { done: items.filter((item) => item.status === 'done').length, total: items.length };
  };
  return {
    initial: tally('initial'),
    added: tally('added'),
    awaitingHuman: plan.items
      .filter((item) => item.status === 'awaiting_human')
      .map((item) => item.id),
  };
}

/**
 * 次に着手する項目を選ぶ。未着手のうち、依存先が全て完了しているもののうち先頭。
 * セッション開始時の「未完の最優先を1つ選ぶ」がこれにあたる。
 */
export function nextItem(plan) {
  const done = new Set(plan.items.filter((item) => item.status === 'done').map((item) => item.id));
  return plan.items.find(
    (item) => item.status === 'todo' && item.dependsOn.every((dep) => done.has(dep)),
  );
}

/**
 * 2 つの項目を同時に進めてよいか。
 * 依存関係がなく、触るファイルも重ならないときだけ並列にできる。
 * worktree で隔離しても main へのマージ時に衝突するため、ファイルの重複も基準に含める。
 */
export function canRunInParallel(a, b) {
  if (a.id === b.id) return false;
  if (a.dependsOn.includes(b.id) || b.dependsOn.includes(a.id)) return false;
  return !a.files.some((file) => b.files.includes(file));
}

/** 追加項目に振る次の id。既存の最大値 +1。既存の番号は動かさない。 */
export function nextId(plan) {
  const max = plan.items.reduce((acc, item) => Math.max(acc, Number(item.id.slice(1))), 0);
  return `T${String(max + 1).padStart(3, '0')}`;
}

/** 人間向けの進捗表示。JSON をそのまま読ませないための一行。 */
export function formatProgress(progress) {
  const { initial, added, awaitingHuman } = progress;
  const parts = [`当初計画 ${initial.done}/${initial.total}`];
  if (added.total > 0) parts.push(`追加分 ${added.done}/${added.total}`);
  if (awaitingHuman.length > 0) parts.push(`確認待ち ${awaitingHuman.length}件`);
  return parts.join('   ');
}

function main() {
  const path = argv[2] ?? 'docs/plan.json';

  let raw;
  try {
    raw = JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    console.error(`${path} を読めませんでした: ${error.message}`);
    exit(1);
  }

  const errors = validatePlan(raw);
  if (errors.length > 0) {
    console.error(`${path} に問題があります:`);
    for (const error of errors) console.error(`  - ${error}`);
    exit(1);
  }

  const progress = countProgress(raw);
  console.log(`${path}: 問題なし（${raw.items.length}項目）`);
  console.log(formatProgress(progress));

  const next = nextItem(raw);
  if (next) console.log(`次の1項目: ${next.id} ${next.title}`);
  if (progress.awaitingHuman.length > 0) {
    console.log(`人間の確認待ち: ${progress.awaitingHuman.join(', ')} → /plan-ask でまとめて聞く`);
  }
}

// 直接実行されたときだけ CLI として動く（import しても副作用がない）。
if (import.meta.url === `file://${argv[1]}`) {
  main();
}
