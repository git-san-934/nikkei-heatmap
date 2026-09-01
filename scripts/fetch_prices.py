"""日経平均225銘柄の株価をまとめて取得し、data/heatmap.json を書き出す。

GitHub Actions（.github/workflows/update-data.yml）から定期実行される。
ローカル実行も可: `python scripts/fetch_prices.py`
"""

from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pandas as pd
import yfinance as yf

ROOT = Path(__file__).resolve().parent.parent
CONSTITUENTS = ROOT / "data" / "constituents.json"
OUTPUT = ROOT / "data" / "heatmap.json"

JST = timezone(timedelta(hours=9))

# 騰落率の基準にする「N営業日前」。日足なので概算。
DAYS_1W = 5
DAYS_1M = 21


def to_symbol(code: str) -> str:
    """証券コード（例 "7203" / "285A"）を Yahoo Finance のシンボルに変換する。"""
    return f"{code}.T"


def pct_change(latest: float, base: float) -> float | None:
    if latest is None or base is None or base == 0:
        return None
    return round((latest / base - 1.0) * 100.0, 2)


def close_series(frame: pd.DataFrame, symbol: str) -> pd.Series | None:
    """まとめ取得した DataFrame から 1 銘柄の終値（欠損除去済み）を取り出す。"""
    try:
        series = frame[symbol]["Close"].dropna()
    except (KeyError, TypeError):
        return None
    return series if not series.empty else None


def fetch_market_caps(symbols: list[str], last_prices: dict[str, float]) -> dict[str, float]:
    """発行株数 × 最新終値 で時価総額を概算する（取得できない銘柄は入れない）。"""
    caps: dict[str, float] = {}
    for symbol in symbols:
        price = last_prices.get(symbol)
        if price is None:
            continue
        try:
            shares = yf.Ticker(symbol).fast_info.get("shares")
        except Exception:
            shares = None
        if shares:
            caps[symbol] = float(shares) * float(price)
    return caps


def main() -> None:
    constituents = json.loads(CONSTITUENTS.read_text(encoding="utf-8"))
    symbols = [to_symbol(c["code"]) for c in constituents]

    print(f"{len(symbols)} 銘柄の株価を取得します...")
    frame = yf.download(
        symbols,
        period="3mo",
        interval="1d",
        group_by="ticker",
        auto_adjust=False,
        threads=True,
        progress=False,
    )

    last_prices: dict[str, float] = {}
    closes: dict[str, pd.Series] = {}
    for symbol in symbols:
        series = close_series(frame, symbol)
        if series is not None:
            closes[symbol] = series
            last_prices[symbol] = float(series.iloc[-1])

    print(f"株価取得できた銘柄: {len(closes)} / {len(symbols)}")
    print("時価総額（発行株数）を取得します...")
    caps = fetch_market_caps(symbols, last_prices)
    print(f"時価総額を計算できた銘柄: {len(caps)} / {len(symbols)}")

    items = []
    for c in constituents:
        symbol = to_symbol(c["code"])
        series = closes.get(symbol)
        if series is None or len(series) < 2:
            items.append(
                {
                    "code": c["code"],
                    "price": None,
                    "market_cap": caps.get(symbol),
                    "chg_1d": None,
                    "chg_1w": None,
                    "chg_1m": None,
                }
            )
            continue

        latest = float(series.iloc[-1])
        prev = float(series.iloc[-2])
        week = float(series.iloc[-1 - DAYS_1W]) if len(series) > DAYS_1W else None
        month = float(series.iloc[-1 - DAYS_1M]) if len(series) > DAYS_1M else None

        items.append(
            {
                "code": c["code"],
                "price": round(latest, 1),
                "market_cap": caps.get(symbol),
                "chg_1d": pct_change(latest, prev),
                "chg_1w": pct_change(latest, week),
                "chg_1m": pct_change(latest, month),
            }
        )

    payload = {
        "updated_at": datetime.now(JST).isoformat(timespec="seconds"),
        "source": "Yahoo Finance (yfinance)",
        "items": items,
    }
    OUTPUT.write_text(
        json.dumps(payload, ensure_ascii=False, indent=1), encoding="utf-8"
    )
    print(f"書き出し完了: {OUTPUT}")


if __name__ == "__main__":
    main()
