# 日経平均225 ヒートマップ

日経平均株価の採用225銘柄の値動きを、業種ごとの色分けタイル（ツリーマップ）で一覧できる
Webページです。サーバーは持たず、GitHub Pages だけで動きます。

- タイルの**大きさ** … 会社の規模（時価総額の概算 ＝ 発行株数 × 株価）
- タイルの**色** … 選んだ期間の騰落率（緑＝値上がり／赤＝値下がり）
- 期間切り替え … 「1日 / 1週間 / 1ヶ月」

公開URL: https://git-san-934.github.io/nikkei-heatmap/

## 仕組み

```
GitHub Actions（平日9〜16時台に毎時）
  └ scripts/fetch_prices.py … Yahoo Finance から225銘柄の株価を取得
       └ data/heatmap.json を更新して commit / push
GitHub Pages（main ブランチをそのまま配信）
  └ index.html + assets/ が heatmap.json を読んで描画
```

| ファイル | 役割 |
|---|---|
| `index.html`, `assets/` | 画面（HTML / CSS / JavaScript / d3.js 同梱） |
| `data/constituents.json` | 225銘柄の証券コード・社名・33業種区分（固定。JPX公表データ由来） |
| `data/heatmap.json` | 最新の株価・騰落率・時価総額（Actions が自動更新） |
| `scripts/fetch_prices.py` | 株価取得スクリプト |
| `.github/workflows/update-data.yml` | 定期実行の設定 |

## 公開手順（最初の1回だけ）

1. GitHub で空のリポジトリ `nikkei-heatmap` を作成する。
2. このフォルダで push する（自分のターミナルから）:
   ```
   cd /d "C:\Users\a\Desktop\nikkei-heatmap"
   git remote add origin git@github.com:git-san-934/nikkei-heatmap.git
   git push -u origin main
   ```
3. GitHub の **Settings → Pages → Source** で「Deploy from a branch」を選び、
   ブランチ `main` / フォルダ `/ (root)` を指定して保存する。
4. **Actions** タブを開き、「株価データ更新」を選んで「Run workflow」を1回手動実行する
   （初回のデータ更新と動作確認）。

数分後に公開URLでヒートマップが表示されます。以降は平日に自動更新されます。

## ローカルで確認する

```
python scripts/fetch_prices.py      # data/heatmap.json を更新
python -m http.server 8000          # http://localhost:8000 を開く
```

## 注意

Yahoo Finance のデータは非公式・無保証で、約15〜20分遅れです。取得できない銘柄が
一時的に出た場合、そのタイルは灰色で表示されます。本ページは情報提供のみを目的とし、
投資勧誘ではありません。
