# design.md — 更新ボタンの設計

## 方針
既存の `loadData()`（constituents.json / heatmap.json を取得して `state.rows` を作り、
日経平均表示を更新する処理）を「初回読み込み」と「更新ボタン」の両方から呼べるように
共通化する。ボタン押下時は `render()` も呼び直し、選択中の期間はそのまま使う
（`state.metric` は変えないので自然に維持される）。

## UIの変更（index.html）
`.meta`（更新時刻の行）に更新ボタンを追加する。ヒートマップ本体の見た目は変えない。

```html
<p class="meta">
  <button type="button" id="refresh-btn" class="refresh-btn">
    <span class="refresh-icon" aria-hidden="true">↻</span>更新
  </button>
  <span id="updated">読み込み中…</span>
  <span class="sep">／</span>
  <span>株価は約15〜20分遅れ</span>
  <span id="refresh-error" class="refresh-error" role="status" hidden></span>
</p>
```

- `#refresh-btn`: 押すと再取得を開始。
- `#refresh-error`: 失敗時だけ表示する小さな注意文（例:「更新に失敗しました」）。
  既存のヒートマップ・日経平均の表示は消さない。

## JSの変更（assets/app.js）

### 1. `loadData()` を再利用可能にする
現状の `loadData()` はそのまま「取得して `state.rows` と日経平均表示を更新する関数」
として使う（変更ほぼなし）。呼び出し側を初回読み込みと更新ボタンの2箇所にする。

### 2. キャッシュ対策
GitHub Pages配信のJSONをブラウザ/中間キャッシュに邪魔されず取り直すため、
`fetch` に `{ cache: "no-store" }` を指定する（初回・更新共通）。

### 3. 更新ボタンの処理フロー
```js
async function refresh() {
  if (refreshBtn.disabled) return; // 二重実行防止
  setRefreshing(true);
  hideRefreshError();
  try {
    await loadData();
    render();
  } catch (err) {
    console.error(err);
    showRefreshError("更新に失敗しました。時間をおいて再試行してください。");
  } finally {
    setRefreshing(false);
  }
}
```
- `setRefreshing(true)`: ボタンを `disabled` にし、アイコンに回転クラスを付ける
  （CSSアニメーション）。ラベルは「更新中…」に変える。
- `setRefreshing(false)`: 元に戻す。
- 失敗時は既存表示（前回のヒートマップ・日経平均）をそのまま維持し、
  `#refresh-error` にメッセージを出す。次に更新が成功した時点で消す。

### 4. イベント登録
`setupControls()` 内で `refreshBtn.addEventListener("click", refresh)` を追加。

## CSSの変更（assets/style.css）
- `.refresh-btn`: 既存 `.controls button` に近い見た目（丸みのある枠ボタン）だが、
  `.meta` の文字サイズに合わせて小さめにする。
- `.refresh-icon.spinning`: `@keyframes spin` で360度回転をループさせ、更新中を表現。
- `.refresh-error`: `var(--loss)`寄りの色（エラー色）で小さく表示。

## 影響範囲
- `index.html` / `assets/app.js` / `assets/style.css` のみ変更。
- `data/*.json` の形式・`scripts/fetch_prices.py`・GitHub Actionsは変更しない。
- 既存の期間切り替え・ツールチップ・レスポンシブ挙動には影響しない
  （`render()` を呼び直すだけなので、期間切り替えと同じコードパスを通る）。

## やらないこと（今回のスコープ外）
- Yahoo Financeへの即時アクセス（B案）。
- 自動更新（一定間隔でのポーリング）。今回はユーザーが手動で押したときのみ。
