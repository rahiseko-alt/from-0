# 技術構成（見本: Python）

**これは見本です。** 使うときは `docs/stack.md` へコピーし、実際の構成に合わせて直してください。

---

## 前提環境

Python 3.12 / uv。**pip と poetry は使わないでください。**
`pyproject.toml` の `requires-python` により、条件を満たさない環境ではインストールが失敗します。

## コマンド

```bash
uv sync
uv run ruff format --check .   # 整形の確認
uv run ruff check .            # 静的解析
uv run mypy .                  # 型検査
uv run pytest                  # テスト

node scripts/check-plan.mjs    # 全体計画の検証（Node が必要。CI から必ず呼ぶ）
```

`check` に相当するものが1コマンドで無いなら、`Makefile` か `uv run poe check` などで
**1つにまとめてください。** CI のジョブ名 `check` は Ruleset の必須チェックに使われています。

## コーディング規約

- **型**: 型注釈を必ず付ける。`mypy --strict` を通す。`Any` は使わない
- **命名**: 変数・関数は `snake_case`、クラスは `PascalCase`、定数は `UPPER_SNAKE_CASE`、ファイル名は `snake_case.py`
- **フォーマット**: Ruff に一任し、手で整形し直さない
- **コメント**: 「何をしているか」ではなく「なぜそうしたか」を書く

## この構成での落とし穴

- **`node scripts/check-plan.mjs` は Node が要る。** Python だけの環境では動きません。
  CI に Node をインストールする1ステップを入れてください（全体計画を使う場合）
- **`uv.lock` は手編集しない。** `uv` コマンドで再生成する
- **仮想環境（`.venv/`）はコミットしない**
