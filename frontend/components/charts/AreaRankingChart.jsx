"use client";

import { useEffect, useState } from "react";
import ChartPlaceholder from "./ChartPlaceholder";
import { getAreaRanking } from "@/lib/api";

// 생활권 내 단지 랭킹 — 대시보드에 체크된 매물들을, 각자 같은 구(sgg_cd)
// 안의 비슷한 평형 단지들과 평단가로 비교한 순위를 보여준다. 실거래 데이터
// 연결(2026-09): 랭킹 계산 자체(같은 구 필터링, 평단가 산출, 순위 매기기)는
// 이미 백엔드에 구현돼 있는 B-09(GET /items/{size_id}/ranking)를 그대로
// 쓴다 — 새로 계산 로직을 만들 필요가 없었음. items 중 checked && sizeId
// 있는 것만 골라 각자 랭킹을 병렬로 조회한다(다른 실데이터 차트들과 동일한
// 패턴).
function normalizeRankingData(data) {
  return [...data]
    .map((item) => {
      if (item.sampleInsufficient) return item;
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
    .sort((a, b) => {
      // 데이터 부족 항목은 순위를 매길 수 없으니 항상 맨 아래로.
      if (a.sampleInsufficient && b.sampleInsufficient) return 0;
      if (a.sampleInsufficient) return 1;
      if (b.sampleInsufficient) return -1;
      return a.rank - b.rank;
    });
}

export default function AreaRankingChart({ items }) {
  const [rankingData, setRankingData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const checkedItems = (items || []).filter(
    (it) => it.checked && it.sizeId != null
  );
  const checkedKey = checkedItems.map((it) => `${it.id}:${it.sizeId}`).join(",");

  useEffect(() => {
    // 체크된 매물이 없으면 조회를 건너뛴다 — 렌더에서 checkedItems.length로
    // 먼저 안내 문구를 보여주므로 이 경우 rankingData/loading/error는 안 쓰인다.
    if (checkedItems.length === 0) return;

    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 표준 데이터 페칭 패턴(다른 실데이터 차트들과 동일)
    setLoading(true);
    setError(null);

    Promise.all(
      checkedItems.map((item) =>
        getAreaRanking(item.sizeId).then((res) => {
          if (res.error || res.my_rank == null) {
            return { id: item.id, name: item.name, sampleInsufficient: true };
          }
          return {
            id: item.id,
            name: item.name,
            rank: res.my_rank,
            total: res.total,
          };
        })
      )
    )
      .then((rows) => {
        if (cancelled) return;
        setRankingData(rows);
      })
      .catch(() => {
        if (cancelled) return;
        setError("생활권 랭킹 데이터를 불러오지 못했어요. 잠시 후 다시 시도해주세요.");
        setRankingData([]);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- checkedKey가 checkedItems의 실질적인 변경을 대신 표현
  }, [checkedKey]);

  const rankedData = normalizeRankingData(rankingData);

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
          {checkedItems.length === 0 && (
            <div className="area-ranking-chart__empty">
              <img className="chart-empty-icon" src="/empty-state-icon.png" alt="" />
              선택된 매물이 없어요.
            </div>
          )}
          {checkedItems.length > 0 && loading && (
            <div className="area-ranking-chart__empty">
              <img
                className="chart-loading-spinner"
                src="/loading-spinner.gif"
                alt="불러오는 중"
              />
            </div>
          )}
          {checkedItems.length > 0 && !loading && error && (
            <div className="area-ranking-chart__empty">{error}</div>
          )}
          {checkedItems.length > 0 &&
            !loading &&
            !error &&
            rankedData.map((item) => (
              <div key={item.id} className="area-ranking-chart__row">
                <div className="area-ranking-chart__row-name">{item.name}</div>
                {item.sampleInsufficient ? (
                  <>
                    <div className="area-ranking-chart__row-rank">표본 부족</div>
                    <div className="area-ranking-chart__row-percentile">-</div>
                  </>
                ) : (
                  <>
                    <div className="area-ranking-chart__row-rank">
                      전체 {item.total}개 중 {item.rank}등
                    </div>
                    <div className="area-ranking-chart__row-percentile">
                      {item.percentile.toFixed(1)}%
                    </div>
                  </>
                )}
              </div>
            ))}
        </div>
      </div>
    </ChartPlaceholder>
  );
}
