"use client";

import { DocumentIcon, PlusIcon, XIcon } from "../icons";

// <GroupBar /> : 헤더의 "그룹 저장" 버튼을 누르면 그 아래 말풍선 모양으로
// 펼쳐지는 저장된 그룹 목록. 한 줄에 하나씩(문서 아이콘 + 이름 + 삭제
// 버튼) 쌓이고, 맨 아래에 항상 동그란 "+"(SaveGroupModal을 여는 트리거)가
// 붙는다.
export default function GroupBar({ open, groups, onSelectGroup, onAddClick, onDeleteGroup }) {
  if (!open) return null;

  return (
    <div className="group-bar" data-component="GroupBar">
      <div className="group-bar-list">
        {groups.map((group) => (
          <div key={group.id} className="group-row">
            <button
              type="button"
              tabIndex={0}
              className="group-row-main"
              title={group.name}
              onClick={() => onSelectGroup(group.id)}
            >
              <DocumentIcon />
              <span className="group-row-name">{group.name}</span>
            </button>
            <button
              type="button"
              tabIndex={0}
              className="group-row-delete"
              aria-label={`"${group.name}" 그룹 삭제`}
              onClick={(e) => {
                // 부모 버튼(그룹 불러오기)으로 클릭이 번지면 삭제하려다 그룹을
                // 불러와버리는 사고가 나므로 여기서 끊는다.
                e.stopPropagation();
                onDeleteGroup(group.id);
              }}
            >
              <XIcon />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        tabIndex={0}
        className="group-bar-add"
        aria-label="그룹 추가"
        onClick={onAddClick}
      >
        <PlusIcon />
      </button>
    </div>
  );
}
