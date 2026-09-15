"use client";

import { DocumentIcon } from "../icons";

// <AddToGroupModal /> : "전체 후보" 표시줄의 "기존 그룹에 추가"로 여는 그룹 선택 모달.
// 체크한 후보를 복사하지 않고, 고른 그룹이 기존 후보를 가리키게만 한다.
// EditListingDialog·SaveGroupModal과 같은 edit-overlay/edit-dialog 뼈대를 쓰고,
// 닫혀 있을 때는 그리지 않는다.
export default function AddToGroupModal({ open, groups, selectedCount, onSelect, onCancel }) {
  if (!open) return null;

  return (
    <div
      className="edit-overlay is-open"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="edit-dialog" role="dialog" aria-modal="true" aria-label="기존 그룹에 추가">
        <div className="edit-dialog-title">기존 그룹에 추가</div>
        <div className="edit-dialog-name">
          체크한 후보 {selectedCount}개를 넣을 그룹을 골라주세요. 이미 들어 있는 후보는 건너뛰어요.
        </div>

        {groups.length === 0 ? (
          <div className="add-to-group-empty">아직 만든 그룹이 없어요</div>
        ) : (
          <div className="add-to-group-list">
            {groups.map((group) => (
              <button
                key={group.id}
                type="button"
                tabIndex={0}
                className="group-row-main"
                aria-label={`${group.name} (후보 ${group.item_count}개)`}
                onClick={() => onSelect(group.id)}
              >
                <DocumentIcon />
                <span className="group-row-name">{group.name}</span>
                <span className="group-row-count">{group.item_count}</span>
              </button>
            ))}
          </div>
        )}

        <div className="edit-dialog-actions">
          <button type="button" className="edit-dialog-cancel" tabIndex={0} onClick={onCancel}>
            취소
          </button>
        </div>
      </div>
    </div>
  );
}
