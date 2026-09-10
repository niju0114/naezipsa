"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import ChartPlaceholder from "./ChartPlaceholder";

// 거래량 유동성 — 매매/전세 거래량 기반 유동성 지표.
// 데모 데이터(월별 거래 건수), 추후 국토부 실거래가 API 연동 예정.
const chartData = [
  { name: "아파트 A", sale: 38, jeonse: 52 },
  { name: "아파트 B", sale: 46, jeonse: 61 },
  { name: "아파트 C", sale: 33, jeonse: 47 },
  { name: "아파트 D", sale: 55, jeonse: 58 },
  { name: "아파트 E", sale: 41, jeonse: 66 },
  { name: "아파트 F", sale: 60, jeonse: 44 },
];

const SERIES = [
  { key: "sale", label: "매매", color: "var(--color-chart-sale)" },
  { key: "jeonse", label: "전세", color: "var(--color-chart-jeonse)" },
];

// ComplexTooltip(JeonseSaleGapChart.jsx)과 동일한 스타일 원칙(둥근 카드 +
// 컬러 점 인디케이터 + 라벨/값 정렬 + 넓게 퍼지는 그림자)을 따른다.
function VolumeTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  const rows = SERIES.map((series) => {
    const item = payload.find((p) => p.dataKey === series.key);
    if (!item) return null;
    return { ...series, value: item.value };
  }).filter(Boolean);

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.96)",
        border: "1px solid #e4e5e8",
        borderRadius: 8,
        padding: "6px 10px",
        boxShadow:
          "0 20px 25px -5px rgba(17,17,17,0.1), 0 8px 10px -6px rgba(17,17,17,0.1)",
        minWidth: 130,
        fontSize: 12,
      }}
    >
      <div style={{ color: "#111", fontWeight: 700, padding: "2px 0 4px" }}>
        {label}
      </div>
      {rows.map((row) => (
        <div
          key={row.key}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            padding: "3px 0",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 2,
                background: row.color,
                flexShrink: 0,
              }}
            />
            <span style={{ color: "#6b7280", fontWeight: 500 }}>{row.label}</span>
          </div>
          <span
            style={{
              color: "#111",
              fontWeight: 600,
              fontVariantNumeric: "tabular-nums",
              fontFamily:
                "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
            }}
          >
            {row.value}건
          </span>
        </div>
      ))}
    </div>
  );
}

export default function TradeVolumeLiquidityChart({ data = chartData }) {
  return (
    <ChartPlaceholder title="거래량 유동성" className="trade-volume-liquidity-chart">
      <div className="trade-volume-liquidity-chart__wrap">
        <div className="trade-volume-liquidity-chart__legend">
          {SERIES.map((series) => (
            <span key={series.key} className="trade-volume-liquidity-chart__legend-item">
              <span
                className="trade-volume-liquidity-chart__legend-dot"
                style={{ background: series.color }}
              />
              {series.label}
            </span>
          ))}
        </div>
        <div className="trade-volume-liquidity-chart__chart">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 8, right: 4, left: 0, bottom: 0 }}
              barCategoryGap="24%"
              barGap={4}
            >
              <CartesianGrid
                vertical={false}
                stroke="var(--color-border-subtle)"
                strokeDasharray="4 4"
              />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tickMargin={8}
                tick={{ fontSize: 11, fill: "var(--color-text-muted)" }}
              />
              <Tooltip
                cursor={{ fill: "rgba(17,17,17,0.03)" }}
                content={<VolumeTooltip />}
              />
              {SERIES.map((series) => (
                <Bar
                  key={series.key}
                  dataKey={series.key}
                  fill={series.color}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={16}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </ChartPlaceholder>
  );
}
