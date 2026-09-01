# design.md — 初回実装の設計

## 全体構成（サーバーなし）

```
[GitHub Actions（自動の取り込み役）]
   1時間おき（平日・日本時間9〜16時）に起動
   └ scripts/fetch_prices.py を実行
        ├ 225銘柄の株価を Yahoo Finance からまとめて取得
        ├ 1日前・1週間前・1ヶ月前の終値、最新値、時価総額を計算
        └ data/heatmap.json を書き出して git commit / push
                    │
                    ▼
[GitHub Pages（公開ページ）]  ← main ブランチをそのまま配信
   index.html + assets/（JavaScript, CSS, d3.js）
        ├ data/constituents.json（225銘柄の名前・業種。固定ファイル）
        └ data/heatmap.json（最新の株価。Actionsが毎時更新）
   → ブラウザ上でツリーマップを描画
```

## ファイル構成
| パス | 役割 |
|---|---|
| `index.html` | ページ本体（最小限のHTML） |
| `assets/style.css` | 配色・レイアウト（ライト/ダーク対応） |
| `assets/app.js` | JSON読み込み → ツリーマップ描画 → 期間切替・ツールチップ |
| `assets/d3.v7.min.js` | 描画ライブラリ（同梱。CDN不使用） |
| `data/constituents.json` | 225銘柄の `code / name / sector`（JPX公表データ由来、固定） |
| `data/heatmap.json` | `updated_at` と各銘柄の価格・騰落率・時価総額（自動生成） |
| `scripts/fetch_prices.py` | 株価取得スクリプト |
| `scripts/requirements.txt` | `yfinance`, `pandas` |
| `.github/workflows/update-data.yml` | 定期実行の設定 |

## data/heatmap.json の形
```json
{
  "updated_at": "2026-09-01T14:05:00+09:00",
  "source": "Yahoo Finance (yfinance)",
  "items": [
    { "code": "7203", "price": 3243.0, "market_cap": 38400000000000,
      "chg_1d": 2.76, "chg_1w": 5.2, "chg_1m": 5.7 }
  ]
}
```
- `chg_1d/1w/1m` = 騰落率（％）。基準は「最新終値 ÷ N営業日前の終値 − 1」。
  1週間 = 5営業日前、1ヶ月 = 21営業日前。
- 取得失敗した銘柄は `items` に入れる（price は null、騰落率も null）。フロントでグレー表示。

## 画面設計（ワイヤフレーム）
```
┌───────────────────────────────┐
│ 日経平均225 ヒートマップ                     │
│ 更新: 2026/09/01 14:05  ／ 株価は約15〜20分遅れ  │
│ [ 1日 ] [ 1週間 ] [ 1ヶ月 ]      ← 切替ボタン       │
├───────────────────────────────┤
│ ┌電気機器─────┐┌情報･通信──┐┌自動車──┐ │
│ │■■■ ■■ ■ ││■■ ■ ■  ││■■ ■   │ │
│ │(タイル=時価総額の大きさ, 色=騰落率)        │ │
│ └────────┘└───────┘└──────┘ │
│ … 業種ごとにブロックが続く …                    │
├───────────────────────────────┤
│ 凡例:  -5%〔赤〕 ── 0%〔灰〕 ── +5%〔緑〕        │
│ 投資判断は自己責任で。データは無保証。            │
└───────────────────────────────┘
```
- タップ／ホバーで小さな吹き出し: 「トヨタ自動車 (7203)  3,243円  前日比 +2.76%」

## 色スケール
- d3 の diverging スケール。定義域 −5%〜+5%（外れ値はクランプ）。
- 中央（0%付近）はグレー、プラスは緑、マイナスは赤。色覚に配慮し明度差もつける。

## 自動更新（update-data.yml）
- `on: schedule: cron` を UTC で 0時〜7時台の毎時（＝日本時間 9〜16時台）＋ `workflow_dispatch`（手動実行）。
- 平日のみ（`* * * * 1-5`）。
- 実行内容: Python セットアップ → `pip install -r scripts/requirements.txt` → `python scripts/fetch_prices.py`
  → `data/heatmap.json` に差分があれば commit して push。
- GitHub Pages は「main ブランチ / ルート」を配信する設定にする（Botのpushで自動再デプロイ）。

## 影響範囲
- 新規リポジトリのため既存アプリへの影響なし。
- ポータルの `index.html` にカードを1枚追加（別リポジトリ。別途pushが必要）。

## やらないこと（今回のスコープ外）
- 個別銘柄のチャート表示、検索、お気に入り。
- 秒単位のリアルタイム更新。
- 日経平均そのものの指数値の表示（将来追加可）。
