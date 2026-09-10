"use client";

import NewsCard from "./NewsCard";
import SubscriptionInfoCard from "./SubscriptionInfoCard";

// <InsightPanel /> : 헤더의 "인사이트" 탭 콘텐츠. 상세 데이터(기존
// 대시보드/차트)와 나란히 슬라이드 트랙에 놓이는 두 번째 패널. 구성: 제목 →
// AI 분석 데이터 자리표시 영역 → 뉴스/청약 정보 카드 2개 가로 배치.
export default function InsightPanel() {
  return (
    <div className="insight-panel" data-component="InsightPanel">
      <div className="insight-panel-inner">
        <h2 className="insight-section-title">등록된 매물에 대한 AI 분석 데이터</h2>

        <div className="insight-ai-placeholder">
          {/* TODO: 등록된 매물 기반 AI 분석 데이터 렌더링 */}
        </div>

        <div className="insight-cards-row">
          <NewsCard />
          <SubscriptionInfoCard />
        </div>
      </div>
    </div>
  );
}
