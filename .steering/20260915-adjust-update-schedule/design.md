# design.md — スケジュール変更の設計

## 方針
`on.schedule` を1本のcron式から、時間帯ごとに分割した複数のcron式に変更する。
GitHub Actionsは`schedule`に複数エントリを列挙でき、いずれか1つでも条件に
一致すればジョブが実行されるため、この方式で「特定の時間帯だけ15分おき」を表現する。

## 時刻変換（JST = UTC+9）
| 日本時間 (JST) | UTC |
|---|---|
| 9:00〜11:30（前場） | 0:00〜2:30 |
| 12:30〜15:30（後場） | 3:30〜6:30 |

この範囲はUTCの日付が変わらないため、曜日指定（`1-5` = 月〜金）はJSTと
UTCで一致する（ずれない）。

## cron式（5行に分割）
```
# 前場: JST 9:00-11:30 = UTC 0:00-2:30
- cron: "*/15 0-1 * * 1-5"   # UTC 0:00,0:15,...,1:45
- cron: "0,15,30 2 * * 1-5"  # UTC 2:00,2:15,2:30
# 後場: JST 12:30-15:30 = UTC 3:30-6:30
- cron: "30,45 3 * * 1-5"    # UTC 3:30,3:45
- cron: "*/15 4-5 * * 1-5"   # UTC 4:00,4:15,...,5:45
- cron: "0,15,30 6 * * 1-5"  # UTC 6:00,6:15,6:30
```
1日あたりの実行回数: 前場11回＋後場13回＝24回（現状8回から増加）。

## 変更しない部分
- `workflow_dispatch: {}`
- `permissions` / `concurrency`
- `jobs.update` のステップ内容（checkout, setup-python, pip install,
  `fetch_prices.py` 実行, git commit & push のロジック）

## 影響範囲
- `.github/workflows/update-data.yml` のみ変更。
- `scripts/fetch_prices.py`、`assets/app.js`、データ形式には一切影響しない。
