"use client";

import { useEffect, useRef, useState } from "react";
import ChipGroup from "./ChipGroup";
import { DIRECTIONS, INTERIORS } from "@/lib/data";

// <EditListingDialog /> : 대시보드 카드의 연필 아이콘으로 여는 화면 중앙
// 팝업. #modal-overlay(InterestModal, 오른쪽 슬라이드 패널)와는 완전히
// 독립된 두 번째 오버레이 — 동시에 둘 다 열릴 일은 없지만(연필 아이콘은
// 모달이 닫혀 대시보드가 보일 때만 클릭 가능) 구조적으로 분리해뒀다.
// 매물 등록(DetailStep)과 동일한 필드 구성(호가/층/동호수/향/인테리어)이되,
// 아코디언 없이 전부 펼쳐서 보여준다.
export default function EditListingDialog({ open, item, onSave, onCancel }) {
  const [price, setPrice] = useState("");
  const [floor, setFloor] = useState("");
  const [dong, setDong] = useState("");
  const [ho, setHo] = useState("");
  const [direction, setDirection] = useState(null);
  const [interior, setInterior] = useState(null);
  const priceInputRef = useRef(null);

  // 열릴 때(open이 true가 되는 시점)마다 해당 item의 현재 값으로 필드를
  // 채운다. InterestModal과 동일한 이유로 useEffect+setState 대신 "렌더링
  // 중 state 조정" 패턴을 쓴다(react-hooks/set-state-in-effect 회피).
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open && item) {
      setPrice(item.price || "");
      setFloor(item.floor || "");
      setDong(item.dong || "");
      setHo(item.ho || "");
      setDirection(item.direction || null);
      setInterior(item.interior || null);
    }
  }

  useEffect(() => {
    if (!open) return;
    const raf = requestAnimationFrame(() => priceInputRef.current?.focus());
    return () => cancelAnimationFrame(raf);
  }, [open]);

  function handleSave() {
    if (!item) return;
    onSave(item.id, { price, floor, dong, ho, direction, interior });
  }

  return (
    <div className={"edit-overlay" + (open ? " is-open" : "")} inert={!open} onClick={(e) => {
      if (e.target === e.currentTarget) onCancel();
    }}>
      <div className="edit-dialog" role="dialog" aria-modal="true" aria-label="매물 정보 수정">
        <div className="edit-dialog-title">매물 정보 수정</div>
        <div className="edit-dialog-name">{item ? item.name + " · " + item.sizeLabel : ""}</div>

        <div className="price-field">
          <div className="price-field-label">호가</div>
          <div className="field-suffix-wrap">
            <input
              ref={priceInputRef}
              type="text"
              inputMode="numeric"
              placeholder="32,000"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
            <span className="field-suffix">만원</span>
          </div>
        </div>

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
                onChange={(e) => setFloor(e.target.value)}
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
                onChange={(e) => setDong(e.target.value)}
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
                onChange={(e) => setHo(e.target.value)}
              />
              <span className="field-suffix">호</span>
            </div>
          </div>
        </div>

        <div className="field-block">
          <div className="field-block-label">향</div>
          <ChipGroup options={DIRECTIONS} value={direction} onChange={setDirection} />
        </div>

        <div className="field-block">
          <div className="field-block-label">인테리어</div>
          <ChipGroup options={INTERIORS} value={interior} onChange={setInterior} />
        </div>

        <div className="edit-dialog-actions">
          <button type="button" className="edit-dialog-cancel" tabIndex={0} onClick={onCancel}>
            취소
          </button>
          <button type="button" className="edit-dialog-save" tabIndex={0} onClick={handleSave}>
            저장
          </button>
        </div>
      </div>
    </div>
  );
}
