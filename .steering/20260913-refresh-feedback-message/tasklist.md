# tasklist.md — 更新結果メッセージの実装タスク

## 1. HTML
- [x] `#refresh-error` → `#refresh-message`（id/class）にリネーム

## 2. CSS
- [x] `.refresh-error` → `.refresh-message` にリネーム
- [x] `.refresh-message.success` / `.info` / `.error` の色分け

## 3. JS
- [x] `state.lastUpdatedAt` を追加
- [x] `loadData()` が `{ hasData, isSameUpdate }` を返すようにする
- [x] `showRefreshMessage(text, kind)` / `hideRefreshMessage()`（旧 `showRefreshError`/`hideRefreshError` を置き換え、自動非表示タイマー付き）
- [x] `refresh()` を新しい判定ロジックに合わせて更新
  - 成功＋新データあり → 「更新しました。」
  - 新データなし（同じupdated_at／中身が空） → 「データがありません。」
  - 取得失敗 → 「更新できません。」
- [x] 変数名 `refreshErrorEl` → `refreshMessageEl` に統一

## 4. 動作確認
- [x] 初回読み込み時にはメッセージが出ない
- [x] 更新ボタン押下で、データに変化があれば「更新しました。」が数秒表示されて消える
- [x] `heatmap.json` を一時的に前回と同じ内容にして更新すると「データがありません。」が出る
- [x] オフラインにして更新すると「更新できません。」が出て、既存表示は壊れない
- [x] 連続で更新ボタンを押しても、メッセージが正しく切り替わる（前のタイマーが残らない）
- [x] スマホ幅・ダークモードで見た目が崩れない（ユーザー確認済み）

## 完了条件
- 更新ボタンを押した結果が「更新しました。」「データがありません。」
  「更新できません。」のいずれかで必ず分かる
