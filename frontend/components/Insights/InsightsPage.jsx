"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { HomeMarkIcon } from "@/components/icons";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";

export default function InsightsPage() {
  const [hotNews, setHotNews] = useState(null);
  const [news, setNews] = useState([]);
  const [newsStatus, setNewsStatus] = useState("loading");

  const [subscriptions, setSubscriptions] = useState([]);
  const [subscriptionStatus, setSubscriptionStatus] = useState("loading");

  useEffect(() => {
    const controller = new AbortController();

    async function loadNews() {
      setNewsStatus("loading");
      try {
        const newsParams = new URLSearchParams({
          keyword: "부동산 뉴스",
          limit: "3",
        });

        const [hotRes, newsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/v1/news/hot`, {
            signal: controller.signal,
          }),
          fetch(`${API_BASE_URL}/api/v1/news?${newsParams}`, {
            signal: controller.signal,
          }),
        ]);
        if (!newsRes.ok) throw new Error("뉴스 요청 실패");

        const hotResult = hotRes.ok ? await hotRes.json() : { data: [] };
        const newsResult = await newsRes.json();

        setHotNews(hotResult.data?.[0] ?? null);
        setNews(newsResult.data ?? []);
        setNewsStatus("success");
      } catch (error) {
        if (error.name !== "AbortError") {
          setHotNews(null);
          setNews([]);
          setNewsStatus("error");
        }
      }
    }

    async function loadSubscriptions() {
      setSubscriptionStatus("loading");
      try {
        const params = new URLSearchParams({ limit: "4" });
        const response = await fetch(
          `${API_BASE_URL}/api/v1/subscription?${params}`,
          {
            signal: controller.signal,
          },
        );
        if (!response.ok) throw new Error("청약 소식 요청 실패");

        const result = await response.json();
        setSubscriptions(result.data ?? []);
        setSubscriptionStatus("success");
      } catch (error) {
        if (error.name !== "AbortError") {
          setSubscriptions([]);
          setSubscriptionStatus("error");
        }
      }
    }

    loadNews();
    loadSubscriptions();
    return () => controller.abort();
  }, []);

  return (
    <div className="insights-page">
      <header className="header insights-header">
        <Link className="logo-group" href="/" aria-label="내집사 홈으로">
          <span className="logo-mark">
            <HomeMarkIcon />
          </span>
          <span className="logo-word">내집사</span>
        </Link>
        <Link className="nav-link" href="/">
          홈으로
        </Link>
      </header>

      <main className="insights-layout">
        <aside className="insights-sidebar" aria-label="관심 매물 자리표시자">
          <div className="insights-property-placeholder">
            <span className="insights-property-check" aria-hidden="true" />
            <strong>행당대림아파트</strong>
            <span>84㎡ · 34평</span>
          </div>
          <div className="insights-add-placeholder">매물 추가하기</div>
          {Array.from({ length: 4 }, (_, index) => (
            <div className="insights-empty-placeholder" key={index} aria-hidden="true" />
          ))}
        </aside>

        <div className="insights-content">
          <nav className="insights-view-tabs" aria-label="매물 정보 보기">
            <span>상세 데이터</span>
            <strong>인사이트</strong>
          </nav>

          <div className="insights-ai-placeholder" role="img" aria-label="AI 종합 콘텐츠 자리표시자">
            AI 종합
          </div>

          <div className="insights-dashboard">
          {/* 왼쪽: 오늘 확인해야하는 뉴스 */}
          <section
            className="dashboard-card"
            aria-live="polite"
            aria-busy={newsStatus === "loading"}
          >
            <div className="dashboard-card-header">
              <h2>오늘 확인해야하는 뉴스</h2>
              <span className="more-link">더보기 &gt;</span>
            </div>

            {newsStatus === "loading" && (
              <div className="news-message">불러오는 중이에요.</div>
            )}
            {newsStatus === "error" && (
              <div className="news-message news-error">
                뉴스를 불러오지 못했습니다.
              </div>
            )}
            {newsStatus === "success" && (
              <ul className="news-list">
                {hotNews && (
                  <li className="news-list-item" key={`${hotNews.link}-hot`}>
                    <strong className="badge-hot">HOT 뉴스</strong>
                    <a href={hotNews.link} target="_blank" rel="noreferrer">
                      {hotNews.title}
                    </a>
                    <time>{hotNews.date || ""}</time>
                  </li>
                )}
                {news.map((item, index) => (
                  <li className="news-list-item" key={`${item.link}-${index}`}>
                    <a href={item.link} target="_blank" rel="noreferrer">
                      {item.title}
                    </a>
                    <time>{item.date || ""}</time>
                  </li>
                ))}
                {!hotNews && news.length === 0 && (
                  <li className="news-message">표시할 뉴스가 없습니다.</li>
                )}
              </ul>
            )}
          </section>

          {/* 오른쪽: 청약 소식 */}
          <section
            className="dashboard-card"
            aria-live="polite"
            aria-busy={subscriptionStatus === "loading"}
          >
            <div className="dashboard-card-header">
              <h2>청약 소식</h2>
              <span className="more-link">더보기 &gt;</span>
            </div>

            {subscriptionStatus === "loading" && (
              <div className="news-message">불러오는 중이에요.</div>
            )}
            {subscriptionStatus === "error" && (
              <div className="news-message news-error">
                청약 소식을 불러오지 못했습니다.
              </div>
            )}
            {subscriptionStatus === "success" && (
              <ul className="news-list">
                {subscriptions.map((item) => (
                  <li className="news-list-item" key={item.announcement_no}>
                    <a href={item.source_url} target="_blank" rel="noreferrer">
                      [{item.region}] {item.house_name}
                    </a>
                    <time>{item.announced_at}</time>
                  </li>
                ))}
                {subscriptions.length === 0 && (
                  <li className="news-message">표시할 청약 소식이 없습니다.</li>
                )}
              </ul>
            )}
          </section>
        </div>
        </div>
      </main>
    </div>
  );
}
