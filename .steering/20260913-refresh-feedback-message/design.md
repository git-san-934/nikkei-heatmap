# design.md — 更新結果メッセージの設計

## 方針
既存の `#refresh-error`（失敗時のみ表示していた欄）を、成功／データなし／失敗の
3種類すべてに使う汎用の結果表示欄に変える。分かりやすさのため要素名も
`#refresh-message` に変更する。

`loadData()` に、今回の取得が「使えるデータだったか」「前回と同じ更新時刻か」を
判定して返す責務を持たせ、`refresh()` 側でその結果からメッセージを出し分ける。
初回読み込み（ページを開いた直後）ではメッセージは出さない（更新ボタンを
押したときだけ表示する）。

## HTML の変更（index.html）
```html
<span id="refresh-message" class="refresh-message" role="status" hidden></span>
```
（`id`/`class` を `refresh-error` → `refresh-message` にリネーム）

## JS の変更（assets/app.js）

### 1. 前回の更新時刻を state に持つ
```js
const state = {
  metric: "chg_1d",
  rows: [],
  lastUpdatedAt: null, // 直前に表示していた heatmap.updated_at
};
```

### 2. `loadData()` が判定結果を返す
```js
async function loadData() {
  const [constituents, heatmap] = await Promise.all([...]); // 変更なし

  state.rows = constituents.map(...); // 変更なし

  const hasData = heatmap.items.some(
    (it) => it.price !== null && it.price !== undefined
  );
  const isSameUpdate =
    state.lastUpdatedAt !== null && state.lastUpdatedAt === heatmap.updated_at;
  state.lastUpdatedAt = heatmap.updated_at;

  updatedEl.textContent = formatUpdated(heatmap.updated_at);
  renderIndexQuote(heatmap.nikkei225);

  return { hasData, isSameUpdate };
}
```
- `hasData`: 1銘柄でも price が入っていれば true。
- `isSameUpdate`: 前回表示していた `updated_at` と同じなら true
  （＝サーバー側でまだ新しいデータが作られていない）。
- 初回読み込み時は `state.lastUpdatedAt` が `null` なので `isSameUpdate` は
  常に false になる（初回に「データがありません」と誤判定しない）。

### 3. メッセージ表示ヘルパー
```js
let refreshMessageTimer = null;

function showRefreshMessage(text, kind) {
  clearTimeout(refreshMessageTimer);
  refreshMessageEl.textContent = text;
  refreshMessageEl.className = "refresh-message " + kind; // success | info | error
  refreshMessageEl.hidden = false;
  refreshMessageTimer = setTimeout(() => {
    refreshMessageEl.hidden = true;
  }, 4000);
}

function hideRefreshMessage() {
  clearTimeout(refreshMessageTimer);
  refreshMessageEl.hidden = true;
}
```

### 4. `refresh()` でメッセージを出し分ける
```js
async function refresh() {
  if (refreshBtn.disabled) return;
  setRefreshing(true);
  hideRefreshMessage();
  try {
    const { hasData, isSameUpdate } = await loadData();
    render();
    if (!hasData || isSameUpdate) {
      showRefreshMessage("データがありません。", "info");
    } else {
      showRefreshMessage("更新しました。", "success");
    }
  } catch (err) {
    console.error(err);
    showRefreshMessage("更新できません。", "error");
  } finally {
    setRefreshing(false);
  }
}
```
- 「データがありません」の場合も `render()` は呼ぶ（既存表示のままでも、
  取得できた最新値で描き直しても実害はないため。中身が空なら結果的に
  見た目は変わらない）。

## CSS の変更（assets/style.css）
`.refresh-error` を `.refresh-message` にリネームし、種類ごとに色を出し分ける。
```css
.refresh-message { font-size: 0.8rem; }
.refresh-message.success { color: var(--text-sub); }
.refresh-message.info { color: var(--text-sub); }
.refresh-message.error { color: var(--accent); }
```

## 影響範囲
- `index.html` / `assets/app.js` / `assets/style.css` のみ。
- `data/*.json` の形式・GitHub Actionsは変更しない。
- 既存の更新ボタンの二重実行防止・回転アイコンの挙動は変えない。

## やらないこと（今回のスコープ外）
- メッセージの多言語化。
- 「何件更新されたか」などの詳細な内訳表示（今回はシンプルな一言のみ）。
