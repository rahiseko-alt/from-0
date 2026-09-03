---
name: release-review
description: 公開前の確認。製品全体を Gate 001〜100 で証拠つきに判定し、docs/release-review.json に書いて pnpm run release:check に可否を決めさせる。大計画のゴールに到達したときだけ使う。1件の問題の仕分けには issue-triage を使うこと。
---

# 公開前の確認

**対象は製品全体です。**「今回の変更」ではありません。判定は文章ではなくファイルに書き、
**可否はコマンドが決めます**（自分で「公開してよい」と宣言しないこと）。

正本は `docs/test-policy.md`「Release Review（公開前の確認）」。

## 前提

この手順に入ってよいのは `pnpm run plan:state` が `RELEASE_GATE_REQUIRED` を返すときだけです。
それ以外の工程で走らせても意味がありません（項目が残っていれば、その項目を先に終わらせる）。

## 手順

### 1. 判定する

`docs/test-policy.md` の Gate 001〜100 を上から全て判定します。**飛ばさないこと。**

| 判定      | 条件                     | 必須の欄   |
| --------- | ------------------------ | ---------- |
| `PASS`    | 証拠つきで確認した       | `evidence` |
| `FAIL`    | 問題がある               | —          |
| `N/A`     | この製品に当てはまらない | `reason`   |
| `UNKNOWN` | 確認できなかった         | —          |

**「たぶん」「コードを見る限り」「問題なさそう」は証拠ではありません。** 確認できないものは
`UNKNOWN` です。`UNKNOWN` を `PASS` に書き換えて通すのは、この手順の目的そのものを壊します。

許される証拠は `docs/test-policy.md`「Evidence Rule」のとおり（自動テスト成功・型検査成功・
build 成功・実際の API レスポンス・DB 状態確認・E2E 成功・再現手順による確認・仕様との照合）。

### 2. 書く

`docs/release-review.json` に書きます。

```json
{
  "reviewedAt": "2026-09-03T12:00:00Z",
  "head": "<git rev-parse --short HEAD の結果>",
  "entries": [
    { "gate": "001", "verdict": "N/A", "reason": "物理的な動作を伴う機能が無い" },
    { "gate": "002", "verdict": "PASS", "evidence": "未ログインで /admin を開き 403 を確認" }
  ]
}
```

### 3. 判定させる

```bash
pnpm run release:check
```

**この出力をそのまま報告してください。** 自分で結論を書き足さないこと。

- 通った → `pnpm run plan:state` が `RELEASE_READY` になります
- 通らなかった → 001〜080 の `FAIL` / `UNKNOWN` / 未記入が理由です。直してからやり直します

### 4. 直す場合

`FAIL` は `/issue-triage` の手順で処理します（001〜080 はその場で直す）。直したら
`head` を新しいコミットに更新し、影響した Gate を再判定します。

## やらないこと

- **「全部 PASS です」と文章で言わない。** ファイルに書いてコマンドに通す
- **判定していない Gate を省略しない。** 省略は UNKNOWN と同じ扱いになり、公開が止まります
- 081〜100 の未解決を理由に公開を止めない（止めるのは 001〜080 だけ）
