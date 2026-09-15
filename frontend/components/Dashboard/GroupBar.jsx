"use client";

import { CopyIcon, DocumentIcon, PencilIcon, PlusIcon, XIcon } from "../icons";

// <GroupBar /> : 헤더 "그룹" 버튼을 누르면 그 아래 말풍선 모양으로 펼쳐지는 그룹 메뉴.
// 그룹에 관한 동작은 모두 여기서 한다(목록 위에 따로 버튼 줄을 두지 않는다).
//
//   전체 후보              누르면 그룹 보기를 끝내고 전체 후보를 보여준다.
//   그룹 한 줄             이름·후보 수. 누르면 목록이 그 그룹의 후보로 좁혀진다.
//     추가                 카드에서 체크한 후보를 이 그룹에 넣는다.
//     X                    그룹만 삭제한다. 후보는 전체 후보에 남는다.
//     (보고 있는 그룹만)    이름 수정 / 이 그룹으로 새 그룹 만들기
//   새 그룹 만들기         체크한 후보로 새 그룹을 만든다(체크가 없으면 빈 그룹).
//
// 어떤 동작도 후보를 지우거나 다시 만들지 않는다(백엔드 app/group).
export default function GroupBar({ menu }) {
  if (!menu.open) return null;

  const { groups, activeGroup, totalCount, selectedCount } = menu;
  const canAdd = selectedCount > 0;
  const createHint = canAdd ? `체크한 후보 ${selectedCount}개` : "빈 그룹";

  return (
    <div className="group-bar" data-component="GroupBar">
      <button
        type="button"
        tabIndex={0}
        className={"group-all-row" + (activeGroup ? "" : " is-active")}
        aria-label={`전체 후보 (후보 ${totalCount}개)`}
        aria-pressed={!activeGroup}
        onClick={menu.onShowAll}
      >
        <span className="group-row-name">전체 후보</span>
        <span className="group-row-count">{totalCount}</span>
      </button>

      <div className="group-bar-list">
        {groups.length === 0 ? (
          <p className="group-bar-empty">아직 만든 그룹이 없어요</p>
        ) : (
          groups.map((group) => {
            const active = group.id === activeGroup?.id;
            return (
              <div key={group.id} className={"group-row" + (active ? " is-active" : "")}>
                <div className="group-row-line">
                  <button
                    type="button"
                    tabIndex={0}
                    className="group-row-main"
                    title={group.name}
                    aria-label={`${group.name} (후보 ${group.item_count}개)`}
                    aria-pressed={active}
                    onClick={() => menu.onSelect(group.id)}
                  >
                    <DocumentIcon />
                    <span className="group-row-name">{group.name}</span>
                    <span className="group-row-count">{group.item_count}</span>
                  </button>
                  <button
                    type="button"
                    tabIndex={0}
                    className="group-row-add"
                    disabled={!canAdd}
                    title={canAdd ? undefined : "그룹에 넣을 후보를 먼저 체크해주세요"}
                    aria-label={`체크한 후보 ${selectedCount}개를 "${group.name}" 그룹에 추가`}
                    onClick={() => menu.onAddTo(group.id)}
                  >
                    추가
                  </button>
                  <button
                    type="button"
                    tabIndex={0}
                    className="group-row-delete"
                    aria-label={`"${group.name}" 그룹 삭제`}
                    onClick={() => menu.onDelete(group.id)}
                  >
                    <XIcon />
                  </button>
                </div>
                {active && (
                  <div className="group-row-actions">
                    <button type="button" tabIndex={0} onClick={menu.onRename}>
                      <PencilIcon />
                      이름 수정
                    </button>
                    <button type="button" tabIndex={0} onClick={menu.onCopy}>
                      <CopyIcon />
                      이 그룹으로 새 그룹 만들기
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <button
        type="button"
        tabIndex={0}
        className="group-bar-create"
        aria-label={`새 그룹 만들기 (${createHint})`}
        onClick={menu.onCreate}
      >
        <PlusIcon />
        새 그룹 만들기
        <span className="group-bar-create-hint">{createHint}</span>
      </button>
    </div>
  );
}
