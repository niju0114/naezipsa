import DashboardList from "./DashboardList";
import DashboardCharts from "./DashboardCharts";

// <Dashboard /> : 항상 존재하는 레이어(히어로가 그 위에 겹쳐 있다가 걷힐 뿐).
// 왼쪽 관심 매물 리스트 + 오른쪽 차트 6칸.
export default function Dashboard({ items, onToggle, onEdit, onRemove, onReorder, onAdd }) {
  return (
    <div className="dashboard" data-component="Dashboard">
      <DashboardList
        items={items}
        onToggle={onToggle}
        onEdit={onEdit}
        onRemove={onRemove}
        onReorder={onReorder}
        onAdd={onAdd}
      />
      <DashboardCharts />
    </div>
  );
}
