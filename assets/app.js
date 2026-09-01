"use strict";

// 色スケールの定義域（％）。これを超える騰落率は端の色に丸める。
const COLOR_DOMAIN = 5;

const state = {
  metric: "chg_1d", // chg_1d | chg_1w | chg_1m
  rows: [], // constituents と heatmap を結合したもの
};

const chartEl = document.getElementById("chart");
const statusEl = document.getElementById("status");
const updatedEl = document.getElementById("updated");
const tooltipEl = document.getElementById("tooltip");
const legendScaleEl = document.getElementById("legend-scale");

const METRIC_LABEL = {
  chg_1d: "前日比",
  chg_1w: "1週間の変化",
  chg_1m: "1ヶ月の変化",
};

function showStatus(message) {
  statusEl.textContent = message;
  statusEl.hidden = false;
}

function themeColors() {
  const s = getComputedStyle(document.documentElement);
  return {
    // 日本式: 値上がり(プラス)=赤 / 値下がり(マイナス)=緑
    gain: s.getPropertyValue("--gain").trim() || "#d64545",
    neutral: s.getPropertyValue("--neutral").trim() || "#d9d4c8",
    loss: s.getPropertyValue("--loss").trim() || "#2f9e6b",
  };
}

function makeColorScale() {
  const c = themeColors();
  return d3
    .scaleLinear()
    .domain([-COLOR_DOMAIN, 0, COLOR_DOMAIN])
    .range([c.loss, c.neutral, c.gain])
    .clamp(true);
}

// 背景色に対して読みやすい文字色（白 or 濃灰）を返す。
function textColorOn(fill) {
  const c = d3.color(fill);
  if (!c) return "#1a1a1a";
  const { r, g, b } = c.rgb();
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#1a1a1a" : "#ffffff";
}

function formatPct(value) {
  if (value === null || value === undefined) return "―";
  return (value > 0 ? "+" : "") + value.toFixed(2) + "%";
}

function formatPrice(value) {
  if (value === null || value === undefined) return "―";
  return value.toLocaleString("ja-JP") + "円";
}

function formatUpdated(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const p = (n) => String(n).padStart(2, "0");
  return `更新: ${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(
    d.getHours()
  )}:${p(d.getMinutes())}`;
}

async function loadData() {
  const [constituents, heatmap] = await Promise.all([
    fetch("data/constituents.json").then((r) => {
      if (!r.ok) throw new Error("constituents.json");
      return r.json();
    }),
    fetch("data/heatmap.json").then((r) => {
      if (!r.ok) throw new Error("heatmap.json");
      return r.json();
    }),
  ]);

  const priceByCode = new Map(heatmap.items.map((it) => [it.code, it]));
  state.rows = constituents.map((c) => {
    const p = priceByCode.get(c.code) || {};
    return {
      code: c.code,
      name: c.name,
      sector: c.sector,
      price: p.price ?? null,
      market_cap: p.market_cap ?? null,
      chg_1d: p.chg_1d ?? null,
      chg_1w: p.chg_1w ?? null,
      chg_1m: p.chg_1m ?? null,
    };
  });

  updatedEl.textContent = formatUpdated(heatmap.updated_at);
}

function buildHierarchy(width, height) {
  const bySector = d3.group(state.rows, (d) => d.sector);
  const root = {
    name: "root",
    children: Array.from(bySector, ([sector, stocks]) => ({
      name: sector,
      children: stocks,
    })),
  };

  const hierarchy = d3
    .hierarchy(root)
    .sum((d) => (d.market_cap && d.market_cap > 0 ? d.market_cap : 0))
    .sort((a, b) => b.value - a.value);

  d3
    .treemap()
    .tile(d3.treemapSquarify)
    .size([width, height])
    .paddingOuter(3)
    .paddingTop(16)
    .paddingInner(1)
    .round(true)(hierarchy);

  return hierarchy;
}

function render() {
  const width = Math.max(chartEl.clientWidth, 320);
  const height = Math.min(Math.max(width * 0.82, 600), 1100);
  const color = makeColorScale();
  const hierarchy = buildHierarchy(width, height);

  d3.select(chartEl).selectAll("svg").remove();
  const svg = d3
    .select(chartEl)
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("width", width)
    .attr("height", height);

  // 業種ラベル
  svg
    .selectAll("text.sector-label")
    .data(hierarchy.children || [])
    .join("text")
    .attr("class", "sector-label")
    .attr("x", (d) => d.x0 + 3)
    .attr("y", (d) => d.y0 + 12)
    .text((d) => (d.x1 - d.x0 > 46 ? d.data.name : ""));

  // 銘柄タイル
  const leaf = svg
    .selectAll("g.leaf")
    .data(hierarchy.leaves())
    .join("g")
    .attr("class", "leaf")
    .attr("transform", (d) => `translate(${d.x0},${d.y0})`);

  const neutralColor = themeColors().neutral;
  hierarchy.leaves().forEach((d) => {
    const v = d.data[state.metric];
    d.__fill = v === null || v === undefined ? neutralColor : color(v);
  });

  leaf
    .append("rect")
    .attr("class", "tile")
    .attr("width", (d) => Math.max(0, d.x1 - d.x0))
    .attr("height", (d) => Math.max(0, d.y1 - d.y0))
    .attr("fill", (d) => d.__fill);

  leaf.each(function (d) {
    const w = d.x1 - d.x0;
    const h = d.y1 - d.y0;
    const g = d3.select(this);
    if (w < 32 || h < 16) return;
    const ink = textColorOn(d.__fill);
    const shortName = d.data.name.length > 6 ? d.data.name.slice(0, 6) : d.data.name;
    g.append("text")
      .attr("class", "tile-label")
      .attr("x", 3)
      .attr("y", 12)
      .attr("fill", ink)
      .text(w > 58 ? shortName : d.data.code);
    if (w > 46 && h > 28) {
      g.append("text")
        .attr("class", "tile-sub")
        .attr("x", 3)
        .attr("y", 23)
        .attr("fill", ink)
        .text(formatPct(d.data[state.metric]));
    }
  });

  // ツールチップ
  leaf
    .on("pointerenter pointermove", (event, d) => showTooltip(event, d.data))
    .on("pointerleave", hideTooltip)
    .on("click", (event, d) => {
      event.stopPropagation();
      showTooltip(event, d.data);
    });

  legendScaleEl.textContent = `色の基準: ${
    METRIC_LABEL[state.metric]
  }（−${COLOR_DOMAIN}%〜+${COLOR_DOMAIN}%、それ以上は端の色）`;
}

function showTooltip(event, row) {
  const chg = row[state.metric];
  const cls = chg > 0 ? "chg-up" : chg < 0 ? "chg-down" : "";
  tooltipEl.innerHTML = `
    <strong>${row.name}</strong>（${row.code}）<br />
    <span class="muted">${row.sector}</span><br />
    株価: ${formatPrice(row.price)}<br />
    ${METRIC_LABEL[state.metric]}: <span class="${cls}">${formatPct(chg)}</span>
  `;
  tooltipEl.hidden = false;

  const pad = 12;
  const rect = tooltipEl.getBoundingClientRect();
  let x = event.clientX + pad;
  let y = event.clientY + pad;
  if (x + rect.width > window.innerWidth - 8) x = event.clientX - rect.width - pad;
  if (y + rect.height > window.innerHeight - 8) y = event.clientY - rect.height - pad;
  tooltipEl.style.left = Math.max(8, x) + "px";
  tooltipEl.style.top = Math.max(8, y) + "px";
}

function hideTooltip() {
  tooltipEl.hidden = true;
}

function setupControls() {
  document.querySelectorAll(".controls button").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".controls button")
        .forEach((b) => b.classList.toggle("active", b === btn));
      state.metric = btn.dataset.metric;
      render();
    });
  });

  document.addEventListener("click", hideTooltip);
  window.addEventListener("scroll", hideTooltip, { passive: true });

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(render, 150);
  });

  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", render);
}

(async function main() {
  setupControls();
  try {
    await loadData();
    render();
  } catch (err) {
    console.error(err);
    showStatus(
      "データを読み込めませんでした。時間をおいて再読み込みしてください。"
    );
  }
})();
