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

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.96)",
        border: "1px solid #e4e5e8",
        borderRadius: 12,
        padding: "8px 10px",
        boxShadow: "0 8px 20px rgba(17,17,17,0.08)",
        minWidth: 120,
      }}
    >
      {saleItem && (
        <div
          style={{
            color: "#0bb76d",
            fontSize: 12,
            fontWeight: 700,
            lineHeight: 1.6,
          }}
        >
          매매가: {formatKoreanMoney(saleItem.value)}
        </div>
      )}
      {jeonseItem && (
        <div
          style={{
            color: "#999",
            fontSize: 12,
            fontWeight: 700,
            lineHeight: 1.6,
          }}
        >
          전세가: {formatKoreanMoney(jeonseItem.value)}
        </div>
      )}
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
                fill="#D9D9D9"
                radius={0}
                maxBarSize={32}
              />
              <Bar
                dataKey="sale"
                stackId="gap"
                fill="#0bb76d"
                radius={[6, 6, 0, 0]}
                maxBarSize={32}
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
