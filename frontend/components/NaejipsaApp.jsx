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
import { supabase } from "@/lib/supabaseClient";
import {
  getDashboardItems,
  createDashboardItem,
  updateDashboardItemDetails,
  deleteDashboardItem,
} from "@/lib/api";
import {
  toCreateItemPayload,
  toDetailsPayload,
  fromBackendItem,
} from "@/lib/dashboardItems";

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
  // 로그인 세션(user) - Supabase Auth가 관리하는 세션을 그대로 반영한다.
  // getSession()으로 새로고침 시 기존 로그인을 복원하고, onAuthStateChange로
  // 로그인/로그아웃/토큰 갱신이 일어날 때마다 최신 상태를 따라간다(로그인
  // 모달의 이메일·소셜 로그인은 성공하면 이 리스너를 통해 자동으로 반영됨).
  const [user, setUser] = useState(null);
  const toast = useToast();

  useEffect(() => {
    let cancelled = false;

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setUser(data.session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  function handleLogout() {
    supabase.auth.signOut();
    // 로그아웃 자체는 사용자 액션이라 여기서 바로 비운다(로그인 전
    // 게스트 상태로 되돌아감). 세션이 다른 이유로 끊기는 경우(토큰 만료
    // 등)는 흔치 않아 일단 로그아웃 버튼 경로만 처리한다.
    setDashboardItems([]);
  }

  // 로그인 상태가 바뀔 때마다 대시보드 아이템을 서버 기준으로 맞춘다.
  // 로그인: 이전에 저장해둔 후보 목록을 그대로 불러와 보여준다(요청 사항).
  // 로그아웃: 서버 목록을 치우고 빈 게스트 상태로 돌아간다 - 로그인 전에
  // 게스트로 추가했던 항목은 애초에 서버에 없던 것이라 같이 사라진다.
  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    getDashboardItems()
      .then((res) => {
        if (cancelled) return;
        const items = res.items.map((raw, index) =>
          fromBackendItem(raw, `item-${index + 1}`),
        );
        setDashboardItemSeq(items.length);
        setDashboardItems(items);
        if (items.length > 0) {
          setDashboardRevealed(true);
          setHeroCleared(true);
        }
      })
      .catch(() => {
        if (cancelled) return;
        toast.show("저장된 관심 매물을 불러오지 못했어요.");
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

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

  // 체크박스(비교 차트 포함 여부) 토글 - 로그인 상태면 서버에도 반영한다.
  // updateDashboardItemDetails에 { checked }만 딱 담아 보내는 게 중요하다:
  // toDetailsPayload처럼 전체 필드를 채워 보내면 호가·동·호 같은 다른
  // 선택정보가 의도치 않게 지워질 수 있다(PATCH 핸들러가 exclude_unset이라
  // 요청 바디에 없는 키는 안 건드리므로, checked 하나만 보내면 그것만 바뀐다).
  async function handleToggle(id) {
    const item = dashboardItems.find((it) => it.id === id);
    if (!item) return;
    const nextChecked = !item.checked;
    if (user && item.backendId) {
      try {
        await updateDashboardItemDetails(item.backendId, { checked: nextChecked });
      } catch {
        toast.show("체크 상태를 저장하지 못했어요. 잠시 후 다시 시도해주세요.");
        return;
      }
    }
    setDashboardItems((items) =>
      items.map((it) => (it.id === id ? { ...it, checked: nextChecked } : it)),
    );
  }
  async function handleRemove(id) {
    const item = dashboardItems.find((it) => it.id === id);
    if (user && item?.backendId) {
      try {
        await deleteDashboardItem(item.backendId);
      } catch {
        toast.show("관심 매물을 삭제하지 못했어요. 잠시 후 다시 시도해주세요.");
        return;
      }
    }
    setDashboardItems((items) => items.filter((it) => it.id !== id));
  }
  function handleReorder(nextItems) {
    setDashboardItems(nextItems);
  }
  function handleEdit(id) {
    setEditingItemId(id);
  }
  async function handleEditSave(id, data) {
    const item = dashboardItems.find((it) => it.id === id);
    if (user && item?.backendId) {
      try {
        await updateDashboardItemDetails(
          item.backendId,
          toDetailsPayload(data),
        );
      } catch {
        toast.show("변경사항을 저장하지 못했어요. 잠시 후 다시 시도해주세요.");
        return;
      }
    }
    setDashboardItems((items) =>
      items.map((it) => (it.id === id ? { ...it, ...data } : it)),
    );
    setEditingItemId(null);
  }

  async function handleAddSubmit(itemData) {
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

    // 로그인 상태면 서버에도 저장한다 - 실패하면 로컬에도 추가하지 않는다
    // (화면엔 보이는데 서버엔 없는 상태가 되는 걸 막기 위해).
    let backendId = null;
    if (user) {
      try {
        const created = await createDashboardItem(
          toCreateItemPayload(itemData),
        );
        backendId = created.id;
      } catch {
        toast.show("관심 매물을 저장하지 못했어요. 잠시 후 다시 시도해주세요.");
        return;
      }
    }

    const nextSeq = dashboardItemSeq + 1;
    setDashboardItemSeq(nextSeq);
    setDashboardItems((items) => [
      ...items,
      {
        id: "item-" + nextSeq,
        backendId,
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
          user={user}
          onLogoutClick={handleLogout}
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
