"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { HomeMarkIcon } from "@/components/icons";

const CATEGORIES = [
  { label: "부동산 뉴스", keyword: "아파트 부동산" },
  { label: "부동산 정책", keyword: "부동산 정책" },
  { label: "청약 소식", keyword: "아파트 청약" },
];

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";

export default function InsightsPage() {
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [news, setNews] = useState([]);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    const controller = new AbortController();

    async function loadNews() {
      setStatus("loading");
      try {
        const params = new URLSearchParams({
          keyword: category.keyword,
          limit: "10",
        });
        const response = await fetch(`${API_BASE_URL}/api/v1/news?${params}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("뉴스 요청 실패");

        const result = await response.json();
        setNews(result.data ?? []);
        setStatus("success");
      } catch (error) {
        if (error.name !== "AbortError") {
          setNews([]);
          setStatus("error");
        }
      }
    }

    loadNews();
    return () => controller.abort();
  }, [category]);

  return (
    <div className="insights-page">
      <header className="header insights-header">
        <Link className="logo-group" href="/" aria-label="내집사 홈으로">
          <span className="logo-mark"><HomeMarkIcon /></span>
          <span className="logo-word">내집사</span>
        </Link>
        <Link className="nav-link" href="/">홈으로</Link>
      </header>

      <main className="insights-main">
        <div className="insights-heading">
          <p className="insights-eyebrow">INSIGHTS</p>
          <h1>내 집 마련 인사이트</h1>
          <p>최신 부동산 흐름과 정책, 청약 소식을 한눈에 확인하세요.</p>
        </div>

        <nav className="insights-tabs" aria-label="인사이트 분류">
          {CATEGORIES.map((item) => (
            <button
              key={item.label}
              type="button"
              className={item.label === category.label ? "is-active" : ""}
              aria-pressed={item.label === category.label}
              onClick={() => setCategory(item)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <section className="news-section" aria-live="polite" aria-busy={status === "loading"}>
          {status === "loading" && (
            <div className="news-message">최신 뉴스를 불러오고 있어요.</div>
          )}
          {status === "error" && (
            <div className="news-message news-error">
              뉴스를 불러오지 못했습니다. 백엔드 서버 상태를 확인해 주세요.
            </div>
          )}
          {status === "success" && news.length === 0 && (
            <div className="news-message">표시할 뉴스가 없습니다.</div>
          )}
          {status === "success" && news.map((item, index) => (
            <article className="news-item" key={`${item.link}-${index}`}>
              <div className="news-meta">
                <span>{item.press}</span>
                <time>{item.date || "날짜 정보 없음"}</time>
              </div>
              <h2>
                <a href={item.link} target="_blank" rel="noreferrer">
                  {item.title}
                </a>
              </h2>
              <p>{item.summary || "요약 정보가 제공되지 않았습니다."}</p>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
