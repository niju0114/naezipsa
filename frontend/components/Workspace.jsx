import Dashboard from "./Dashboard/Dashboard";
import MainHeroOverlay from "./Hero/MainHeroOverlay";

// <Workspace /> : 헤더 아래 남는 영역 전체. Dashboard(항상 존재, 아래 레이어)와
// MainHeroOverlay(위 레이어, 블러 처리된 반투명 상태로 대시보드를 덮고 있다가
// 관심 매물을 한 번이라도 추가하면 위로 슬라이드되며 사라짐)가 겹쳐서 배치된다.
export default function Workspace({
  items,
  onToggle,
  onEdit,
  onRemove,
  onReorder,
  onAdd,
  heroCleared,
  showHeroCloseBtn,
  onHeroClose,
}) {
  return (
    <div className="workspace" data-component="Workspace">
      <Dashboard
        items={items}
        onToggle={onToggle}
        onEdit={onEdit}
        onRemove={onRemove}
        onReorder={onReorder}
        onAdd={onAdd}
      />
      <MainHeroOverlay
        cleared={heroCleared}
        showCloseBtn={showHeroCloseBtn}
        onClose={onHeroClose}
        onCtaClick={onAdd}
      />
    </div>
  );
}
