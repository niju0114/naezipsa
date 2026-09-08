// 6개 차트가 공통으로 쓰는 뼈대. 지금은 제목만 좌상단에 고정 배치한
// 자리표시자(보더로만 구분, 배경색 없음)고, 실제 차트가 준비되면 각 차트
// 컴포넌트(RealTradeDistributionChart 등)의 children 자리에 넣으면 된다.
export default function ChartPlaceholder({ title, className, children }) {
  return (
    <div className={"chart-placeholder" + (className ? " " + className : "")}>
      <div className="chart-placeholder-title">{title}</div>
      {children}
    </div>
  );
}
