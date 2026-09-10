"use client";

import { useEffect, useRef, useState } from "react";
import ChipGroup from "../ChipGroup";
import {
  BackArrowIcon,
  CloseIcon,
  SearchIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from "../icons";
import { COMPLEXES, DIRECTIONS, INTERIORS } from "@/lib/data";

// <InterestModal open onClose onSubmit /> : 오른쪽에서 슬라이드되는 매물 검색/
// 추가 패널. SearchStep/SizeSelectStep/DetailStep(+DetailAccordion)을 이
// 파일 안에 작은 컴포넌트로 나눠뒀다 — 다섯 화면이 전부 같은 내부 state를
// 공유하며 서로 긴밀히 얽혀 있어(예: DetailStep의 향/인테리어 선택이 바로
// 최종 제출값이 됨), 파일을 쪼개는 것보다 여기서 관리하는 편이 오히려
// 추적하기 쉽다.
//
// ⚠ 아래 "검색 결과 선택" 부분은 프로토타입에서 실제 맥북 사파리로 여러 번
// 검증한 브라우저 버그 우회 로직이다 — React로 옮기면서도 반드시 그대로
// 유지해야 한다(자세한 배경은 원본 프로토타입 파일의 Next.js 변환 가이드
// 주석 5~6번 참고):
//   1) 타이핑 중에는 결과 리스트를 갱신하지 않는다 — Enter/검색 버튼을 눌러야
//      committedQuery가 갱신되고 그 시점에만 결과가 나타난다.
//   2) 결과 버튼은 COMPLEXES 전체를 항상 렌더링해두고, 매칭 안 되는 것만
//      hidden 처리한다(필터링해서 갯수 자체를 줄이지 않음).
//   3) 결과 리스트 wrapper는 한 번 보여준 뒤로는 다시 hidden 처리하지 않는다
//      (개별 행만 hidden 토글) — 재검색할 때마다 등장 애니메이션이 다시
//      재생되어 깜빡이는 문제를 막기 위함.
//   4) 결과 선택은 mousedown 시점에 어떤 단지를 눌렀는지 pendingSelectId(ref)에
//      기록해두고, click에서 그 값을 그대로 확정 처리한다 — click의 e.target을
//      바로 믿지 않는다.
export default function InterestModal({ open, onClose, onSubmit }) {
  const [screen, setScreen] = useState("search"); // 'search' | 'size' | 'detail'
  const [query, setQuery] = useState("");
  const [committedQuery, setCommittedQuery] = useState(null); // null = 아직 검색 안 함
  const [resultsEverShown, setResultsEverShown] = useState(false);
  const [complex, setComplex] = useState(null);
  const [size, setSize] = useState(null);
  const [price, setPrice] = useState("");
  const [accordionOpen, setAccordionOpen] = useState(false);
  const [floor, setFloor] = useState("");
  const [dong, setDong] = useState("");
  const [ho, setHo] = useState("");
  const [direction, setDirection] = useState(null);
  const [interior, setInterior] = useState(null);

  const searchInputRef = useRef(null);
  const pendingSelectId = useRef(null);

  // 모달이 열릴 때마다(open이 false→true로 바뀔 때) 내부 state를 전부
  // freshState()에 해당하는 초기값으로 되돌린다. useEffect 안에서 setState를
  // 연쇄로 호출하는 대신(react-hooks/set-state-in-effect가 경고하는, 불필요한
  // 리렌더를 유발하는 패턴), React 공식 문서가 권장하는 "렌더링 중 state
  // 조정" 패턴을 쓴다 — prevOpen과 open을 비교해 막 열린 순간에만, 렌더링
  // 도중 동기적으로 리셋한다.
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setScreen("search");
      setQuery("");
      setCommittedQuery(null);
      setResultsEverShown(false);
      setComplex(null);
      setSize(null);
      setPrice("");
      setAccordionOpen(false);
      setFloor("");
      setDong("");
      setHo("");
      setDirection(null);
      setInterior(null);
    }
  }

  // 검색창 포커스는 실제 DOM을 건드리는 부수효과라 useEffect가 맞는 자리.
  useEffect(() => {
    if (!open) return;
    const raf = requestAnimationFrame(() => searchInputRef.current?.focus());
    return () => cancelAnimationFrame(raf);
  }, [open]);

  // 모달이 열려있는 동안 배경 스크롤 잠금.
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  function commitSearch() {
    setCommittedQuery(query.trim());
    if (query.trim()) setResultsEverShown(true);
  }

  function handleSelectComplex(id) {
    const c = COMPLEXES.find((x) => x.id === id);
    if (!c) return;
    setComplex(c);
    setSize(null);
    setScreen("size");
  }

  const backLinkHidden = screen === "search";
  const canSubmit = complex && size !== null;

  function handleFooterClick() {
    if (!canSubmit) return;
    const sizeInfo = complex.sizes[size];
    onSubmit({
      name: complex.name,
      sizeLabel: sizeInfo.label,
      price,
      floor,
      dong,
      ho,
      direction,
      interior,
      regulations: complex.regulations || [],
    });
  }

  return (
    <div
      className={"modal-overlay" + (open ? " is-open" : "")}
      data-component="InterestModal"
      inert={!open}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <aside className="modal-panel" role="dialog" aria-modal="true" aria-label="관심 매물 추가">
        <div className="modal-header" data-component="ModalHeader">
          <button
            tabIndex={0}
            className="back-link"
            type="button"
            hidden={backLinkHidden}
            onClick={() => setScreen("search")}
          >
            <BackArrowIcon />
            매물 검색 돌아가기
          </button>
          <button tabIndex={0} className="modal-close" type="button" aria-label="닫기" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>

        <div className="modal-content" id="modal-content" data-component="ModalContent">
          {screen === "search" && (
            <SearchStep
              query={query}
              onQueryChange={setQuery}
              onCommit={commitSearch}
              committedQuery={committedQuery}
              resultsEverShown={resultsEverShown}
              pendingSelectId={pendingSelectId}
              onSelectComplex={handleSelectComplex}
              searchInputRef={searchInputRef}
            />
          )}
          {screen === "size" && (
            <SizeSelectStep
              complex={complex}
              size={size}
              onSelectSize={(i) => {
                setSize(i);
                setScreen("detail");
              }}
            />
          )}
          {screen === "detail" && (
            <DetailStep
              complex={complex}
              size={size}
              price={price}
              onPriceChange={setPrice}
              accordionOpen={accordionOpen}
              onToggleAccordion={() => setAccordionOpen((v) => !v)}
              floor={floor}
              onFloorChange={setFloor}
              dong={dong}
              onDongChange={setDong}
              ho={ho}
              onHoChange={setHo}
              direction={direction}
              onDirectionChange={setDirection}
              interior={interior}
              onInteriorChange={setInterior}
              onReselect={() => setScreen("size")}
            />
          )}
        </div>

        <div className="modal-footer" data-component="ModalFooter">
          <button
            tabIndex={0}
            className="footer-btn"
            type="button"
            data-state={canSubmit ? "active" : "disabled"}
            onClick={handleFooterClick}
          >
            {canSubmit && screen === "detail" ? "단지 바로 추가" : "단지 추가"}
          </button>
        </div>
      </aside>
    </div>
  );
}

// <SearchStep /> : 검색 입력 + <ResultsList />
function SearchStep({
  query,
  onQueryChange,
  onCommit,
  committedQuery,
  resultsEverShown,
  pendingSelectId,
  onSelectComplex,
  searchInputRef,
}) {
  const q = committedQuery || "";
  const matched = q ? COMPLEXES.filter((c) => c.name.indexOf(q) !== -1) : [];
  const showEmptyState = resultsEverShown && q && matched.length === 0;

  return (
    <>
      <h2 className="modal-title">
        보고계신 매물
        <br />
        단지를 입력해보세요
      </h2>
      <div className="search-field">
        <input
          ref={searchInputRef}
          id="search-input"
          type="text"
          placeholder="단지명 입력 (예.행당대림)"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onCommit();
          }}
        />
        <button
          tabIndex={0}
          className="search-submit"
          type="button"
          aria-label="검색"
          onClick={onCommit}
        >
          <SearchIcon />
        </button>
      </div>

      {/* resultsEverShown이 true가 된 뒤로는 이 wrapper 자체를 계속 렌더링해
          slideDown 등장 애니메이션이 재검색마다 다시 재생되지 않게 한다(위
          컴포넌트 상단 주석 3번). COMPLEXES는 항상 전체를 렌더링하고 매칭
          안 되는 것만 hidden 처리한다(2번). */}
      {resultsEverShown && (
        <div id="results-slot">
          <div className="result-list">
            {COMPLEXES.map((c) => (
              <button
                key={c.id}
                tabIndex={0}
                className="result-row"
                type="button"
                hidden={!matched.includes(c)}
                onMouseDown={(e) => {
                  pendingSelectId.current = c.id;
                  e.preventDefault();
                }}
                onClick={() => {
                  const id = pendingSelectId.current || c.id;
                  pendingSelectId.current = null;
                  onSelectComplex(id);
                }}
              >
                <span className="result-text">
                  <span className="result-name">{c.name}</span>
                  <span className="result-sub">
                    {c.region} / {c.built} 거래 / 평형 {c.dealCount}개
                  </span>
                </span>
                <ChevronRightIcon />
              </button>
            ))}
          </div>
          <div className="empty-state" hidden={!showEmptyState}>
            일치하는 단지가 없어요. 단지명을 다시 확인해주세요.
          </div>
        </div>
      )}
    </>
  );
}

// <SizeSelectStep /> : 평형 탭 목록
function SizeSelectStep({ complex, size, onSelectSize }) {
  return (
    <>
      <h2 className="modal-title">
        {complex.name} 매물의
        <br />
        평형을 선택해주세요
      </h2>
      <div className="complex-summary">
        <div className="complex-name">{complex.name}</div>
        <div className="complex-sub">
          {complex.region} / {complex.built} 거래 / 평형 {complex.dealCount}개
        </div>
      </div>
      <div className="size-list">
        {complex.sizes.map((s, i) => {
          const selected = size === i;
          return (
            <button
              key={s.label}
              tabIndex={0}
              className={"size-tab" + (selected ? " is-selected" : "")}
              type="button"
              onClick={() => onSelectSize(i)}
            >
              {selected && (
                <span className="size-tab-check">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                    <path d="M5 12l5 5L19 7" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              )}
              <span className="size-tab-title">{s.label}</span>
              <span className="size-tab-price">{s.price}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}

// <DetailStep /> : 호가 입력 + <DetailAccordion />(층/동/호수 + <ChipGroup/> x2)
function DetailStep({
  complex,
  size,
  price,
  onPriceChange,
  accordionOpen,
  onToggleAccordion,
  floor,
  onFloorChange,
  dong,
  onDongChange,
  ho,
  onHoChange,
  direction,
  onDirectionChange,
  interior,
  onInteriorChange,
  onReselect,
}) {
  return (
    <>
      <h2 className="modal-title">
        호가를 포함한
        <br />
        상세 정보를 입력해주세요
      </h2>
      <p className="modal-subtext">지금은 넘어가도 돼요</p>
      <div className="complex-summary">
        <div className="complex-summary-row">
          <div>
            <div className="complex-name">{complex.name}</div>
            <div className="complex-size-tag">{complex.sizes[size].label}</div>
          </div>
          <button tabIndex={0} className="reselect-link" type="button" onClick={onReselect}>
            평형 다시 선택
          </button>
        </div>
      </div>

      <div className="price-field">
        <div className="price-field-label">호가</div>
        <div className="field-suffix-wrap">
          <input
            type="text"
            inputMode="numeric"
            placeholder="32,000"
            value={price}
            onChange={(e) => onPriceChange(e.target.value)}
          />
          <span className="field-suffix">만원</span>
        </div>
        <p className="price-helper">
          <strong>호가를 입력</strong>하시면 현재 호가와 실거래 정보를 활용한 인사이트를 제공받을 수 있습니다.
        </p>
      </div>

      {/* 아코디언 본문은 열림 여부와 무관하게 항상 DOM에 그려두고, 펼치기/접기는
          className(.is-open)만 토글해서 처리한다(프로토타입과 동일 원칙). */}
      <div className={"accordion" + (accordionOpen ? " is-open" : "")}>
        <button
          tabIndex={0}
          className="accordion-toggle"
          type="button"
          aria-expanded={accordionOpen}
          onClick={onToggleAccordion}
        >
          <span>
            <span className="accordion-title">상세 정보 추가하기</span>
            <span className="accordion-hint">(층, 동호수 등)</span>
          </span>
          <span className="accordion-chevron">
            <ChevronDownIcon />
          </span>
        </button>
        <div className="accordion-body" inert={!accordionOpen}>
          <div className="accordion-body-inner">
            <div className="field-block">
              <div className="field-block-label">층</div>
              <div className="field-row">
                <div className="field-small field-suffix-wrap">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={3}
                    placeholder="8"
                    value={floor}
                    onChange={(e) => onFloorChange(e.target.value)}
                  />
                  <span className="field-suffix">층</span>
                </div>
              </div>
            </div>

            <div className="field-block">
              <div className="field-block-label">동/호수</div>
              <div className="field-row">
                <div className="field-small field-suffix-wrap">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    placeholder="208"
                    value={dong}
                    onChange={(e) => onDongChange(e.target.value)}
                  />
                  <span className="field-suffix">동</span>
                </div>
                <span className="field-sep">/</span>
                <div className="field-small field-suffix-wrap">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    placeholder="1501"
                    value={ho}
                    onChange={(e) => onHoChange(e.target.value)}
                  />
                  <span className="field-suffix">호</span>
                </div>
              </div>
            </div>

            <div className="field-block">
              <div className="field-block-label">향</div>
              <ChipGroup options={DIRECTIONS} value={direction} onChange={onDirectionChange} />
            </div>

            <div className="field-block">
              <div className="field-block-label">인테리어</div>
              <ChipGroup options={INTERIORS} value={interior} onChange={onInteriorChange} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
