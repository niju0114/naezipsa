"use client";

import ChartPlaceholder from "./ChartPlaceholder";

const chartData = [
  { name: "아파트A", rank: 1, total: 28 },
  { name: "아파트B", rank: 3, total: 17 },
  { name: "아파트C", rank: 5, total: 16 },
  { name: "아파트D", rank: 8, total: 25 },
  { name: "아파트E", rank: 12, total: 12 },
];

function normalizeRankingData(data) {
  return [...data]
    .map((item) => {
      const total = Number(item.total) || 1;
      const rank = Number(item.rank) || 1;
      const percentile = Math.max((rank / total) * 100, 0);

      return {
        ...item,
        total,
        rank,
        percentile,
      };
    })
    .sort((a, b) => a.rank - b.rank);
}

export default function AreaRankingChart({ data = chartData }) {
  const rankedData = normalizeRankingData(data);

  return (
    <ChartPlaceholder
      title="생활권 내 단지 랭킹"
      className="area-ranking-chart"
    >
      <div
        className="area-ranking-chart__wrap"
        style={{ display: "flex", flexDirection: "column", gap: 10 }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.6fr 1.1fr 0.8fr",
            alignItems: "center",
            gap: 12,
            padding: "0 8px 4px",
            fontSize: 12,
            fontWeight: 700,
            color: "#6b7280",
            letterSpacing: "-0.02em",
          }}
        >
          <div>아파트 이름</div>
          <div>랭킹</div>
          <div style={{ justifySelf: "end" }}>상위 %</div>
        </div>

        {rankedData.map((item) => (
          <div
            key={item.name}
            style={{
              display: "grid",
              gridTemplateColumns: "1.6fr 1.1fr 0.8fr",
              alignItems: "center",
              gap: 8,
              minHeight: 36,
              background: "rgba(17, 17, 17, 0.02)",
              border: "1px solid rgba(17, 17, 17, 0.1)",
              borderRadius: 6,
              padding: "6px 8px",
            }}
          >
            <div
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: "#1a1a1a",
                letterSpacing: "-0.03em",
              }}
            >
              {item.name}
            </div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: "#1a1a1a",
                letterSpacing: "-0.03em",
              }}
            >
              전체 {item.total}개 중 {item.rank}등
            </div>
            <div
              style={{
                justifySelf: "end",
                fontSize: 14,
                fontWeight: 700,
                color: "#0bb76d",
                letterSpacing: "-0.03em",
              }}
            >
              {item.percentile.toFixed(1)}%
            </div>
          </div>
        ))}
      </div>
    </ChartPlaceholder>
  );
}
