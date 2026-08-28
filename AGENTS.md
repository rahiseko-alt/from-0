# AGENTS.md

本リポジトリで作業するすべてのコーディングエージェント（Claude Code / Codex ほか）共通の指示です。
このファイルが唯一の正本で、ツール固有ファイルはここへのポインタに徹します。

**目的**: Claude Code と Codex で共用できる、公式準拠のリポジトリ雛形そのものを作ること。
このリポジトリを雛形として使い始めたら、この行を実際のプロジェクトの目的に書き換えてください。

## 応答と作業の進め方

- **既存資産の活用を最初に検討する。コードを書くのは最終手段。** 順に、このリポジトリの既存コード →
  過去の実装と成功・失敗の記録 → GitHub や公式ドキュメントで公開されている OSS → 新規実装
- **迎合しない。** 同意できない点は率直に述べる。相手の指摘が正しければその場で認めて直す
- **確度の低い情報には `[曖昧]` を付ける。** 未検証の推測、原文で確認していない仕様、環境によって
  変わる値が対象。タグを付けずに断定しない
- **説明は非エンジニアにも分かる言葉で書く。** ただし不要な例え話と幼稚な言い回しはしない。
  専門用語を使うときは短く補う
- **作業報告は「何をどうしたか」だけ書く。** 経緯・背景・検討過程は聞かれるまで書かない
- 態度と言葉遣いは常に丁寧に保つ

## セッション間の引継ぎ

@docs/handoff.md

**作業を始める前に、上の引継ぎ（`docs/handoff.md`）を必ず読んでください。**
前回のセッションが残した現在地・完了したこと・次の一手・注意点が書いてあります。

Claude Code では上の `@` import がセッション開始時に自動で展開されます。import は
workspace trust に依存せず、コンパクション後も再注入されるため、フックより確実です。
**Codex はこの import を展開しません。** 自分でファイルを開いて読んでください。

引継ぎは**このファイルだけ読めば再開できる**状態に保ちます。

- 未コミットの変更が残っていると、Stop フックが**1セッションに1回だけ**更新を求めます
- セッション終了時、フックがブランチと HEAD と変更ファイルを末尾に自動記録します
- 明示的に更新するときは `/handoff` を実行してください

**更新したらコミットしてください。** コミットしないと次のセッションに残りません。

## 根拠の記録

`AGENTS.md` と `.claude/settings.json` を変更する前に、**`docs/decisions.md` を読んでください。**
変更してよい項目と、変えると壊れる項目が区別してあります。変更したら該当行も更新します。

記入の作法:

- 各行を **公式** か **判断** に区分する
- **公式** — Claude Code 公式ドキュメントに明記がある項目。**出典 URL を必ず併記する**
- **判断** — 公式に規定がない項目。**理由と、変更してよい条件を必ず併記する**
- 原文で確認していない仕様を **公式** に分類しない。確認していなければ **判断** にするか `[曖昧]` を付ける

## 前提環境

Node 22 / pnpm / TypeScript 5 / ESM。**npm と yarn は使わないでください。**

バージョンの正本は `package.json` の `engines` と `packageManager` です。`.npmrc` の
`engine-strict=true` により、条件を満たさない環境では `pnpm install` が失敗します。

## コマンド

```bash
pnpm install
pnpm run check    # format:check + typecheck + test。コミット前に必ず通す
pnpm run test     # Vitest（監視は test:watch）
pnpm run build    # tsc で dist/ に出力
pnpm run format   # Prettier で整形
```

## ディレクトリと主要ファイル

```
AGENTS.md              全エージェント共通の指示（このファイル・正本）
CLAUDE.md              @AGENTS.md の import のみ。中身は書かない
.claude/settings.json  Claude Code の権限設定（チーム共有）
.claude/skills/        スキル。/handoff は引継ぎの更新手順
.github/workflows/     CI。ジョブ名 check は Ruleset の必須チェック名と一致する
docs/handoff.md        セッション間の引継ぎ。このファイルから import している
docs/decisions.md      各設定の根拠。公式由来か選択の結果かを区別した記録
src/                   アプリケーションコードとテスト（*.test.ts）
tsconfig.json          型チェック用。テストを含む全ファイルが対象
tsconfig.build.json    ビルド用。テストを除外する
```

`tsconfig` を2つに分けているのは、テストを型検査の対象に含めつつ `dist/` には出力しないためです。

## コーディング規約

- **型**: `strict` 前提。`any` は使わない。やむを得ない場合は理由をコメントで残す
- **命名**: 変数・関数は `camelCase`、型・クラスは `PascalCase`、定数は `UPPER_SNAKE_CASE`、ファイル名は `kebab-case.ts`
- **フォーマット**: Prettier に一任し、手で整形し直さない。設定値の正本は `.prettierrc.json` と
  `.editorconfig` であり、このファイルではない（値を二重に持つと食い違ったとき判断できなくなるため）。
  Claude Code では PostToolUse フックが編集直後に Prettier を自動実行する
- **コメント**: 「何をしているか」ではなく「なぜそうしたか」を書く

## Git 運用

- ブランチ名: `feat/*` `fix/*` `chore/*` `docs/*` `ci/*`
- コミットメッセージ: Conventional Commits（`feat:` `fix:` `chore:` `docs:` `ci:`）
- **PR を出す前に `pnpm run check` と `pnpm run build` を通す**
- `main` への直接 push は禁止（Ruleset で強制済み）

## やってはいけないこと

- **`git push --force` と履歴の書き換え**（Ruleset でも禁止済み）
- **`.env` と鍵ファイル（`*.pem` `*.key`）の読み書き**。新しい環境変数は `.env.example` にキー名だけを追加する
- **`pnpm-lock.yaml` の手編集**。`pnpm` コマンドで再生成する（`.claude/settings.json` で deny 済み）
- **`dist/` の編集**。ビルド生成物なので `src/` を直す（同上）
- **CI のジョブ名 `check` の改名**。Ruleset の必須チェックが外れて PR がマージ不能になる。
  改名するなら Ruleset の Require status checks も同時に更新する

## 落とし穴

- **ESM のため、相対 import には拡張子 `.js` を付ける**（`./foo.ts` ではなく `./foo.js`）。TypeScript の `NodeNext` 仕様
- **`CLAUDE.md` に「AGENTS.md に従うこと」と文章で書いても機能しない。** `@` から始まるパス記法だけが読み込みを発生させる
- **Claude Code ではファイル編集の直後に Prettier が自動で走る**（`.claude/hooks/format.sh`）。整形済みの内容が正となるため、書いた直後に差分が出ても異常ではない
- **`.ts` を編集すると型検査がバックグラウンドで走る**（`.claude/hooks/typecheck.sh`）。失敗した場合だけ結果が差し戻されるので、無言なら成功
- **`Explore` と `Plan` のサブエージェントは `CLAUDE.md`（＝このファイル）を読まない**（公式仕様。他のサブエージェントは読む）。この2つに守らせたい制約は、委譲するときのプロンプトに書き直すこと
- **worktree に入ってもフックの `${CLAUDE_PROJECT_DIR}` はメインのチェックアウトを指したまま**（公式仕様）。worktree 側のパスが必要なフックは、標準入力 JSON の `cwd` フィールドを読む

## 指示ファイルの構成

Claude Code と Codex で同じリポジトリを扱うため、指示をこのファイルに集約しています。

- **Codex** は `AGENTS.md` を直接読む
- **Claude Code は `AGENTS.md` を直接読まない**。そのため `CLAUDE.md` の先頭に `@AGENTS.md` と書いて import している
  - 参考: [How Claude remembers your project](https://code.claude.com/docs/en/memory)

指示を追加・変更するときは、このファイルを編集してください。`CLAUDE.md` に書いてよいのは Claude Code 固有の内容だけです。

個人設定は `.claude/settings.local.json` と `CLAUDE.local.md`（いずれも gitignore 済み）へ。チーム共有の設定は `.claude/settings.json` にあります。

このファイルと各設定の**根拠**（どの項目が公式ドキュメント由来で、どれが選択の結果か）は
`docs/decisions.md` に分けてあります。設定を変更する前に一度目を通してください。
コンテキストを消費しないよう、意図的に `@` で import していません。
