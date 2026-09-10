"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import ChartPlaceholder from "./ChartPlaceholder";

const chartData = [
  { name: "아파트 A", sale: 31180, jeonse: 20760, percent: 67 },
  { name: "아파트 B", sale: 21320, jeonse: 10860, percent: 51 },
  { name: "아파트 C", sale: 21475, jeonse: 18990, percent: 88 },
  { name: "아파트 D", sale: 21260, jeonse: 17820, percent: 84 },
  { name: "아파트 E", sale: 21520, jeonse: 11040, percent: 51 },
  { name: "아파트 F", sale: 41385, jeonse: 19010, percent: 46 },
];

function formatKoreanMoney(value) {
  const man = Number(value);
  if (!Number.isFinite(man)) return "-";

  const eok = Math.floor(man / 10000);
  const remainder = man % 10000;

  if (eok > 0 && remainder > 0) {
    return `${eok}억 ${remainder.toLocaleString()}만원`;
  }
  if (eok > 0) {
    return `${eok}억`;
  }

  return `${man.toLocaleString()}만원`;
}

function ComplexTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;

  const saleItem = payload.find((item) => item.dataKey === "sale");
  const jeonseItem = payload.find((item) => item.dataKey === "jeonse");

  const rows = [
    saleItem && { key: "sale", label: "매매가", value: saleItem.value, color: "var(--color-chart-sale)" },
    jeonseItem && { key: "jeonse", label: "전세가", value: jeonseItem.value, color: "var(--color-chart-jeonse)" },
  ].filter(Boolean);

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
            {formatKoreanMoney(row.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function JeonseSaleGapChart({ data = chartData }) {
  const maxSaleValue = Math.max(...data.map((item) => Number(item.sale ?? 0)));
  const yAxisDomain = [0, Math.ceil(maxSaleValue * 1.18)];

  return (
    <ChartPlaceholder
      title="전세-매매 갭 분석"
      className="jeonse-sale-gap-chart"
    >
      <div className="jeonse-sale-gap-chart__wrap">
        <div className="jeonse-sale-gap-chart__chart">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 24, right: 8, left: 0, bottom: 0 }}
              barCategoryGap={10}
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
              <YAxis hide domain={yAxisDomain} />
              <Tooltip
                cursor={{ fill: "rgba(17,17,17,0.02)" }}
                content={<ComplexTooltip />}
              />
              <Bar
                dataKey="jeonse"
                stackId="gap"
                fill="var(--color-chart-jeonse)"
                radius={0}
                maxBarSize={48}
              />
              <Bar
                dataKey="sale"
                stackId="gap"
                fill="var(--color-chart-sale)"
                radius={[6, 6, 0, 0]}
                maxBarSize={48}
              >
                <LabelList
                  dataKey="percent"
                  position="top"
                  offset={8}
                  formatter={(value) => `${value}%`}
                  style={{
                    fill: "#374151",
                    fontSize: 12,
                    fontWeight: 700,
                    textAnchor: "middle",
                  }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </ChartPlaceholder>
  );
}
