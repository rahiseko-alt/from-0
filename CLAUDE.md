@AGENTS.md

<!--
このファイルは意図的にポインタに徹しています。
上の `@AGENTS.md` の1行が、セッション開始時に AGENTS.md を展開して読み込みます。
指示の実体は AGENTS.md に書いてください（Codex と共有するため）。
このセクション以下には、Claude Code 固有の内容だけを追記します。
-->

## Claude Code 固有

- 上位の `AGENTS.md` がこのリポジトリの正本です。矛盾がある場合は `AGENTS.md` を優先してください。
- ツール横断で有効な指示を追加したくなった場合は、このファイルではなく `AGENTS.md` を編集してください。
- 権限まわりのチーム共有設定は `.claude/settings.json` にあります。個人的な上書きが必要な場合は
  `.claude/settings.local.json`（gitignore 済み）に書いてください。
- 読み込み状況を確認するには、セッション内で `/context` を実行し **Memory files** に `CLAUDE.md` が
  出ていることを確認してください。
