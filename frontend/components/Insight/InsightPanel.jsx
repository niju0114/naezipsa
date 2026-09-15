"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import NewsCard from "./NewsCard";
import SubscriptionInfoCard from "./SubscriptionInfoCard";
import Toast from "../Toast";
import { CopyIcon } from "../icons";
import useToast from "@/hooks/useToast";
import { createDashboardInsight } from "@/lib/api";

const MIN_HEIGHT = 100;
const MAX_HEIGHT = 310;
const clamp = value => Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, value));

// <InsightPanel /> : 헤더의 "인사이트" 탭 콘텐츠. 상세 데이터(기존
// 대시보드/차트)와 나란히 슬라이드 트랙에 놓이는 두 번째 패널. 구성: 제목 →
// AI 분석(높이 조절 가능) → 뉴스/청약 정보 카드 2개 가로 배치.
export default function InsightPanel({ items = [], userId, profile, refreshKey, referenceSizeId }) {
  const [height, setHeight] = useState(240);
  const [isDragging, setIsDragging] = useState(false);
  const drag = useRef(null);
  const selected = items.filter((item) => item.checked && item.backendId != null);
  // 계정·후보 상세·선택·이용 목적이 바뀌면 이전 분석을 폐기한다.
  const analysisKey = JSON.stringify([userId, selected, profile?.service_purposes]);
  const aiContentRef = useRef(null);
  const toast = useToast();

  const handleCopy = useCallback(async () => {
    const text = aiContentRef.current?.innerText.trim();
    if (!text) {
      toast.show("아직 복사할 내용이 없어요.");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      toast.show("복사했어요");
    } catch {
      toast.show("복사에 실패했어요. 잠시 후 다시 시도해주세요.");
    }
  }, [toast]);

  return (
    <div className="insight-panel" data-component="InsightPanel">
      <div className="insight-panel-inner">
        <h2 className="insight-section-title">등록된 매물에 대한 AI 분석 데이터</h2>
        <div id="insight-ai-content" ref={aiContentRef} className="insight-ai-placeholder is-resizable" style={{ height }}>
          <button type="button" className="insight-copy-btn" aria-label="AI 분석 내용 복사" onClick={handleCopy}>
            <CopyIcon />
          </button>
          <AiAnalysis key={analysisKey} items={selected} userId={userId} />
        </div>
        <div
          className={"insight-resize-handle" + (isDragging ? " is-dragging" : "")}
          role="separator"
          aria-label="AI 분석 영역 높이 조절"
          aria-orientation="horizontal"
          aria-controls="insight-ai-content"
          aria-valuemin={MIN_HEIGHT}
          aria-valuemax={MAX_HEIGHT}
          aria-valuenow={height}
          tabIndex={0}
          onPointerDown={event => {
            if (event.button !== 0) return;
            drag.current = { y: event.clientY, height };
            setIsDragging(true);
            event.currentTarget.setPointerCapture(event.pointerId);
            event.preventDefault();
          }}
          onPointerMove={event => {
            if (drag.current) setHeight(clamp(drag.current.height + event.clientY - drag.current.y));
          }}
          onPointerUp={event => {
            drag.current = null;
            setIsDragging(false);
            if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
          }}
          onPointerCancel={() => { drag.current = null; setIsDragging(false); }}
          onLostPointerCapture={() => { drag.current = null; setIsDragging(false); }}
          onDoubleClick={() => setHeight(240)}
          onKeyDown={event => {
            const values = { ArrowUp: height - 20, ArrowDown: height + 20, Home: MIN_HEIGHT, End: MAX_HEIGHT };
            if (event.key in values) { event.preventDefault(); setHeight(clamp(values[event.key])); }
          }}
        ><span className="insight-resize-handle-bar" aria-hidden="true" /></div>
        <div className="insight-cards-row">
          <NewsCard />
          <SubscriptionInfoCard refreshKey={refreshKey} referenceSizeId={referenceSizeId} />
        </div>
      </div>
      <Toast message={toast.message} visible={toast.visible} />
    </div>
  );
}

function AiAnalysis({ items, userId }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const active = useRef(false);
  const busy = useRef(false);
  useEffect(() => {
    active.current = true;
    return () => { active.current = false; };
  }, []);

  async function analyze() {
    if (!userId || !items.length || busy.current) return;
    busy.current = true;
    setLoading(true);
    setError("");
    try {
      const response = await createDashboardInsight(items.map((item) => item.backendId), userId);
      if (active.current) setResult(response);
    } catch (err) {
      if (active.current) setError(err.message || "AI 분석을 불러오지 못했어요.");
    } finally {
      busy.current = false;
      if (active.current) setLoading(false);
    }
  }

  return (
    <section className="insight-ai" aria-label="AI 후보 분석" aria-busy={loading}>
      <div className="insight-ai-actions">
        <p>{!userId ? "로그인하면 저장한 관심 매물의 AI 인사이트를 확인할 수 있어요."
          : !items.length ? "분석할 관심 매물을 선택해 주세요."
          : `선택한 관심 매물 ${items.length}개를 비교해 드려요.`}</p>
        <button type="button" className="auth-submit-btn" onClick={analyze} disabled={!userId || !items.length || loading}>
          {loading ? "분석 중…" : result ? "다시 분석하기" : "AI 분석하기"}
        </button>
      </div>
      {loading && <p role="status">AI 인사이트를 만들고 있어요. 잠시만 기다려 주세요.</p>}
      {error && <p className="auth-error" role="alert">{error}</p>}
      {result && <div className="insight-ai-result">
        <h3>비교 요약</h3>
        <p>{result.summary}</p>
        <div className="insight-ai-items">
          {result.items.filter((entry) => items.some((item) => item.backendId === entry.id)).map((entry) => {
            const item = items.find((candidate) => candidate.backendId === entry.id);
            return <article key={entry.id} className="insight-ai-item">
              <h4>{item.name} {item.sizeLabel}</h4>
              <h5>강점</h5>
              {entry.strengths.length ? <ul>{entry.strengths.map((text, index) => <li key={index}>{text}</li>)}</ul> : <p>분석 정보가 부족해요.</p>}
              <h5>약점</h5>
              {entry.weaknesses.length ? <ul>{entry.weaknesses.map((text, index) => <li key={index}>{text}</li>)}</ul> : <p>분석 정보가 부족해요.</p>}
            </article>;
          })}
        </div>
        <p className="insight-ai-time">분석 시각: <time dateTime={result.generated_at}>{new Date(result.generated_at).toLocaleString("ko-KR")}</time></p>
      </div>}
    </section>
  );
}
