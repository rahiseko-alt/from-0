# 技術構成

このプロジェクトの言語・ツール・コマンド・規約です。`AGENTS.md` から `@` で読み込まれます。

**このファイルはプロジェクトごとに丸ごと差し替えます。** 雛形をコピーしたら `/project-init`
が用途を聞いて書き換えます。見本は `docs/stack.examples/` にあります。

**構成に関わることは全てここに書いてください。** `AGENTS.md` には書き戻さないこと。
`AGENTS.md` は言語に依存しない運用ルール（引継ぎ・全体計画・台帳・Git 運用）だけを持ちます。

---

## 前提環境

Node 22 / pnpm / TypeScript 5 / ESM。**npm と yarn は使わないでください。**
`.npmrc` の `engine-strict=true` により、条件を満たさない環境では `pnpm install` が失敗します。

## コマンド

```bash
pnpm install
pnpm run check    # format:check + typecheck + test。コミット前に必ず通す
pnpm run test     # Vitest（監視は test:watch）
pnpm run build    # tsc で dist/ に出力
pnpm run format   # Prettier で整形

node scripts/check-plan.mjs   # 全体計画の検証（言語に依存しない。CI から必ず呼ぶ）
```

## コーディング規約

- **型**: `strict` 前提。`any` は使わない
- **命名**: 変数・関数は `camelCase`、型・クラスは `PascalCase`、定数は `UPPER_SNAKE_CASE`、ファイル名は `kebab-case.ts`
- **フォーマット**: Prettier に一任し、手で整形し直さない。正本は `.prettierrc.json` と `.editorconfig`
- **コメント**: 「何をしているか」ではなく「なぜそうしたか」を書く

## この構成での落とし穴

- **ESM のため、相対 import には拡張子 `.js` を付ける**（`./foo.ts` ではなく `./foo.js`）
- **`pnpm-lock.yaml` は手編集しない。** `pnpm` コマンドで再生成する
- **`dist/` は編集しない。** ビルド生成物なので `src/` を直す
- **`scripts/` は `tsconfig.json` の `include`（`src/**/*.ts`）の外にある。** 全体計画の検証を
  素の JavaScript に保つための意図的な配置で、TypeScript 化しないこと
