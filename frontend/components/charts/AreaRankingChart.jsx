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
      <div className="area-ranking-chart__wrap">
        <div className="area-ranking-chart__header">
          <div>아파트 이름</div>
          <div>랭킹</div>
          <div className="area-ranking-chart__header-right">상위 %</div>
        </div>

        <div className="area-ranking-chart__list">
          {rankedData.map((item) => (
            <div key={item.name} className="area-ranking-chart__row">
              <div className="area-ranking-chart__row-name">{item.name}</div>
              <div className="area-ranking-chart__row-rank">
                전체 {item.total}개 중 {item.rank}등
              </div>
              <div className="area-ranking-chart__row-percentile">
                {item.percentile.toFixed(1)}%
              </div>
            </div>
          ))}
        </div>
      </div>
    </ChartPlaceholder>
  );
}
