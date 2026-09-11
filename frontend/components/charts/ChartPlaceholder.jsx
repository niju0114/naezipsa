// 6개 차트가 공통으로 쓰는 뼈대. 제목은 좌상단에 고정 배치되고, 실제 차트가
// 준비되면 각 차트 컴포넌트(RealTradeDistributionChart 등)의 children 자리에
// 넣으면 된다.
//
// headerRight(선택): 범례/기간 선택 같은 컨트롤을 제목과 같은 줄(우측)에
// 붙이고 싶을 때 넘긴다(2026-09, 거래량 유동성/시세/거시 데이터 차트가
// 사용). 안 넘기면 예전처럼 제목만 있는 한 줄이라 다른 차트들엔 영향 없음.
export default function ChartPlaceholder({ title, className, headerRight, children }) {
  return (
    <div className={"chart-placeholder" + (className ? " " + className : "")}>
      <div className="chart-placeholder-titlebar">
        <div className="chart-placeholder-title">{title}</div>
        {headerRight}
      </div>
      {children}
    </div>
  );
}
