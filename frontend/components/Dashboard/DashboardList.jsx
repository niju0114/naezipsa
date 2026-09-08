"use client";

import { useRef } from "react";
import InterestCard from "./InterestCard";
import useDragReorder from "./useDragReorder";
import { PlusIcon } from "../icons";
import { MAX_DASHBOARD_ITEMS } from "@/lib/data";

// <DashboardList /> : 왼쪽 관심 매물 카드 목록, 자체 스크롤. 리스트는 항상
// 정확히 MAX_DASHBOARD_ITEMS(6)칸을 채운 상태로 렌더링한다: 채워진 카드 →
// (자리가 남아있다면) "+ 매물 추가하기" 트리거 1칸 → 나머지는 빈 자리표시자.
// 6개를 다 채우면 추가 트리거는 사라지고 6칸 모두 카드로 채워진다.
export default function DashboardList({ items, onToggle, onEdit, onRemove, onReorder, onAdd }) {
  const listRef = useRef(null);
  const startDrag = useDragReorder(listRef, items, onReorder);

  const remaining = MAX_DASHBOARD_ITEMS - items.length;
  const emptyCount = remaining > 0 ? remaining - 1 : 0;

  return (
    <div className="dashboard-list" id="dashboard-list" ref={listRef} data-component="DashboardList">
      {items.map((item) => (
        <InterestCard
          key={item.id}
          item={item}
          onToggle={onToggle}
          onEdit={onEdit}
          onRemove={onRemove}
          onDragHandleMouseDown={startDrag}
        />
      ))}

      {remaining > 0 && (
        <div className="interest-row" data-slot="add">
          <span className="interest-drag-spacer" aria-hidden="true" />
          <button
            type="button"
            className="dashboard-add-slot"
            id="dashboard-add-slot-btn"
            tabIndex={0}
            onClick={onAdd}
          >
            <span className="plus-icon-circle">
              <PlusIcon />
            </span>
            매물 추가하기
          </button>
        </div>
      )}

      {Array.from({ length: emptyCount }).map((_, i) => (
        <div className="interest-row" aria-hidden="true" key={"empty-" + i}>
          <span className="interest-drag-spacer" />
          <div className="dashboard-list-slot-empty" />
        </div>
      ))}
    </div>
  );
}
