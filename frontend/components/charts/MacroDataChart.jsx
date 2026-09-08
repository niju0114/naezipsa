"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import ChartPlaceholder from "./ChartPlaceholder";

const chartData = [
  { month: "1월", value: 96.4 },
  { month: "2월", value: 98.2 },
  { month: "3월", value: 100.6 },
  { month: "4월", value: 101.8 },
  { month: "5월", value: 103.2 },
  { month: "6월", value: 104.8 },
  { month: "7월", value: 103.7 },
  { month: "8월", value: 105.4 },
];

export default function MacroDataChart({ data = chartData }) {
  const latestValue = data[data.length - 1]?.value ?? 0;
  const previousValue = data[data.length - 2]?.value ?? latestValue;
  const delta = (((latestValue - previousValue) / previousValue) * 100).toFixed(
    1,
  );

  return (
    <ChartPlaceholder title="거시 데이터" className="macro-data-chart">
      <div className="macro-data-chart__wrap">
        <div className="macro-data-chart__header">
          <div>
            <div className="macro-data-chart__eyebrow">매매가격지수</div>
            <div className="macro-data-chart__value">
              {latestValue.toFixed(1)}
            </div>
          </div>
          <span className="macro-data-chart__badge">
            {delta > 0 ? "+" : ""}
            {delta}%
          </span>
        </div>

        <div className="macro-data-chart__chart">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 10, right: 12, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="macroAreaFill" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-primary)"
                    stopOpacity={0.38}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-primary)"
                    stopOpacity={0.05}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                vertical={false}
                stroke="var(--color-border-subtle)"
                strokeDasharray="4 4"
              />
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tickMargin={8}
                tick={{ fontSize: 11, fill: "var(--color-text-muted)" }}
              />
              <YAxis hide domain={["dataMin - 5", "dataMax + 5"]} />
              <Tooltip
                cursor={{
                  stroke: "var(--color-border-strong)",
                  strokeWidth: 1,
                }}
                contentStyle={{
                  fontSize: 14,
                  borderRadius: 12,
                  border: "1px solid var(--color-border)",
                  background: "rgba(255,255,255,0.96)",
                  boxShadow: "0 8px 20px rgba(17,17,17,0.08)",
                }}
                labelStyle={{ fontSize: 12, fontWeight: 700 }}
                itemStyle={{ fontSize: 12, color: "#374151" }}
                formatter={(value) => [
                  `${Number(value).toFixed(1)}`,
                  "매매가격지수",
                ]}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="var(--color-primary)"
                strokeWidth={3}
                fill="url(#macroAreaFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </ChartPlaceholder>
  );
}
