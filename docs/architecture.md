# 技術仕様書 — 日経平均225 ヒートマップ

## テクノロジースタック

| 層 | 技術 | 備考 |
|---|---|---|
| ホスティング | GitHub Pages（main / root を配信） | 静的のみ。ビルド工程なし |
| フロントエンド | 素の HTML / CSS / JavaScript（ES2020） | フレームワーク不使用 |
| 可視化 | d3.js v7（`assets/d3.v7.min.js` に同梱） | CDN不使用。treemap / scale / selection を利用 |
| 定期バッチ | GitHub Actions + Python 3.12 | `.github/workflows/update-data.yml` |
| 株価取得 | yfinance（Yahoo Finance 非公式） | pandas 依存 |
| 銘柄マスタ | JPX「東証上場銘柄一覧」由来の静的JSON | 再取得は手動（リバランス時） |

## 開発ツールと手法
- ドキュメント先行（`docs/` と `.steering/`）。CLAUDE.md のワークフローに従う。
- ビルド／バンドラなし。ファイルをそのまま配置。
- ローカル確認は `python -m http.server`。

## 技術的制約
- サーバーサイドの実行環境を持てない（GitHub Pages は静的配信のみ）。
  → 動的データは Actions が生成した JSON を介してのみ供給する。
- Actions のスケジュール実行は数分〜十数分遅延しうる。分単位の精度は保証しない。
- Yahoo Finance は非公式。銘柄によっては一時的に欠損しうる前提で設計する。
- ブラウザから外部APIを直接叩かない（CORS・レート制限・鍵管理を避けるため）。

## パフォーマンス要件
- 初回表示: JSON 2ファイル（合計 ~100KB 未満）＋ d3（~280KB）。1〜2秒以内の描画を目標。
- 再描画（期間切替・リサイズ）: 225ノードの treemap 再計算。体感遅延なし（<100ms 目安）。

## セキュリティ / プライバシー
- 個人情報・認証情報を一切扱わない。Cookie・localStorage も未使用。
- Actions は `contents: write` 権限のみ。`GITHUB_TOKEN` で自リポジトリへ push。
