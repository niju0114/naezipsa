import RealTradeDistributionChart from "@/components/charts/RealTradeDistributionChart";
import MacroDataChart from "@/components/charts/MacroDataChart";
import PriceTrendChart from "@/components/charts/PriceTrendChart";
import AreaRankingChart from "@/components/charts/AreaRankingChart";
import TradeVolumeLiquidityChart from "@/components/charts/TradeVolumeLiquidityChart";
import JeonseSaleGapChart from "@/components/charts/JeonseSaleGapChart";

// 차트 6개의 메타데이터를 한 곳에 모아둔 레지스트리. 대시보드 그리드
// (components/Dashboard/DashboardCharts.jsx)와 단독 프리뷰 페이지들
// (app/charts/**)이 이 목록을 같이 참조하므로, 차트를 추가/이름 변경할 땐
// 여기 하나만 고치면 된다. slug는 app/charts/[slug]/page.js의 폴더명과
// 반드시 일치해야 한다.
export const CHARTS = [
  { slug: "real-trade-distribution", title: "실거래 분포도", Component: RealTradeDistributionChart },
  { slug: "macro-data", title: "거시 데이터", Component: MacroDataChart },
  { slug: "price-trend", title: "시세(실거래 데이터 추이)", Component: PriceTrendChart },
  { slug: "area-ranking", title: "생활권 내 단지 랭킹", Component: AreaRankingChart },
  { slug: "trade-volume-liquidity", title: "거래량 유동성", Component: TradeVolumeLiquidityChart },
  { slug: "jeonse-sale-gap", title: "전세-매매 갭 분석", Component: JeonseSaleGapChart },
];
