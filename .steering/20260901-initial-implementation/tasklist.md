# tasklist.md — 初回実装タスク

## 1. データ準備
- [x] 225銘柄リスト（code / name / sector）を JPX公表データから作成 → `data/constituents.json`
- [x] 描画ライブラリ d3 を同梱 → `assets/d3.v7.min.js`

## 2. 株価取得スクリプト
- [ ] `scripts/requirements.txt`（yfinance, pandas）
- [ ] `scripts/fetch_prices.py`
  - [ ] constituents.json から証券コードを読む
  - [ ] `yfinance` でまとめて2ヶ月分の日足を取得
  - [ ] 各銘柄: 最新終値 / 前日終値 / 5営業日前 / 21営業日前 → 騰落率3種を計算
  - [ ] 発行株数 × 最新終値 で時価総額
  - [ ] `data/heatmap.json` を UTF-8 で書き出し
  - [ ] 取得失敗銘柄は price=null で出力（全体は止めない）
- [ ] ローカルで一度実行して heatmap.json を生成・コミット（初期表示用）

## 3. フロントエンド
- [ ] `index.html`（ヘッダー、切替ボタン、描画エリア、凡例、注意書き）
- [ ] `assets/style.css`（レスポンシブ、ライト/ダーク、色スケール変数）
- [ ] `assets/app.js`
  - [ ] constituents.json と heatmap.json を読み込んで結合
  - [ ] 業種でグループ化し d3.treemap でレイアウト
  - [ ] タイル色 = 選択中の期間の騰落率（diverging 配色, −5〜+5%クランプ）
  - [ ] 「1日 / 1週間 / 1ヶ月」ボタンで再描画
  - [ ] タップ / ホバーでツールチップ
  - [ ] 画面リサイズで再レイアウト
  - [ ] 更新時刻の表示

## 4. 自動更新
- [ ] `.github/workflows/update-data.yml`（平日毎時 + 手動実行、commitして push）

## 5. 公開まわり
- [ ] `README.md`（使い方・公開手順・Pages設定）
- [ ] `.gitignore`
- [ ] （ユーザー作業）GitHub に `nikkei-heatmap` リポジトリを作成して push
- [ ] （ユーザー作業）Settings → Pages → Source =「Deploy from a branch」→ main / (root)
- [ ] （ユーザー作業）Actions タブで update-data を手動実行して動作確認
- [ ] ポータル `index.html` にカード追加 → push

## 完了条件
- https://git-san-934.github.io/nikkei-heatmap/ でヒートマップが表示される
- 期間切替・ツールチップが動く
- 平日に自動でデータが更新される
- ポータルからリンクで開ける
