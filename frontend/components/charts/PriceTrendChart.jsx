"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import ChartPlaceholder from "./ChartPlaceholder";

const PERIOD_LABELS = {
  "3M": "3개월",
  "1Y": "1년",
  "3Y": "3년",
};

const apartmentNames = [
  "아파트A",
  "아파트B",
  "아파트C",
  "아파트D",
  "아파트E",
  "아파트F",
];

const apartmentColors = {
  아파트A: "#0bb76d",
  아파트B: "#AFD61F",
  아파트C: "#5398FF",
  아파트D: "#968BE0",
  아파트E: "#FFB270",
  아파트F: "#D3D3D3",
};

const monthLabels = [
  "1월",
  "2월",
  "3월",
  "4월",
  "5월",
  "6월",
  "7월",
  "8월",
  "9월",
  "10월",
  "11월",
  "12월",
];

const periodData = {
  "3M": [
    {
      label: "10월",
      아파트A: 1180000000,
      아파트B: 1335000000,
      아파트C: 1515000000,
      아파트D: 1772000000,
      아파트E: 1358000000,
      아파트F: 1899000000,
    },
    {
      label: "11월",
      아파트A: 1215000000,
      아파트B: 1562000000,
      아파트C: 1848000000,
      아파트D: 1293000000,
      아파트E: 1779000000,
      아파트F: 1924000000,
    },
    {
      label: "12월",
      아파트A: 1248000000,
      아파트B: 1396000000,
      아파트C: 1481000000,
      아파트D: 1617000000,
      아파트E: 1905000000,
      아파트F: 1562000000,
    },
  ],
  "1Y": monthLabels.map((month, index) => {
    const monthIndex = 12 - index;

    return {
      label: month,
      아파트A:
        1110000000 + monthIndex * 62000000 + (index % 3 === 0 ? 25000000 : 0),
      아파트B:
        1065000000 + monthIndex * 58000000 + (index % 3 === 1 ? 22000000 : 0),
      아파트C:
        1190000000 + monthIndex * 68000000 + (index % 3 === 2 ? 31000000 : 0),
      아파트D:
        1125000000 + monthIndex * 61000000 + (index % 3 === 0 ? 26000000 : 0),
      아파트E:
        1090000000 + monthIndex * 55000000 + (index % 3 === 1 ? 20000000 : 0),
      아파트F:
        1155000000 + monthIndex * 64000000 + (index % 3 === 2 ? 28000000 : 0),
    };
  }),
  "3Y": [
    {
      label: "2022",
      아파트A: 930000000,
      아파트B: 890000000,
      아파트C: 980000000,
      아파트D: 940000000,
      아파트E: 910000000,
      아파트F: 960000000,
    },
    {
      label: "2023",
      아파트A: 1010000000,
      아파트B: 960000000,
      아파트C: 1060000000,
      아파트D: 1015000000,
      아파트E: 980000000,
      아파트F: 1045000000,
    },
    {
      label: "2024",
      아파트A: 1095000000,
      아파트B: 1035000000,
      아파트C: 1140000000,
      아파트D: 1085000000,
      아파트E: 1055000000,
      아파트F: 1120000000,
    },
    {
      label: "2025",
      아파트A: 1170000000,
      아파트B: 1110000000,
      아파트C: 1220000000,
      아파트D: 1160000000,
      아파트E: 1135000000,
      아파트F: 1195000000,
    },
    {
      label: "2026",
      아파트A: 1245000000,
      아파트B: 1185000000,
      아파트C: 1295000000,
      아파트D: 1235000000,
      아파트E: 1210000000,
      아파트F: 1275000000,
    },
    {
      label: "2027",
      아파트A: 1325000000,
      아파트B: 1260000000,
      아파트C: 1370000000,
      아파트D: 1305000000,
      아파트E: 1280000000,
      아파트F: 1345000000,
    },
  ],
};

function formatPriceLabel(value) {
  const num = Number(value);
  if (Number.isNaN(num)) return "0.0억";

  const eok = num / 100000000;
  const truncated = Math.floor(eok * 10) / 10;
  return `${truncated.toFixed(1)}억`;
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.96)",
        border: "1px solid #e5e7eb",
        borderRadius: 10,
        boxShadow: "0 4px 18px rgba(17, 24, 39, 0.08)",
        padding: "8px 10px",
        fontSize: 12,
        color: "#374151",
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 6, color: "#111827" }}>
        {label}
      </div>
      {payload.map((entry) => (
        <div
          key={entry.dataKey || entry.name}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            marginTop: 4,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: entry.stroke || entry.color || "#374151",
                display: "inline-block",
              }}
            />
            <span style={{ color: "#374151" }}>
              {entry.dataKey || entry.name}
            </span>
          </div>
          <span style={{ color: "#111827", fontWeight: 700 }}>
            {formatPriceLabel(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function PriceTrendChart({ data }) {
  const [activePeriod, setActivePeriod] = useState("1Y");

  const chartData = useMemo(() => {
    if (Array.isArray(data) && data.length > 0) {
      return data;
    }

    return periodData[activePeriod];
  }, [activePeriod, data]);

  const yAxisDomain = useMemo(() => {
    const allValues = chartData.flatMap((entry) =>
      apartmentNames.map((name) => Number(entry[name] ?? 0)),
    );

    const minValue = Math.min(...allValues);
    const maxValue = Math.max(...allValues);

    const padValue = Math.max(50000000, (maxValue - minValue) * 0.12);
    const adjustedMin =
      Math.floor((minValue - padValue) / 100000000) * 100000000;
    const adjustedMax =
      Math.ceil((maxValue + padValue) / 100000000) * 100000000;

    return [adjustedMin, adjustedMax];
  }, [chartData]);

  const yAxisTicks = useMemo(() => {
    const [minValue, maxValue] = yAxisDomain;
    const range = Math.max(1, maxValue - minValue);
    const step = Math.max(
      100000000,
      Math.ceil(range / 5 / 100000000) * 100000000,
    );

    const ticks = [];
    for (let value = minValue; value <= maxValue; value += step) {
      ticks.push(value);
    }
    if (ticks[ticks.length - 1] !== maxValue) {
      ticks.push(maxValue);
    }
    return ticks;
  }, [yAxisDomain]);

  return (
    <ChartPlaceholder title="시세(실거래 데이터 추이)" className="price-trend-chart">
      <div className="price-trend-chart__wrap">
        <div className="price-trend-chart__header">
          <div className="price-trend-chart__period-label">
            최근 {PERIOD_LABELS[activePeriod]} 기준
          </div>

          <label className="price-trend-chart__period-picker">
            <span style={{ color: "#6b7280" }}>기간</span>
            <select
              value={activePeriod}
              onChange={(event) => setActivePeriod(event.target.value)}
              className="price-trend-chart__select"
            >
              <option value="3M">3개월</option>
              <option value="1Y">1년</option>
              <option value="3Y">3년</option>
            </select>
          </label>
        </div>

        <div className="price-trend-chart__chart">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 12, right: 8, left: 0, bottom: 4 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#e5e7eb"
              />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                tick={{ fontSize: 11, fill: "#6b7280", fontWeight: 500 }}
              />
              <YAxis
                width={28}
                domain={yAxisDomain}
                ticks={yAxisTicks}
                tickLine={false}
                axisLine={false}
                tickMargin={2}
                tick={{ fontSize: 11, fill: "#6b7280", fontWeight: 500 }}
                tickFormatter={(value) => `${Math.round(value / 100000000)}억`}
              />
              <Tooltip content={<CustomTooltip />} />

              {apartmentNames.map((name) => (
                <Line
                  key={name}
                  type="monotone"
                  dataKey={name}
                  stroke={apartmentColors[name]}
                  strokeWidth={2.2}
                  dot={false}
                  activeDot={{
                    r: 4,
                    stroke: apartmentColors[name],
                    strokeWidth: 2,
                  }}
                  name={name}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </ChartPlaceholder>
  );
}
