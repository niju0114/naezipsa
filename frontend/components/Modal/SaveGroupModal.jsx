"use client";

import { useEffect, useRef, useState } from "react";

// <SaveGroupModal /> : 그룹 이름 입력 모달. "새 그룹 만들기"(체크한 후보로),
// "이 그룹으로 새 그룹 만들기", "그룹명 수정"이 모두 이 컴포넌트를 그대로
// 쓴다(입력 하나 + 취소/확인 뼈대가 완전히 같아서 - 다른 건 제목/설명/버튼
// 문구와 시작 값, 그리고 onSave가 새로 만들지 이름만 바꿀지뿐).
// EditListingDialog와 같은 edit-overlay/edit-dialog 뼈대를 그대로 쓴다.
export default function SaveGroupModal({
  open,
  onSave,
  onCancel,
  initialName = "",
  title = "새 그룹 만들기",
  description = "",
  confirmLabel = "만들기",
}) {
  const [name, setName] = useState(initialName);
  const inputRef = useRef(null);

  // EditListingDialog와 동일한 이유로 useEffect+setState 대신 "렌더링 중
  // state 조정" 패턴을 쓴다(react-hooks/set-state-in-effect 회피) - 열릴
  // 때마다 이전 입력을 지우고 initialName으로 되돌린다(새 그룹 저장이면
  // 빈 값, 이름 수정이면 지금 이름).
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setName(initialName);
  }

  useEffect(() => {
    if (!open) return;
    const raf = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(raf);
  }, [open]);

  function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave(trimmed);
  }

  return (
    <div
      className={"edit-overlay" + (open ? " is-open" : "")}
      inert={!open}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="edit-dialog" role="dialog" aria-modal="true" aria-label={title}>
        <div className="edit-dialog-title">{title}</div>
        <div className="edit-dialog-name">{description}</div>

        <div className="group-name-field">
          <input
            ref={inputRef}
            type="text"
            maxLength={30}
            placeholder="예: 이사 후보 1순위"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
            }}
          />
        </div>

        <div className="edit-dialog-actions">
          <button type="button" className="edit-dialog-cancel" tabIndex={0} onClick={onCancel}>
            취소
          </button>
          <button
            type="button"
            className="edit-dialog-save"
            tabIndex={0}
            disabled={!name.trim()}
            onClick={handleSave}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
