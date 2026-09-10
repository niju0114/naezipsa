"use client";

// <HeaderContentTabs /> : 헤더에 배치되는 "상세 데이터"/"인사이트" 메뉴.
// .header-content-tabs가 globals.css의 --chart-area-start 변수로 차트
// 영역(.dashboard-charts) 시작 지점과 같은 x좌표에 절대 위치로 배치된다.
// 클릭하면 Dashboard의 .content-track(오른쪽 차트 영역만)이 좌우로 슬라이드되며 콘텐츠가
// 바뀐다(NaejipsaApp의 activeContentTab state를 그대로 받아씀).
const TABS = [
  { key: "detail", label: "상세 페이지" },
  { key: "insight", label: "인사이트" },
];

export default function HeaderContentTabs({ active, onChange }) {
  return (
    <div className="header-content-tabs" role="tablist" aria-label="콘텐츠 전환">
      {TABS.map(({ key, label }) => (
        <button
          key={key}
          type="button"
          role="tab"
          tabIndex={0}
          aria-selected={active === key}
          className={"header-content-tab" + (active === key ? " is-active" : "")}
          onClick={() => onChange(key)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
