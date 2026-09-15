"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import ChartPlaceholder from "./ChartPlaceholder";
import { getTradePoints } from "@/lib/api";

// 실거래 분포도 — 대시보드 차트 그리드에서 가장 큰 메인 자리(.chart-main).
// 체크된 매물마다 컬럼 하나씩, 그 안에 기간 내 개별 실거래가를 점으로
// 흩뿌리고 거래가 몰린 구간은 원형 그라데이션 글로우로 표시한다. 호가를
// 입력해둔 매물만 초록 점(입력한 호가)이 추가로 뜬다.
//
// 실데이터 연결(2026-09): 다른 실데이터 차트(PriceTrendChart 등)와 동일한
// 방식 - items 중 checked && sizeId 있는 것만 골라 기간(3/12/36개월)·
// 매매/전세 탭에 맞춰 /items/{size_id}/trade-points(개별 거래 포인트 +
// 기간 내 평균가)를 호출한다.

const TRADE_TYPES = [
  { key: "sale", label: "매매" },
  { key: "jeonse", label: "전세" },
];

const W = 640;
const H = 300;
const PAD_TOP = 16;
const PAD_BOTTOM = 30;
const PAD_LEFT = 54;
const PAD_RIGHT = 14;
const PLOT_TOP = PAD_TOP;
const PLOT_BOTTOM = H - PAD_BOTTOM;
const PLOT_LEFT = PAD_LEFT;
const PLOT_RIGHT = W - PAD_RIGHT;

function percentile(sortedValues, p) {
  if (sortedValues.length === 0) return null;
  const idx = (sortedValues.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sortedValues[lo];
  const t = idx - lo;
  return sortedValues[lo] * (1 - t) + sortedValues[hi] * t;
}

// 점 지터(가로 퍼짐) 위치만 결정하는 용도 - 시드 기반이라 리렌더돼도
// 같은 데이터면 점 위치가 흔들리지 않는다.
function seededRandom(seed) {
  const x = Math.sin(seed * 999.9 + 12.3) * 43758.5453;
  return x - Math.floor(x);
}

// 320000000(원) -> "32.0억". PriceTrendChart의 formatPriceLabel과 동일한
// 규칙(반올림 대신 절삭 + 소수 1자리)으로 앱 전체 표기를 통일한다.
function formatEok(won) {
  if (won == null) return null;
  const eok = won / 100000000;
  const truncated = Math.floor(eok * 10) / 10;
  return `${truncated.toFixed(1)}억`;
}

// "32,000"/"32000"(만원 단위 입력값, dashboardItems.js의 price 필드) -> 원.
// wonToPriceInput의 역변환과 동일한 규칙이라 여기서도 그대로 맞춰 쓴다.
function priceInputToWon(priceInput) {
  const digits = String(priceInput || "").replace(/[^0-9]/g, "");
  if (!digits) return null;
  return Number(digits) * 10000;
}

export default function RealTradeDistributionChart({ items }) {
  const [activePeriod, setActivePeriod] = useState("12");
  const [tradeType, setTradeType] = useState("sale");
  const [dataByItem, setDataByItem] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hoveredItemId, setHoveredItemId] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ left: 0, top: 0 });

  const svgRef = useRef(null);
  const wrapRef = useRef(null);

  const checkedItems = (items || []).filter(
    (it) => it.checked && it.sizeId != null
  );
  // items 배열 참조 대신 의존성용 키 문자열을 쓰는 이유는 다른 실데이터
  // 차트들과 동일(PriceTrendChart 참고) - 체크 상태/사이즈 변경만 감지.
  const checkedKey = checkedItems.map((it) => `${it.id}:${it.sizeId}`).join(",");

  useEffect(() => {
    if (checkedItems.length === 0) return;

    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 표준 데이터 페칭 패턴(다른 실데이터 차트들과 동일)
    setLoading(true);
    setError(null);

    const months = Number(activePeriod);

    Promise.all(
      checkedItems.map((item) =>
        getTradePoints(item.sizeId, months, tradeType).then((res) => ({
          itemId: item.id,
          count: res.count ?? 0,
          averagePrice: res.average_price ?? null,
          points: res.points || [],
        }))
      )
    )
      .then((results) => {
        if (cancelled) return;
        const map = {};
        results.forEach((r) => {
          map[r.itemId] = r;
        });
        setDataByItem(map);
      })
      .catch(() => {
        if (cancelled) return;
        setError("실거래 분포도를 불러오지 못했어요. 잠시 후 다시 시도해주세요.");
        setDataByItem({});
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- checkedKey가 checkedItems의 실질적인 변경을 대신 표현
  }, [checkedKey, activePeriod, tradeType]);

  // 아이템별 실거래 포인트 + 호가 + 기간 내 평균가를 한 번에 계산.
  const perItem = useMemo(() => {
    return checkedItems.map((item) => {
      const data = dataByItem[item.id];
      const amounts = (data?.points || [])
        .map((p) => p.deal_amount)
        .filter((v) => v != null)
        .sort((a, b) => a - b);
      return {
        item,
        amounts,
        askWon: priceInputToWon(item.price),
        count: data?.count ?? 0,
        averagePrice: data?.averagePrice ?? null,
      };
    });
  }, [checkedItems, dataByItem]);

  const hasAnyData = perItem.some((d) => d.amounts.length > 0 || d.askWon != null);

  // 공유 가격축 domain - 전체 아이템의 실거래가+호가를 합쳐 min/max 산출.
  const { domainMin, domainMax } = useMemo(() => {
    const allValues = perItem.flatMap((d) =>
      d.askWon != null ? d.amounts.concat([d.askWon]) : d.amounts
    );
    if (allValues.length === 0) return { domainMin: 0, domainMax: 1 };
    const dataMin = Math.min(...allValues);
    const dataMax = Math.max(...allValues);
    const padAmt = (dataMax - dataMin) * 0.15 || dataMax * 0.12 || 100000000;
    return {
      domainMin: Math.max(0, dataMin - padAmt),
      domainMax: dataMax + padAmt,
    };
  }, [perItem]);

  function priceToY(price) {
    if (domainMax === domainMin) return (PLOT_TOP + PLOT_BOTTOM) / 2;
    return (
      PLOT_BOTTOM -
      ((price - domainMin) / (domainMax - domainMin)) * (PLOT_BOTTOM - PLOT_TOP)
    );
  }

  const ticks = useMemo(() => {
    const lines = 3;
    const arr = [];
    for (let i = 0; i <= lines; i += 1) {
      arr.push(domainMin + (domainMax - domainMin) * (i / lines));
    }
    return arr;
  }, [domainMin, domainMax]);

  const colCount = Math.max(perItem.length, 1);
  const colWidth = (PLOT_RIGHT - PLOT_LEFT) / colCount;
  const maxJitterHalfWidth = colWidth * 0.26;

  function showTooltip(itemId, centerX) {
    const svg = svgRef.current;
    const wrap = wrapRef.current;
    if (!svg || !wrap) return;
    const svgRect = svg.getBoundingClientRect();
    const wrapRect = wrap.getBoundingClientRect();
    const scale = svgRect.width / W;
    setTooltipPos({
      left: svgRect.left + centerX * scale - wrapRect.left,
      top: svgRect.top - wrapRect.top,
    });
    setHoveredItemId(itemId);
  }
  function hideTooltip() {
    setHoveredItemId(null);
  }

  const hoveredData = perItem.find((d) => d.item.id === hoveredItemId);

  return (
    <ChartPlaceholder
      title="실거래 분포도"
      className="chart-main"
      infoText="체크한 매물들의 실거래가를 흩어서 보여주고, 입력한 호가와 비교해요."
      headerRight={
        <div className="trade-distribution-chart__header-right">
          <div className="trade-distribution-chart__legend">
            <span className="trade-distribution-chart__legend-item">
              <span
                className="trade-distribution-chart__legend-dot"
                style={{ background: "var(--color-text-faint)" }}
              />
              실거래가
            </span>
            <span className="trade-distribution-chart__legend-item">
              <span
                className="trade-distribution-chart__legend-dot"
                style={{ background: "var(--color-primary)" }}
              />
              입력한 호가
            </span>
          </div>
          <label className="trade-distribution-chart__period-picker">
            <span>기간</span>
            <select
              value={activePeriod}
              onChange={(event) => setActivePeriod(event.target.value)}
              className="trade-distribution-chart__select"
            >
              <option value="3">3개월</option>
              <option value="12">12개월</option>
              <option value="36">36개월</option>
            </select>
          </label>
        </div>
      }
    >
      <div className="trade-distribution-chart__wrap">
        <div className="trade-distribution-chart__type-tabs">
          <span
            className="trade-distribution-chart__type-tab-thumb"
            style={{
              transform:
                tradeType === "jeonse"
                  ? "translateX(calc(100% + 2px))"
                  : "translateX(0)",
            }}
          />
          {TRADE_TYPES.map((type) => (
            <button
              key={type.key}
              type="button"
              className={
                "trade-distribution-chart__type-tab" +
                (tradeType === type.key ? " is-active" : "")
              }
              onClick={() => setTradeType(type.key)}
            >
              {type.label}
            </button>
          ))}
        </div>

        <div className="trade-distribution-chart__chart" ref={wrapRef}>
          {checkedItems.length === 0 && (
            <div className="trade-distribution-chart__empty">
              <img className="chart-empty-icon" src="/empty-state-icon.png" alt="" />
              선택된 매물이 없어요.
            </div>
          )}
          {checkedItems.length > 0 && loading && (
            <div className="trade-distribution-chart__empty">
              <img
                className="chart-loading-spinner"
                src="/loading-spinner.gif"
                alt="불러오는 중"
              />
            </div>
          )}
          {checkedItems.length > 0 && !loading && error && (
            <div className="trade-distribution-chart__empty">{error}</div>
          )}
          {checkedItems.length > 0 && !loading && !error && !hasAnyData && (
            <div className="trade-distribution-chart__empty">
              선택하신 기간에는 실거래 데이터가 없어요.
            </div>
          )}
          {checkedItems.length > 0 && !loading && !error && hasAnyData && (
            <svg
              ref={svgRef}
              className="trade-distribution-chart__svg"
              viewBox={`0 0 ${W} ${H}`}
            >
              <defs>
                <radialGradient id="tdcGlowOuter">
                  <stop offset="0%" stopColor="#09ce91" stopOpacity="0.08" />
                  <stop offset="60%" stopColor="#09ce91" stopOpacity="0.03" />
                  <stop offset="100%" stopColor="#09ce91" stopOpacity="0" />
                </radialGradient>
                <radialGradient id="tdcGlowInner">
                  <stop offset="0%" stopColor="#09ce91" stopOpacity="0.17" />
                  <stop offset="55%" stopColor="#09ce91" stopOpacity="0.08" />
                  <stop offset="100%" stopColor="#09ce91" stopOpacity="0" />
                </radialGradient>
                <filter id="tdcGlowBlur" x="-60%" y="-60%" width="220%" height="220%">
                  <feGaussianBlur stdDeviation="4" />
                </filter>
              </defs>

              {ticks.map((v, i) => {
                const y = priceToY(v);
                return (
                  <g key={i}>
                    <line
                      x1={PLOT_LEFT}
                      x2={PLOT_RIGHT}
                      y1={y}
                      y2={y}
                      className="trade-distribution-chart__gridline"
                    />
                    <text
                      x={PLOT_LEFT - 10}
                      y={y + 4}
                      textAnchor="end"
                      className="trade-distribution-chart__tick-label"
                    >
                      {formatEok(v)}
                    </text>
                  </g>
                );
              })}

              {perItem.map((d, idx) => {
                const centerX = PLOT_LEFT + colWidth * (idx + 0.5);
                const { amounts, askWon, item } = d;
                const minGlowHeight = 44;

                let outerRy = null;
                let innerRy = null;
                let midY = null;
                if (amounts.length > 0) {
                  const midPrice = percentile(amounts, 0.5);
                  midY = priceToY(midPrice);
                  const outerLowY = priceToY(percentile(amounts, 0.08));
                  const outerHighY = priceToY(percentile(amounts, 0.92));
                  outerRy =
                    Math.max((outerLowY - outerHighY) / 2, minGlowHeight / 2) * 1.6;
                  const innerLowY = priceToY(percentile(amounts, 0.32));
                  const innerHighY = priceToY(percentile(amounts, 0.68));
                  innerRy =
                    Math.max((innerLowY - innerHighY) / 2, minGlowHeight * 0.4) * 1.1;
                }

                return (
                  <g key={item.id}>
                    {amounts.length > 0 && (
                      <>
                        <ellipse
                          cx={centerX}
                          cy={midY}
                          rx={colWidth * 0.44}
                          ry={outerRy}
                          fill="url(#tdcGlowOuter)"
                          filter="url(#tdcGlowBlur)"
                        />
                        <ellipse
                          cx={centerX}
                          cy={midY}
                          rx={colWidth * 0.32}
                          ry={innerRy}
                          fill="url(#tdcGlowInner)"
                          filter="url(#tdcGlowBlur)"
                        />
                      </>
                    )}

                    {amounts.map((price, i) => {
                      const y = priceToY(price);
                      const jitter =
                        (seededRandom(idx * 500 + i * 11 + 3) * 2 - 1) *
                        maxJitterHalfWidth;
                      return (
                        <circle
                          key={i}
                          cx={centerX + jitter}
                          cy={y}
                          r={3}
                          className="trade-distribution-chart__txn-dot"
                        />
                      );
                    })}

                    {askWon != null && (
                      <circle
                        cx={centerX}
                        cy={priceToY(askWon)}
                        r={4.125}
                        className="trade-distribution-chart__ask-dot"
                      />
                    )}

                    <text
                      x={centerX}
                      y={H - 10}
                      textAnchor="middle"
                      className="trade-distribution-chart__item-label"
                    >
                      {item.name}
                    </text>

                    <rect
                      x={PLOT_LEFT + colWidth * idx}
                      y={PLOT_TOP}
                      width={colWidth}
                      height={PLOT_BOTTOM - PLOT_TOP}
                      className="trade-distribution-chart__col-hit"
                      tabIndex={0}
                      onPointerEnter={() => showTooltip(item.id, centerX)}
                      onPointerLeave={hideTooltip}
                      onFocus={() => showTooltip(item.id, centerX)}
                      onBlur={hideTooltip}
                    />
                  </g>
                );
              })}
            </svg>
          )}

          {hoveredData && (
            <div
              className="trade-distribution-chart__tooltip"
              style={{ left: tooltipPos.left, top: tooltipPos.top }}
            >
              <div className="trade-distribution-chart__tooltip-title">
                {hoveredData.item.name}
              </div>
              {hoveredData.count > 0 && hoveredData.averagePrice != null && (
                <div className="trade-distribution-chart__tooltip-row">
                  <span className="trade-distribution-chart__tooltip-label">
                    <span
                      className="trade-distribution-chart__tooltip-dot"
                      style={{ background: "var(--color-primary)" }}
                    />
                    기간 내 평균가격
                  </span>
                  <span className="trade-distribution-chart__tooltip-value">
                    {formatEok(hoveredData.averagePrice)}
                  </span>
                </div>
              )}
              <div className="trade-distribution-chart__tooltip-row">
                <span className="trade-distribution-chart__tooltip-label">
                  <span
                    className="trade-distribution-chart__tooltip-dot"
                    style={{ background: "var(--color-text-faint)" }}
                  />
                  거래 건수
                </span>
                <span className="trade-distribution-chart__tooltip-value">
                  {hoveredData.count}건
                </span>
              </div>
              {hoveredData.askWon != null && (
                <div className="trade-distribution-chart__tooltip-row">
                  <span className="trade-distribution-chart__tooltip-label">
                    <span
                      className="trade-distribution-chart__tooltip-dot"
                      style={{ background: "var(--color-primary)" }}
                    />
                    호가
                  </span>
                  <span className="trade-distribution-chart__tooltip-value">
                    {formatEok(hoveredData.askWon)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </ChartPlaceholder>
  );
}
