"use client";

import { DocumentIcon, PlusIcon, XIcon } from "../icons";

// <GroupBar /> : 헤더의 "그룹" 버튼을 누르면 그 아래 말풍선 모양으로 펼쳐지는
// 내 그룹 목록. 한 줄에 하나씩(문서 아이콘 + 이름 + 후보 수 + 삭제 버튼) 쌓이고,
// 맨 아래에 항상 동그란 "+"(체크한 후보로 새 그룹 만들기)가 붙는다.
//
// 그룹을 누르면 목록이 그 그룹의 후보로 좁혀질 뿐 후보를 지우거나 다시 만들지 않는다.
// 삭제도 그룹만 지우고 후보는 전체 후보에 그대로 남는다(백엔드 app/group).
export default function GroupBar({ open, groups, activeGroupId, onSelectGroup, onAddClick, onDeleteGroup }) {
  if (!open) return null;

  return (
    <div className="group-bar" data-component="GroupBar">
      <div className="group-bar-list">
        {groups.map((group) => {
          const active = group.id === activeGroupId;
          return (
            <div key={group.id} className={"group-row" + (active ? " is-active" : "")}>
              <button
                type="button"
                tabIndex={0}
                className="group-row-main"
                title={group.name}
                aria-label={`${group.name} (후보 ${group.item_count}개)`}
                aria-pressed={active}
                onClick={() => onSelectGroup(group.id)}
              >
                <DocumentIcon />
                <span className="group-row-name">{group.name}</span>
                <span className="group-row-count">{group.item_count}</span>
              </button>
              <button
                type="button"
                tabIndex={0}
                className="group-row-delete"
                aria-label={`"${group.name}" 그룹 삭제`}
                onClick={(e) => {
                  // 옆의 그룹 보기 버튼으로 클릭이 번지지 않게 끊는다.
                  e.stopPropagation();
                  onDeleteGroup(group.id);
                }}
              >
                <XIcon />
              </button>
            </div>
          );
        })}
      </div>
      <button
        type="button"
        tabIndex={0}
        className="group-bar-add"
        aria-label="체크한 후보로 새 그룹 만들기"
        onClick={onAddClick}
      >
        <PlusIcon />
      </button>
    </div>
  );
}
