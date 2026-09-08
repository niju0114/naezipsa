import ChartPlaceholder from "./ChartPlaceholder";

// 실거래 분포도 — 대시보드 차트 그리드에서 가장 큰 메인 자리(.chart-main).
// 이 파일을 app/charts/real-trade-distribution/page.js에서 단독으로도
// 열어볼 수 있으므로, 실제 차트를 붙일 때 대시보드 전체를 다시 켤 필요 없이
// 이 컴포넌트 하나만 다시 불러오면서(새로고침) 확인하며 작업하면 된다.
//
// data: 국토부 실거래가 API(또는 그걸 적재한 DB)에서 가져온 실거래 목록을
// 넘겨받을 자리 — 아직 연동 전이라 기본값은 없음.
export default function RealTradeDistributionChart({ data }) {
  return (
    <ChartPlaceholder title="실거래 분포도" className="chart-main">
      {/* TODO: data를 바탕으로 실거래 분포도(예: 평형별 산점도/히스토그램) 렌더링 */}
    </ChartPlaceholder>
  );
}
