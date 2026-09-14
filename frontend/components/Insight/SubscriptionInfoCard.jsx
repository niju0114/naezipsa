"use client";

import { useEffect, useRef, useState } from "react";
import { getInsightItems, sourceLink } from "@/lib/insightApi";

const CATEGORIES = [
  { key: "priority-1", label: "1순위", className: "is-priority" },
  { key: "no-rank", label: "무순위/잔여세대", className: "is-no-rank" },
  { key: "special", label: "특별공급", className: "is-special" },
  { key: "officetel", label: "오피스텔", className: "is-officetel" },
];

export default function SubscriptionInfoCard({ refreshKey = "", referenceSizeId }) {
  const [state, setState] = useState({ groups: [], loading: true, error: "", guest: false });
  const [attempt, setAttempt] = useState(0);
  const [excludeClosed, setExcludeClosed] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState("");
  const [regionOpen, setRegionOpen] = useState(false);
  const picker = useRef(null);
  const regionNames = ["서울", "경기", "인천", "강원", "충북", "충남", "세종", "대전", "전북", "전남", "광주", "경북", "대구", "경남", "울산", "부산", "제주"];
  useEffect(() => {
    if (!regionOpen) return;
    const close = event => { if (!picker.current?.contains(event.target)) setRegionOpen(false); };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [regionOpen]);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setState({ groups: [], loading: true, error: "" });
      if (!referenceSizeId) {
        setState({ groups: [], loading: false, error: "기준 매물의 지역 정보를 확인할 수 없습니다.", retryable: false });
        return;
      }
      try {
        const groups = await getInsightItems(`/subscription/nearby?size_id=${encodeURIComponent(referenceSizeId)}&limit_per_region=30&exclude_closed=${excludeClosed}`, controller.signal);
        if (!controller.signal.aborted) setState({ groups, loading: false, error: "" });
      } catch (error) {
        if (!controller.signal.aborted) setState({ groups: [], loading: false, error: error.message, retryable: error.retryable !== false });
      }
    }
    void load();
    return () => controller.abort();
  }, [attempt, refreshKey, referenceSizeId, excludeClosed]);

  return (
    <div className="insight-card" data-component="SubscriptionInfoCard">
      <div className="insight-card-header">
        <span className="insight-card-title">청약 정보</span>
        <div className="subscription-filters">
          <button type="button" className={`subscription-filter ${excludeClosed ? "is-active" : ""}`} aria-pressed={excludeClosed} onClick={() => setExcludeClosed(value => !value)}><span aria-hidden="true">✓</span> 마감제외</button>
          <span className="subscription-filter-divider" aria-hidden="true">|</span>
          <div className="subscription-region-picker" ref={picker} onKeyDown={event => { if (event.key === "Escape") { setRegionOpen(false); picker.current?.querySelector("button")?.focus(); } }}>
            <button type="button" className={`subscription-filter ${selectedRegion || regionOpen ? "is-active" : ""}`} aria-expanded={regionOpen} aria-controls="subscription-region-options" onClick={() => setRegionOpen(value => !value)}>{selectedRegion || "지역선택"} <span aria-hidden="true">⌄</span></button>
            {regionOpen && <div id="subscription-region-options" className="subscription-region-options" role="group" aria-label="청약 지역 선택">
              {["", ...regionNames].map(region => <button type="button" key={region || "all"} className={`subscription-region-option ${selectedRegion === region ? "is-active" : ""}`} aria-pressed={selectedRegion === region} onClick={() => { setSelectedRegion(region); setRegionOpen(false); picker.current?.querySelector("button")?.focus(); }}>{region || "전체 지역"}</button>)}
            </div>}
          </div>
        </div>
      </div>
      {state.error && <p className="news-message news-error" role="alert">{state.error} {state.retryable && <button type="button" onClick={() => setAttempt(a => a + 1)}>다시 시도</button>}</p>}
      <div className="subscription-list" aria-live="polite">
        {CATEGORIES.map(category => {
          const regions = (state.groups.find(group => group.category === category.key)?.regions || [])
            .filter(region => !selectedRegion || region.region === selectedRegion)
            .map(region => ({ ...region, items: region.items.filter(item => !excludeClosed || ["upcoming", "open"].includes(item.receipt_status)) }))
            .filter(region => region.items.length > 0);
          return (
            <div className="subscription-group" key={category.key}>
              <div className={`subscription-group-label ${category.className}`}>{category.label}</div>
              <div className="subscription-regions">
                {state.loading ? <p className="news-message">청약 정보를 불러오는 중입니다.</p> : state.error ? <p className="news-message">현재 정보를 확인할 수 없습니다.</p> : regions.map(region => (
                  <div className="subscription-region" key={region.region}>
                    <span className="subscription-region-label">{region.label}</span>
                    <div className="subscription-region-items">
                      {region.items.map(item => (
                        <a key={`${item.announcement_no}-${item.category}`} href={sourceLink(item.source_url)} target="_blank" rel="noopener noreferrer" className="subscription-row">
                          <div className="subscription-row-line"><span className="subscription-row-name">{item.house_name}</span><span className={`subscription-status is-${item.receipt_status || "unknown"}`}>{({ closed: "마감", open: "접수 중", upcoming: "접수 예정" })[item.receipt_status] || "일정 확인"}</span></div>
                          <div className="subscription-row-line"><span className="subscription-row-address">{item.address}</span></div>
                          <div className="subscription-row-line subscription-published">모집공고일 {item.announced_at || "미제공"}</div>
                          <div className="subscription-row-line"><span className="subscription-row-deadline">접수 {item.receipt_start}{item.receipt_end !== item.receipt_start ? ` ~ ${item.receipt_end}` : ""}</span></div>
                        </a>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
