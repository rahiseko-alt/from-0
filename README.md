# from-0

TODO: このリポジトリで何を作るかを記述する。

## セットアップ

```bash
pnpm install
```

Node のバージョンは `.node-version` に固定しています。nvm / fnm / mise などのバージョン管理ツールを
使っていれば自動で切り替わります。合っていない場合は `engine-strict` により install が失敗します。

必要な環境変数は `.env.example` を `.env` にコピーして埋めてください（`.env` はコミットされません）。

## コマンド

| コマンド                | 内容                         |
| ----------------------- | ---------------------------- |
| `pnpm run typecheck`    | 型チェック                   |
| `pnpm run format`       | Prettier で整形              |
| `pnpm run format:check` | 整形差分の検査               |
| `pnpm run check`        | 上記のチェックをまとめて実行 |

## AI エージェント向けの指示について

本リポジトリは Claude Code と Codex の両方で作業することを想定しています。
エージェント向けの指示は **[`AGENTS.md`](./AGENTS.md) に集約**しており、これが唯一の正本です。

- Codex は `AGENTS.md` を直接読みます。
- Claude Code は `AGENTS.md` を直接読まない仕様のため、`CLAUDE.md` の先頭に書いた
  `@AGENTS.md` の import 経由で同じ内容を読み込みます。

指示を追加・変更する際は `AGENTS.md` を編集してください。`CLAUDE.md` には Claude Code 固有の
内容だけを書きます。
