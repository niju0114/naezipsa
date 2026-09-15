"use client";

import { useRef } from "react";
import InterestCard from "./InterestCard";
import useDragReorder from "./useDragReorder";
import { PencilIcon, PlusIcon } from "../icons";
import { MAX_DASHBOARD_ITEMS } from "@/lib/data";

// <DashboardList /> : 왼쪽 관심 매물 카드 목록, 자체 스크롤. 채워진 카드 →
// (자리가 남아있다면) "+ 매물 추가하기" 트리거 1칸 순으로 렌더링한다. 등록되지
// 않은 나머지 자리는 더 이상 빈 칸으로 공간을 차지하지 않는다 - 6개를 다
// 채우면 추가 트리거도 사라진다.
//
// groupView(로그인 사용자만): 목록 맨 위 표시줄. 그룹을 보고 있지 않으면 "전체 후보"와
// 체크한 후보로 "새 그룹 만들기"/"기존 그룹에 추가"를, 그룹을 보고 있으면 그룹 이름과
// 이름 수정/"이 그룹으로 새 그룹 만들기"/"전체 보기"를 보여준다. 그룹 보기에서 items는
// 그 그룹의 후보만 담으므로 남은 등록 칸은 전체 후보 수(totalCount)로 센다.
export default function DashboardList({
  items,
  totalCount = items.length,
  onToggle,
  onEdit,
  onRemove,
  onReorder,
  onAdd,
  groupView,
}) {
  const listRef = useRef(null);
  const startDrag = useDragReorder(listRef, items, onReorder);

  const remaining = MAX_DASHBOARD_ITEMS - totalCount;
  const activeGroupName = groupView?.activeGroupName;

  return (
    <div className="dashboard-list" id="dashboard-list" ref={listRef} data-component="DashboardList">
      {activeGroupName ? (
        <div className="active-group-bar" data-component="ActiveGroupBar">
          <div className="active-group-name-group">
            <span className="active-group-name" title={activeGroupName}>
              {activeGroupName}
            </span>
            <button
              type="button"
              tabIndex={0}
              className="active-group-rename-btn"
              aria-label="그룹명 수정"
              onClick={groupView.onRenameGroup}
            >
              <PencilIcon />
            </button>
          </div>
          <button
            type="button"
            tabIndex={0}
            className="active-group-save-btn"
            onClick={groupView.onCopyGroup}
          >
            이 그룹으로 새 그룹 만들기
          </button>
          <button
            type="button"
            tabIndex={0}
            className="active-group-save-btn is-secondary"
            onClick={groupView.onShowAll}
          >
            전체 보기
          </button>
        </div>
      ) : groupView && items.length > 0 ? (
        <div className="active-group-bar" data-component="CandidateGroupBar">
          <div className="active-group-name-group">
            <span className="active-group-name">전체 후보</span>
          </div>
          <button
            type="button"
            tabIndex={0}
            className="active-group-save-btn"
            onClick={groupView.onCreateGroup}
          >
            새 그룹 만들기
          </button>
          <button
            type="button"
            tabIndex={0}
            className="active-group-save-btn is-secondary"
            disabled={groupView.selectedCount === 0}
            title={groupView.selectedCount === 0 ? "그룹에 넣을 후보를 체크해주세요" : undefined}
            onClick={groupView.onAddToGroup}
          >
            기존 그룹에 추가
          </button>
        </div>
      ) : null}
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
    </div>
  );
}
