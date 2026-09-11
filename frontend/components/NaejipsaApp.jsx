"use client";

import { useEffect, useState } from "react";
import Header from "./Header";
import Workspace from "./Workspace";
import InterestModal from "./Modal/InterestModal";
import EditListingDialog from "./EditListingDialog";
import AuthModal from "./Modal/AuthModal";
import Toast from "./Toast";
import useToast from "@/hooks/useToast";
import { MAX_DASHBOARD_ITEMS } from "@/lib/data";

// <App /> : 최상위 클라이언트 컴포넌트. 대시보드 아이템, 히어로 노출 여부,
// 모달/수정팝업 열림 상태처럼 여러 자식이 함께 필요로 하는 state를 여기서
// 들고 내려준다(3~4단계 깊이라 prop 전달로 충분 — 별도 context는 안 씀).
export default function NaejipsaApp() {
  const [dashboardItems, setDashboardItems] = useState([]);
  const [dashboardItemSeq, setDashboardItemSeq] = useState(0);
  // dashboardRevealed: 한 번 true가 되면 영구히 true(다시 안 돌아감) — 대시보드
  // 탭/"대시보드로 돌아가기" 버튼처럼 "최초 1회 이후로 쓸 수 있는" UI를 켜는
  // 가드. heroCleared: 히어로가 지금 시각적으로 걷혀있는지 — 로고 클릭으로
  // 다시 열 수 있고, 매물을 등록할 때마다(최초든 재등록이든) 다시 닫힌다.
  const [dashboardRevealed, setDashboardRevealed] = useState(false);
  const [heroCleared, setHeroCleared] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState(null);
  // activeContentTab: 헤더의 "상세 데이터"/"인사이트" 메뉴 - Workspace가 이
  // 값을 받아 .content-track(오른쪽 차트 영역)을 좌우로 슬라이드한다.
  const [activeContentTab, setActiveContentTab] = useState("detail");
  const toast = useToast();

  const editingItem =
    dashboardItems.find((it) => it.id === editingItemId) || null;
  const mainScreenInert = modalOpen || authModalOpen || editingItemId != null;

  // Escape로 닫기 — edit-overlay가 열려 있으면 그쪽을 먼저 닫고, 아니면
  // modal-overlay를 닫는 순서(프로토타입과 동일).
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key !== "Escape") return;
      if (editingItemId != null) {
        setEditingItemId(null);
        return;
      }
      if (modalOpen) setModalOpen(false);
      if (authModalOpen) setAuthModalOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [editingItemId, modalOpen, authModalOpen]);

  // 매물을 등록할 때마다 호출 — 대시보드 최초 노출 여부(dashboardRevealed)와
  // 무관하게 히어로는 매번 걷힌다. 로고로 히어로를 다시 연 상태에서 매물을
  // 추가로 등록해도 등록 직후 다시 위로 슬라이드되며 사라져야 하기 때문.
  function revealDashboard() {
    setDashboardRevealed(true);
    setHeroCleared(true);
  }
  function reopenHero() {
    if (!dashboardRevealed) return;
    setHeroCleared(false);
  }
  function closeHeroAgain() {
    if (!dashboardRevealed) return;
    setHeroCleared(true);
  }

  function handleToggle(id) {
    setDashboardItems((items) =>
      items.map((it) => (it.id === id ? { ...it, checked: !it.checked } : it)),
    );
  }
  function handleRemove(id) {
    setDashboardItems((items) => items.filter((it) => it.id !== id));
  }
  function handleReorder(nextItems) {
    setDashboardItems(nextItems);
  }
  function handleEdit(id) {
    setEditingItemId(id);
  }
  function handleEditSave(id, data) {
    setDashboardItems((items) =>
      items.map((it) => (it.id === id ? { ...it, ...data } : it)),
    );
    setEditingItemId(null);
  }

  function handleAddSubmit(itemData) {
    setModalOpen(false);
    if (dashboardItems.length >= MAX_DASHBOARD_ITEMS) {
      // 정상 UI 흐름에서는 도달할 수 없지만(추가 슬롯이 사라짐), 로고로
      // 히어로를 다시 불러와 CTA로 진입하는 경로는 cap을 별도로 막지 않으므로
      // 여기서 최종 방어.
      toast.show(
        `관심 매물은 최대 ${MAX_DASHBOARD_ITEMS}개까지 추가할 수 있어요`,
      );
      return;
    }
    const nextSeq = dashboardItemSeq + 1;
    setDashboardItemSeq(nextSeq);
    setDashboardItems((items) => [
      ...items,
      {
        id: "item-" + nextSeq,
        name: itemData.name,
        sizeLabel: itemData.sizeLabel,
        price: itemData.price || "",
        floor: itemData.floor || "",
        dong: itemData.dong || "",
        ho: itemData.ho || "",
        direction: itemData.direction || null,
        interior: itemData.interior || null,
        regulations: itemData.regulations || [],
        // 차트가 실거래 데이터를 불러올 때 쓰는 백엔드 식별자 (InterestModal에서
        // 실 검색으로 추가한 경우에만 값이 있음).
        complexId: itemData.complexId ?? null,
        sizeId: itemData.sizeId ?? null,
        checked: true,
      },
    ]);
    revealDashboard();
    toast.show(`${itemData.name} ${itemData.sizeLabel} 매물이 추가되었습니다`);
  }

  return (
    <div id="app" data-component="App">
      <div id="main-screen" data-component="MainScreen" inert={mainScreenInert}>
        <Header
          onLogoClick={reopenHero}
          onLoginClick={() => setAuthModalOpen(true)}
          activeContentTab={activeContentTab}
          onContentTabChange={setActiveContentTab}
          showContentTabs={dashboardRevealed}
        />
        <Workspace
          items={dashboardItems}
          onToggle={handleToggle}
          onEdit={handleEdit}
          onRemove={handleRemove}
          onReorder={handleReorder}
          onAdd={() => setModalOpen(true)}
          heroCleared={heroCleared}
          showHeroCloseBtn={dashboardRevealed}
          onHeroClose={closeHeroAgain}
          activeContentTab={activeContentTab}
        />
      </div>

      <AuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSignupComplete={() => toast.show("회원가입이 완료되었습니다")}
      />
      <InterestModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleAddSubmit}
      />

      <EditListingDialog
        open={editingItemId != null}
        item={editingItem}
        onSave={handleEditSave}
        onCancel={() => setEditingItemId(null)}
      />

      <Toast message={toast.message} visible={toast.visible} />
    </div>
  );
}
