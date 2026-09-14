"use client";

import { useCallback, useRef, useState } from "react";
import NewsCard from "./NewsCard";
import SubscriptionInfoCard from "./SubscriptionInfoCard";
import Toast from "../Toast";
import { CopyIcon } from "../icons";
import useToast from "@/hooks/useToast";

const MIN_HEIGHT = 100;
const MAX_HEIGHT = 310;
const clamp = value => Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, value));

export default function InsightPanel({ refreshKey, referenceSizeId }) {
  const [height, setHeight] = useState(240);
  const [isDragging, setIsDragging] = useState(false);
  const drag = useRef(null);
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
          {/* TODO: 등록된 매물 기반 AI 분석 데이터 렌더링 */}
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
