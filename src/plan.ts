/**
 * 全体計画ファイル（plan.json）の型・検証・グラフ解析。
 *
 * 計画は「今どこまで進んだか」を全員が同じ形で読むための土台。人間の注意力では守れない
 * 制約（番号の不変・依存の整合・信号と実態の一致）を、ここで機械的に検証し CI で毎回まわす。
 *
 * 不変にするのは **id だけ**。`dependsOn` / `files` / `verify` / `deliverable` / `verifyBy` は
 * 現実に合わせて更新してよい（履歴は Git が持っている）。id を消す・使い回す・振り直すことだけを
 * 禁じる。過去のコミット・PR・台帳からの参照を壊さないため。
 */

/**
 * 確かめ方の担い手。
 *
 * - `ci`     — コマンド1本で確かめられる。`verifyCommand` が必須
 * - `agent`  — 実物をなぞる必要があるが、AI が実行できる（ファイルを開く・出力を読む等）
 * - `human`  — 実物を人間が見るしかない（受信箱・印刷結果・住所や金額の正しさ）
 */
export type VerifyBy = 'ci' | 'agent' | 'human';

/**
 * 項目の状態。
 *
 * - `todo`           未着手
 * - `in_progress`    着手中。セッションをまたいでも、ここから再開する
 * - `awaiting_human` AI 側は終わり、人間の確認だけが残っている
 * - `blocked`        外部要因で進められない（相手待ち・仕様未定）
 * - `verified`       独立した検証を通った。**依存を満たすのはこの状態だけ**
 * - `dropped`        やらないと決めた。進捗の分母から外れ、下流を解放しない
 *
 * 「作り終えた」と「確かめた」を1つの値にまとめると、確かめていないものが完了として数えられる。
 * 旧 `done` を廃したのはこのため。
 */
export type Status = 'todo' | 'in_progress' | 'awaiting_human' | 'blocked' | 'verified' | 'dropped';

/** 当初計画か、途中で追加されたか。進捗を別枠で表示するために持つ。 */
export type Origin = 'initial' | 'added';

/** 進捗の分母に数えない状態。取り下げた項目は「終わっていない」でも「終わった」でもない。 */
const UNCOUNTED: readonly Status[] = ['dropped'];

/** これ以上動かない状態。ここに入っていない項目が残っていれば、計画は未完。 */
const TERMINAL: readonly Status[] = ['verified', 'dropped'];

export interface PlanItem {
  /** 不変の識別子。`T` + 3 桁以上の数字。一度振ったら二度と変えない。 */
  id: string;
  /** 一言の名前。 */
  title: string;
  /** 完成すると何ができるか。依存元がこれを読んで判断できるように書く。 */
  deliverable: string;
  /**
   * 確かめ方。人間が画面でたどれる操作の手順として書く。
   * 「テストが通る」ではなく「押す・見る」。空にはできない。
   */
  verify: string[];
  /** 依存する項目の id。 */
  dependsOn: string[];
  /** 触るファイル。作業範囲の関門（scope-guard）が参照するため、隠さず全て挙げる。 */
  files: string[];
  verifyBy: VerifyBy;
  /** `verifyBy` が `ci` のときだけ必須。実際に走らせるコマンド。 */
  verifyCommand?: string;
  status: Status;
  origin: Origin;
  /** 追加項目のみ。どの項目の作業中に判明したか。取り下げたなら、その判断も書く。 */
  note?: string;
}

export interface Plan {
  /** 大計画のゴール。「問題がなければ即リリースできる状態」を書く。 */
  goal: string;
  items: PlanItem[];
}

/** 進捗の内訳。分母は取り下げを除いた件数。 */
export interface Tally {
  verified: number;
  countable: number;
}

export interface Progress {
  initial: Tally;
  added: Tally;
  total: Tally;
  /** 着手中の項目の id。 */
  inProgress: string[];
  /** 人間の確認待ち。溜めてまとめて聞く。 */
  awaitingHuman: string[];
  /** 外部要因で止まっている項目の id。 */
  blocked: string[];
  /** 取り下げた項目の id。分母に入れない。 */
  dropped: string[];
  /** 確かめ方の担い手ごとの未確認件数。「デグレ0」の根拠になるかを判断するために使う。 */
  unverifiedBy: Record<VerifyBy, number>;
}

const ID_PATTERN = /^T\d{3,}$/;
const VERIFY_BYS: readonly VerifyBy[] = ['ci', 'agent', 'human'];
const STATUSES: readonly Status[] = [
  'todo',
  'in_progress',
  'awaiting_human',
  'blocked',
  'verified',
  'dropped',
];
const ORIGINS: readonly Origin[] = ['initial', 'added'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

/**
 * 「何をもって、できたと判断するか」を示す語。
 * これが1つも無い確かめ方は、読んだ人が同じ手順をなぞれない。
 */
const EXPECTED_RESULT_MARKERS = ['確認', '確かめ', '説明してもらう'];

/** 手順として成立する最低限の長さ。「テストが通る」のような一言を弾く。 */
const MIN_VERIFY_STEP_LENGTH = 8;

/**
 * 確かめ方の書き方を検査する。
 *
 * 判定は**項目ごと**に行う。「index.html を開く」「送信ボタンを押す」のような
 * 下ごしらえの手順には期待結果が無くて当然で、1手順ずつ見ると正当な書き方まで弾いてしまう。
 * 見るのは「その項目の確かめ方のどこかに、できたと判断する根拠が書かれているか」。
 */
export function validateVerifySteps(steps: readonly string[]): string[] {
  const errors: string[] = [];

  for (const step of steps) {
    if (step.trim().length < MIN_VERIFY_STEP_LENGTH) {
      errors.push(`確かめ方「${step}」が短すぎます。何をどうすると何が起きるかを書いてください`);
    }
  }

  const hasExpectedResult = steps.some((step) =>
    EXPECTED_RESULT_MARKERS.some((marker) => step.includes(marker)),
  );
  if (!hasExpectedResult) {
    errors.push(
      '確かめ方に、何をもって「できた」と判断するかが書かれていません（例:「pnpm run test を実行し、新しいテストが通ることを確認する」）',
    );
  }

  return errors;
}

/**
 * 計画ファイルを検証し、違反を全て返す。空配列なら妥当。
 *
 * 最初の違反で打ち切らないのは、書いた人が一度に全部直せるようにするため。
 */
export function validatePlan(input: unknown): string[] {
  const errors: string[] = [];

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

  const seen = new Set<string>();
  let previousNumber = 0;

  input.items.forEach((raw, index) => {
    const where = `items[${index}]`;
    if (!isRecord(raw)) {
      errors.push(`${where}: 項目がオブジェクトではありません`);
      return;
    }

    const id = raw.id;
    if (typeof id !== 'string' || !ID_PATTERN.test(id)) {
      errors.push(`${where}: id は T001 のような形式にしてください（実際: ${String(id)}）`);
    } else {
      if (seen.has(id)) {
        errors.push(`${where}: id ${id} が重複しています`);
      }
      seen.add(id);

      // 番号は不変・単調増加。追加は必ず末尾へ最大値+1 で行うため、
      // 順序が崩れていること自体が「番号を振り直した」証拠になる。
      const current = Number(id.slice(1));
      if (current <= previousNumber) {
        errors.push(
          `${where}: id ${id} が昇順ではありません（直前は T${String(previousNumber).padStart(3, '0')}）`,
        );
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
    } else {
      for (const violation of validateVerifySteps(raw.verify)) {
        errors.push(`${where}: ${violation}`);
      }
    }
    if (!isStringArray(raw.dependsOn)) {
      errors.push(`${where}: dependsOn が文字列の配列ではありません`);
    }
    if (!isStringArray(raw.files) || raw.files.length === 0) {
      errors.push(`${where}: files（触るファイル）が空です`);
    }
    if (!VERIFY_BYS.includes(raw.verifyBy as VerifyBy)) {
      errors.push(`${where}: verifyBy は ci / agent / human です（実際: ${String(raw.verifyBy)}）`);
    }
    // `ci` を名乗るなら、実際に走らせるコマンドを持っていること。
    // 「自動で確かめられる」という信号だけがあってコマンドが無い状態を作らせない。
    if (raw.verifyBy === 'ci') {
      if (typeof raw.verifyCommand !== 'string' || raw.verifyCommand.trim() === '') {
        errors.push(
          `${where}: verifyBy が ci の項目には verifyCommand（実際に走らせるコマンド）が必要です`,
        );
      }
    } else if (raw.verifyCommand !== undefined) {
      errors.push(`${where}: verifyCommand は verifyBy が ci の項目にだけ書けます`);
    }
    if (!STATUSES.includes(raw.status as Status)) {
      errors.push(
        `${where}: status は ${STATUSES.join(' / ')} です（実際: ${String(raw.status)}）`,
      );
    }
    if (!ORIGINS.includes(raw.origin as Origin)) {
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
export function parsePlan(input: unknown): Plan {
  const errors = validatePlan(input);
  if (errors.length > 0) {
    throw new Error(`計画ファイルに問題があります:\n${errors.map((e) => `  - ${e}`).join('\n')}`);
  }
  return input as Plan;
}

/**
 * 進捗を数える。計画ファイルに合計値を書き込まないのは、複数の AI が同時に働くとき
 * 書き換えが競合するため。数えれば必ず正しい値になる。
 *
 * 分母から取り下げ（dropped）を外す。取り下げを完了として数えると、やらないと決めたものが
 * 達成率を押し上げる（実際に3項目でこれが起きた）。
 */
export function countProgress(plan: Plan): Progress {
  const tally = (items: readonly PlanItem[]): Tally => ({
    verified: items.filter((item) => item.status === 'verified').length,
    countable: items.filter((item) => !UNCOUNTED.includes(item.status)).length,
  });
  const ids = (status: Status) =>
    plan.items.filter((item) => item.status === status).map((item) => item.id);

  const unverifiedBy: Record<VerifyBy, number> = { ci: 0, agent: 0, human: 0 };
  for (const item of plan.items) {
    if (TERMINAL.includes(item.status)) continue;
    unverifiedBy[item.verifyBy] += 1;
  }

  return {
    initial: tally(plan.items.filter((item) => item.origin === 'initial')),
    added: tally(plan.items.filter((item) => item.origin === 'added')),
    total: tally(plan.items),
    inProgress: ids('in_progress'),
    awaitingHuman: ids('awaiting_human'),
    blocked: ids('blocked'),
    dropped: ids('dropped'),
    unverifiedBy,
  };
}

/**
 * 次の一手。`undefined` を返さないのは、「全部終わった」と「詰まっている」と「計画が壊れている」を
 * 呼び出し側が区別できないまま同じ扱いをしてしまうため（実際にそうなっていた）。
 */
export type PlanCursor =
  | { kind: 'READY'; item: PlanItem }
  | { kind: 'WAITING_HUMAN'; ids: string[] }
  | { kind: 'BLOCKED'; ids: string[] }
  | { kind: 'BROKEN'; problems: string[] }
  | { kind: 'COMPLETED' };

/** 依存を満たす状態。**`verified` だけ**。作っただけの項目に下流を積ませない。 */
function verifiedIds(plan: Plan): Set<string> {
  return new Set(plan.items.filter((item) => item.status === 'verified').map((item) => item.id));
}

/** いま着手できる項目。着手中のものを先に返す（再開が最優先）。 */
export function readyItems(plan: Plan): PlanItem[] {
  const satisfied = verifiedIds(plan);
  const ready = plan.items.filter(
    (item) =>
      (item.status === 'todo' || item.status === 'in_progress') &&
      item.dependsOn.every((dep) => satisfied.has(dep)),
  );
  return [
    ...ready.filter((item) => item.status === 'in_progress'),
    ...ready.filter((item) => item.status === 'todo'),
  ];
}

/** 次に着手する項目を、理由つきで返す。 */
export function nextCursor(plan: Plan): PlanCursor {
  const problems = diagnosePlan(plan);
  if (problems.length > 0) return { kind: 'BROKEN', problems };

  const ready = readyItems(plan);
  const first = ready[0];
  if (first !== undefined) return { kind: 'READY', item: first };

  const awaiting = plan.items.filter((item) => item.status === 'awaiting_human');
  if (awaiting.length > 0) {
    return { kind: 'WAITING_HUMAN', ids: awaiting.map((item) => item.id) };
  }

  const remaining = plan.items.filter((item) => !TERMINAL.includes(item.status));
  if (remaining.length > 0) return { kind: 'BLOCKED', ids: remaining.map((item) => item.id) };

  return { kind: 'COMPLETED' };
}

/**
 * 依存グラフの構造的な壊れを検出する。ここで挙がるものは、どれだけ作業しても解けない。
 *
 * `nextCursor` はこれが空でないかぎり項目を返さない。壊れた計画の上で作業を続けると、
 * 「進んでいるように見えるが、決して終わらない」状態になる。
 */
export function diagnosePlan(plan: Plan): string[] {
  const problems: string[] = [];
  const byId = new Map(plan.items.map((item) => [item.id, item]));

  for (const item of plan.items) {
    for (const dep of item.dependsOn) {
      if (!byId.has(dep)) {
        problems.push(`${item.id} の依存先 ${dep} が計画に存在しません`);
      }
    }
  }

  // 取り下げた項目は永久に verified にならない。それに依存している生きた項目も永久に着手できない。
  for (const item of plan.items) {
    if (TERMINAL.includes(item.status)) continue;
    for (const dep of item.dependsOn) {
      if (byId.get(dep)?.status === 'dropped') {
        problems.push(
          `${item.id} は取り下げた ${dep} に依存しています（${item.id} も取り下げるか、依存を外してください）`,
        );
      }
    }
  }

  for (const cycle of findCycles(plan)) {
    problems.push(`依存が循環しています: ${cycle.join(' → ')}`);
  }

  return problems;
}

/**
 * 依存の循環を全て挙げる。返すのは循環に含まれる id の並びで、先頭 id を2度目に踏んだ形。
 * 深さ優先で辿り、いま辿っている経路上に戻ったら循環とみなす。
 */
export function findCycles(plan: Plan): string[][] {
  const byId = new Map(plan.items.map((item) => [item.id, item]));
  const state = new Map<string, 'visiting' | 'done'>();
  const path: string[] = [];
  const cycles: string[][] = [];
  const seenCycles = new Set<string>();

  const walk = (id: string): void => {
    if (state.get(id) === 'done') return;
    if (state.get(id) === 'visiting') {
      const start = path.indexOf(id);
      const cycle = [...path.slice(start), id];
      // 同じ循環を、入り口を変えて何度も報告しない。
      const key = [...cycle].slice(0, -1).sort().join(',');
      if (!seenCycles.has(key)) {
        seenCycles.add(key);
        cycles.push(cycle);
      }
      return;
    }
    state.set(id, 'visiting');
    path.push(id);
    for (const dep of byId.get(id)?.dependsOn ?? []) {
      if (byId.has(dep)) walk(dep);
    }
    path.pop();
    state.set(id, 'done');
  };

  for (const item of plan.items) walk(item.id);
  return cycles;
}

/**
 * `plan:doctor` の中身。構造的な壊れに加えて、
 * 「未完の項目が残っているのに、誰も着手できず、誰の確認も待っていない」行き止まりを見る。
 */
export function doctorPlan(plan: Plan): string[] {
  const problems = [...diagnosePlan(plan)];
  if (problems.length > 0) return problems;

  const remaining = plan.items.filter((item) => !TERMINAL.includes(item.status));
  if (remaining.length === 0) return problems;

  const stuck =
    readyItems(plan).length === 0 &&
    remaining.every((item) => item.status !== 'awaiting_human' && item.status !== 'blocked');
  if (stuck) {
    problems.push(
      `未完の項目が ${remaining.length} 件残っていますが、着手できる項目が1件もありません（${remaining
        .map((item) => item.id)
        .join(', ')}）`,
    );
  }
  return problems;
}

/**
 * 前の版から消えた・番号を振り直した id を挙げる。
 * 1つのファイルだけを見ても検出できないため、呼び出し側が過去の版を渡す。
 */
export function findRemovedIds(previous: readonly string[], current: readonly string[]): string[] {
  const now = new Set(current);
  return previous.filter((id) => !now.has(id));
}

/**
 * 2 つの項目を同時に進めてよいか。
 *
 * **並列は現在凍結中**（`AGENTS.md`「並列で進める」）。この判定は依存とファイルの重複しか
 * 見ておらず、スキーマ・外部 API・環境変数・生成物のような共有資源を見ていない。
 * 凍結を解くときは、その宣言を計画に足してからにすること。
 */
export function canRunInParallel(a: PlanItem, b: PlanItem): boolean {
  if (a.id === b.id) return false;
  if (a.dependsOn.includes(b.id) || b.dependsOn.includes(a.id)) return false;
  return !a.files.some((file) => b.files.includes(file));
}

/** 追加項目に振る次の id。既存の最大値 +1。既存の番号は動かさない。 */
export function nextId(plan: Plan): string {
  const max = plan.items.reduce((acc, item) => Math.max(acc, Number(item.id.slice(1))), 0);
  return `T${String(max + 1).padStart(3, '0')}`;
}
