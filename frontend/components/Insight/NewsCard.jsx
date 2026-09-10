"use client";

import { ChevronRightIcon } from "../icons";

// <NewsCard /> : 인사이트 화면 "오늘 확인해야하는 뉴스" 카드. 데이터는 자리
// 표시용 - 실제 뉴스 연동 API가 정해지면 NEWS_ITEMS를 그 데이터로 교체하면
// 된다.
const NEWS_ITEMS = [
  {
    id: "news-1",
    badge: "hot 뉴스",
    title: "행당동 재건축 정비구역 지정 관련 공고",
    date: "2024-02-15",
  },
  {
    id: "news-2",
    badge: null,
    title: "성동구 아파트 실거래가 신고 기한 안내",
    date: "2024-02-15",
  },
  {
    id: "news-3",
    badge: null,
    title: "전세자금대출 한도 조정 관련 안내",
    date: "2024-02-15",
  },
  {
    id: "news-4",
    badge: null,
    title: "성동구 아파트 실거래가 신고 기한 안내",
    date: "2024-02-15",
  },
  {
    id: "news-5",
    badge: "hot 뉴스",
    title: "왕십리 도시환경정비사업 조합설립 인가 고시",
    date: "2024-02-14",
  },
];

export default function NewsCard() {
  return (
    <div className="insight-card" data-component="NewsCard">
      <div className="insight-card-header">
        <span className="insight-card-title">오늘 확인해야하는 뉴스</span>
        <a href="#" tabIndex={0} className="insight-card-link">
          더보기
          <ChevronRightIcon />
        </a>
      </div>
      <div className="news-list">
        {[...NEWS_ITEMS]
          .sort((a, b) => (b.badge ? 1 : 0) - (a.badge ? 1 : 0))
          .map((item) => (
          <a href="#" className="news-row" key={item.id}>
            {item.badge && <span className="news-badge">{item.badge}</span>}
            <span className="news-row-title">{item.title}</span>
            <span className="news-row-date">{item.date}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
