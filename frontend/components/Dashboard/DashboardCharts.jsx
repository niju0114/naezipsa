import { CHARTS } from "@/lib/charts";

// <DashboardCharts /> : 오른쪽 차트 6칸, 자체 스크롤(.dashboard-charts에
// overflow-y:auto). 그리드 배치(left/side)는 globals.css의
// .dashboard-charts/.chart-left-col/.chart-main/.chart-side-col/.chart-sub-row
// 규칙을 그대로 따른다 — 왼쪽(.chart-left-col)과 오른쪽(.chart-side-col) 둘 다
// flex-column wrapper라서, 안의 카드들이 각자 min-height만 책임지고 wrapper
// 전체 최소 높이는 그 합으로 자연스럽게 정해진다(그리드 행을 나눠쓰며 서로
// 공간을 침범하던 문제 없음). CHARTS 배열의 순서가 곧 배치 순서(0번=메인,
// 1~3번=오른쪽 세로열, 4~5번=하단 가로줄)이므로, 순서를 바꾸고 싶으면
// lib/charts.js의 배열 순서만 바꾸면 된다.
export default function DashboardCharts() {
  const [main, ...rest] = CHARTS;
  const sideCol = rest.slice(0, 3);
  const subRow = rest.slice(3, 5);

  return (
    <div className="dashboard-charts" data-component="DashboardCharts">
      <div className="chart-left-col">
        <main.Component />
        <div className="chart-sub-row">
          {subRow.map(({ slug, Component }) => (
            <Component key={slug} />
          ))}
        </div>
      </div>
      <div className="chart-side-col">
        {sideCol.map(({ slug, Component }) => (
          <Component key={slug} />
        ))}
      </div>
    </div>
  );
}
