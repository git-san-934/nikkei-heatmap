# tasklist.md — 更新ボタンの実装タスク

## 1. HTML
- [x] `.meta` に `#refresh-btn`（アイコン＋「更新」ラベル）を追加
- [x] `.meta` に `#refresh-error`（`hidden`、`role="status"`）を追加

## 2. CSS
- [x] `.refresh-btn` のスタイル（`.meta` の文字サイズに合わせた枠ボタン）
- [x] `.refresh-icon` の回転アニメーション（更新中表示）
- [x] `.refresh-error` のスタイル（エラー色・小さめ）

## 3. JS
- [x] `fetch` に `cache: "no-store"` を指定（初回・更新共通）
- [x] `setRefreshing(bool)`: ボタンの有効/無効・ラベル・回転アイコンを切り替え
- [x] `showRefreshError(msg)` / `hideRefreshError()`
- [x] `refresh()`: 二重実行防止 → `loadData()` → `render()` → エラー処理
- [x] `setupControls()` に `#refresh-btn` のクリックイベントを追加

## 4. 動作確認
- [x] 初回表示が今まで通り動く
- [x] 更新ボタン押下でヒートマップ・日経平均・更新時刻が再描画される
- [x] 選択中の期間（1日／1週間／1ヶ月）が更新後も維持される
- [x] 連打しても二重実行にならない（ボタンが更新中はdisabled）
- [x] オフライン等で取得失敗させても、既存表示は壊れずエラー文言が出る
- [x] スマホ幅・ダークモードで見た目が崩れない（ユーザー確認済み）

## 完了条件
- 更新ボタンで、ページ再読み込みなしにヒートマップと日経平均株価が最新化される
- 失敗時も画面全体は壊れない
