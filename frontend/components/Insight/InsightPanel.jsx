"use client";

import { useRef, useState } from "react";
import NewsCard from "./NewsCard";
import SubscriptionInfoCard from "./SubscriptionInfoCard";

const MIN_HEIGHT = 0;
const MAX_HEIGHT = 600;
const clamp = value => Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, value));

export default function InsightPanel({ refreshKey, referenceSizeId }) {
  const [height, setHeight] = useState(240);
  const drag = useRef(null);
  return (
    <div className="insight-panel" data-component="InsightPanel">
      <div className="insight-panel-inner">
        <h2 className="insight-section-title">등록된 매물에 대한 AI 분석 데이터</h2>
        <div id="insight-ai-content" className="insight-ai-placeholder is-resizable" style={{ height }} hidden={height === 0}>
          {/* TODO: 등록된 매물 기반 AI 분석 데이터 렌더링 */}
        </div>
        <div
          className="insight-resize-handle"
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
            event.currentTarget.setPointerCapture(event.pointerId);
            event.preventDefault();
          }}
          onPointerMove={event => {
            if (drag.current) setHeight(clamp(drag.current.height + event.clientY - drag.current.y));
          }}
          onPointerUp={event => {
            drag.current = null;
            if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
          }}
          onPointerCancel={() => { drag.current = null; }}
          onLostPointerCapture={() => { drag.current = null; }}
          onDoubleClick={() => setHeight(240)}
          onKeyDown={event => {
            const values = { ArrowUp: height - 20, ArrowDown: height + 20, Home: MIN_HEIGHT, End: MAX_HEIGHT };
            if (event.key in values) { event.preventDefault(); setHeight(clamp(values[event.key])); }
          }}
        ><span aria-hidden="true">━━</span></div>
        <div className="insight-cards-row">
          <NewsCard />
          <SubscriptionInfoCard refreshKey={refreshKey} referenceSizeId={referenceSizeId} />
        </div>
      </div>
    </div>
  );
}
