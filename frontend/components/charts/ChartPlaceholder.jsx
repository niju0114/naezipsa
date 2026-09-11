"use client";

import { useEffect, useRef, useState } from "react";

// 6개 차트가 공통으로 쓰는 뼈대. 제목은 좌상단에 고정 배치되고, 실제 차트가
// 준비되면 각 차트 컴포넌트(RealTradeDistributionChart 등)의 children 자리에
// 넣으면 된다.
//
// headerRight(선택): 범례/기간 선택 같은 컨트롤을 제목과 같은 줄(우측)에
// 붙이고 싶을 때 넘긴다(2026-09, 거래량 유동성/시세/거시 데이터 차트가
// 사용). 안 넘기면 예전처럼 제목만 있는 한 줄이라 다른 차트들엔 영향 없음.
//
// infoText(선택): 제목 옆 "?" 아이콘 클릭 시 뜨는 설명 툴팁 내용
// (2026-09, 모든 차트 공통 기능 — 아직 내용 확정 전이라 기본값은 임시
// "test" 텍스트). 아이콘을 다시 클릭하거나 툴팁 바깥을 클릭하면 닫힌다.
// 툴팁 박스 자체는 제목 시작 위치(카드 왼쪽 라인)에 맞춰 붙이고, 말풍선
// 꼬리만 아이콘 위치를 따라가도록 분리했다 — 제목 글자 길이가 차트마다
// 달라서 꼬리 위치는 고정 CSS로 못 맞추고, 아이콘의 실제 렌더 위치를
// 읽어서(offsetLeft) 인라인 스타일로 계산한다.
export default function ChartPlaceholder({
  title,
  className,
  headerRight,
  children,
  infoText = "test",
}) {
  const [infoOpen, setInfoOpen] = useState(false);
  const [arrowLeft, setArrowLeft] = useState(0);
  const groupRef = useRef(null);
  const iconRef = useRef(null);

  useEffect(() => {
    if (!infoOpen) return;

    function handleOutsideClick(event) {
      if (groupRef.current && !groupRef.current.contains(event.target)) {
        setInfoOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [infoOpen]);

  useEffect(() => {
    if (!infoOpen || !iconRef.current) return;
    setArrowLeft(iconRef.current.offsetLeft + iconRef.current.offsetWidth / 2);
  }, [infoOpen]);

  return (
    <div className={"chart-placeholder" + (className ? " " + className : "")}>
      <div className="chart-placeholder-titlebar">
        <div className="chart-placeholder-title-group" ref={groupRef}>
          <div className="chart-placeholder-title">{title}</div>
          <button
            ref={iconRef}
            type="button"
            className="chart-placeholder-info-btn"
            aria-label="차트 설명 보기"
            aria-expanded={infoOpen}
            onClick={() => setInfoOpen((prev) => !prev)}
          >
            ?
          </button>
          {infoOpen && (
            <div className="chart-placeholder-info-tooltip" role="tooltip">
              <span
                className="chart-placeholder-info-tooltip-arrow"
                style={{ left: arrowLeft - 6 }}
              />
              {infoText}
            </div>
          )}
        </div>
        {headerRight}
      </div>
      {children}
    </div>
  );
}
