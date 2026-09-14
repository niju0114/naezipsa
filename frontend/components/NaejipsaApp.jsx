"use client";

import { useEffect, useState } from "react";
import Header from "./Header";
import Workspace from "./Workspace";
import InterestModal from "./Modal/InterestModal";
import EditListingDialog from "./EditListingDialog";
import AuthModal from "./Modal/AuthModal";
import SaveGroupModal from "./Modal/SaveGroupModal";
import ImportShareModal from "./Modal/ImportShareModal";
import Toast from "./Toast";
import useToast from "@/hooks/useToast";
import { MAX_DASHBOARD_GROUPS, MAX_DASHBOARD_ITEMS } from "@/lib/data";
import { supabase } from "@/lib/supabaseClient";
import {
  getDashboardItems,
  createDashboardItem,
  updateDashboardItemDetails,
  deleteDashboardItem,
  getDashboardGroups,
  createDashboardGroup,
  loadDashboardGroup,
  saveDashboardGroup,
  renameDashboardGroup,
  deleteDashboardGroup,
  createDashboardShare,
  getDashboardShare,
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

  // 그룹 저장/불러오기 - groups는 GroupBar가 펼쳐질 때만 필요해서 열 때
  // 불러온다(목록 자체는 가벼우니 열 때마다 새로 받아와 최신 상태 유지).
  const [groups, setGroups] = useState([]);
  const [groupBarOpen, setGroupBarOpen] = useState(false);
  const [saveGroupModalOpen, setSaveGroupModalOpen] = useState(false);
  // 지금 보고 있는 목록이 어느 그룹에서 왔는지(불러왔거나, 방금 그 그룹으로
  // 저장했거나). 매물을 추가/삭제/체크해도 자동으로는 안 바뀌고, "저장"을
  // 눌러야만 이 그룹에 반영된다 - 그룹은 사용자가 명시적으로 갱신해야
  // 바뀌는 고정 스냅샷이어야 나중에 비교 기준으로 쓸 수 있기 때문.
  const [activeGroupId, setActiveGroupId] = useState(null);
  const [activeGroupName, setActiveGroupName] = useState(null);
  const [renameGroupModalOpen, setRenameGroupModalOpen] = useState(false);

  // 공유 - URL의 ?share=<token>을 열었을 때 보여줄 미리보기 상태.
  const [sharePreviewItems, setSharePreviewItems] = useState([]);
  const [importModalOpen, setImportModalOpen] = useState(false);

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
    setActiveGroupId(null);
    setActiveGroupName(null);
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

  // 공유 링크로 들어온 경우(?share=<token>) 미리보기를 띄운다. 로그인
  // 여부와 무관하게 동작해야 하므로(게스트도 공유받은 걸 볼 수 있어야 함)
  // user에 의존하지 않는 별도 마운트 1회 효과로 둔다.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("share");
    if (!token) return;

    let cancelled = false;
    getDashboardShare(token)
      .then((res) => {
        if (cancelled) return;
        setSharePreviewItems(res.items);
        setImportModalOpen(true);
      })
      .catch(() => {
        if (cancelled) return;
        toast.show("존재하지 않거나 만료된 공유 링크예요.");
      })
      .finally(() => {
        // 새로고침해도 다시 뜨지 않도록 쿼리스트링에서 지운다.
        const url = new URL(window.location.href);
        url.searchParams.delete("share");
        window.history.replaceState({}, "", url);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const editingItem =
    dashboardItems.find((it) => it.id === editingItemId) || null;
  const mainScreenInert =
    modalOpen ||
    authModalOpen ||
    editingItemId != null ||
    saveGroupModalOpen ||
    importModalOpen;

  // Escape로 닫기 — edit-overlay가 열려 있으면 그쪽을 먼저 닫고, 아니면
  // modal-overlay를 닫는 순서(프로토타입과 동일). SaveGroupModal/
  // ImportShareModal도 같은 edit-overlay 뼈대를 쓰므로 같은 순서에 낀다.
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key !== "Escape") return;
      if (editingItemId != null) {
        setEditingItemId(null);
        return;
      }
      if (saveGroupModalOpen) {
        setSaveGroupModalOpen(false);
        return;
      }
      if (importModalOpen) {
        handleImportCancel();
        return;
      }
      if (modalOpen) setModalOpen(false);
      if (authModalOpen) setAuthModalOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [editingItemId, modalOpen, authModalOpen, saveGroupModalOpen, importModalOpen]);

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

  // --- 그룹 저장/불러오기 ----------------------------------------------
  // "그룹"은 그 시점의 관심 매물 전체를 이름 붙여 떠둔 스냅샷. 게스트는
  // 서버에 아무것도 저장돼 있지 않으므로 로그인 사용자만 쓸 수 있다.

  // 팝업이 열려있을 때 트리거 버튼/팝업(.group-save-wrap) 바깥을 클릭하면
  // 닫는다. 버튼 클릭 자체도 이 리스너를 타지만 버튼이 .group-save-wrap
  // 안에 있어서 걸러지므로 토글이 이중으로 일어나지 않는다.
  useEffect(() => {
    if (!groupBarOpen) return;
    function onOutsideClick(e) {
      if (!e.target.closest(".group-save-wrap")) {
        setGroupBarOpen(false);
      }
    }
    document.addEventListener("mousedown", onOutsideClick);
    return () => document.removeEventListener("mousedown", onOutsideClick);
  }, [groupBarOpen]);

  async function handleGroupBarToggle() {
    if (!user) {
      toast.show("로그인 후 이용할 수 있어요");
      return;
    }
    const next = !groupBarOpen;
    setGroupBarOpen(next);
    if (!next) return;
    try {
      const res = await getDashboardGroups();
      setGroups(res.groups);
    } catch {
      toast.show("그룹 목록을 불러오지 못했어요.");
    }
  }

  function handleAddGroupClick() {
    if (dashboardItems.length === 0) {
      toast.show("저장할 관심 매물이 없어요. 먼저 매물을 추가해주세요.");
      return;
    }
    if (groups.length >= MAX_DASHBOARD_GROUPS) {
      toast.show(`그룹은 최대 ${MAX_DASHBOARD_GROUPS}개까지 저장할 수 있어요`);
      return;
    }
    setSaveGroupModalOpen(true);
  }

  async function handleSaveGroup(name) {
    try {
      const group = await createDashboardGroup(name);
      setGroups((gs) => [...gs, group]);
      setSaveGroupModalOpen(false);
      // 방금 지금 상태를 그대로 이 그룹으로 저장했으니, 이제부터는 이
      // 그룹이 활성 그룹이다.
      setActiveGroupId(group.id);
      setActiveGroupName(group.name);
      toast.show(`"${name}" 그룹으로 저장했어요`);
    } catch {
      toast.show("그룹을 저장하지 못했어요. 잠시 후 다시 시도해주세요.");
    }
  }

  // 그룹 불러오기 - 지금 관심 매물 목록을 그룹 내용으로 완전히 교체한다
  // (사용자 확정: 부분 병합이 아니라 교체 - 다른 그룹으로 언제든 다시
  // 불러올 수 있으니 지금 목록이 사라져도 되돌릴 수 있다).
  async function handleSelectGroup(groupId) {
    try {
      const res = await loadDashboardGroup(groupId);
      const items = res.items.map((raw, index) =>
        fromBackendItem(raw, `item-${index + 1}`),
      );
      setDashboardItemSeq(items.length);
      setDashboardItems(items);
      setGroupBarOpen(false);
      setActiveGroupId(groupId);
      setActiveGroupName(groups.find((g) => g.id === groupId)?.name ?? null);
      if (items.length > 0) revealDashboard();
      toast.show("그룹을 불러왔어요");
    } catch {
      toast.show("그룹을 불러오지 못했어요. 잠시 후 다시 시도해주세요.");
    }
  }

  // 그룹 삭제 - x 아이콘 클릭. 낙관적으로 먼저 화면에서 지우지 않고
  // 성공한 뒤에 지운다(삭제 실패했는데 화면에서만 사라지면 "다시 눌러도
  // 안 없어지네" 하고 헷갈릴 수 있어서 - 이 앱의 다른 삭제 동작들과 동일한
  // 방침).
  async function handleDeleteGroup(groupId) {
    try {
      await deleteDashboardGroup(groupId);
      setGroups((gs) => gs.filter((g) => g.id !== groupId));
      if (groupId === activeGroupId) {
        setActiveGroupId(null);
        setActiveGroupName(null);
      }
    } catch {
      toast.show("그룹을 삭제하지 못했어요. 잠시 후 다시 시도해주세요.");
    }
  }

  // 지금 상태를 활성 그룹에 그대로 덮어써 갱신한다(자동저장 아님 - 이
  // 버튼을 눌러야만 반영된다).
  async function handleSaveActiveGroup() {
    if (!activeGroupId) return;
    try {
      const group = await saveDashboardGroup(activeGroupId);
      setActiveGroupName(group.name);
      setGroups((gs) => gs.map((g) => (g.id === group.id ? group : g)));
      toast.show(`"${group.name}" 그룹에 저장했어요`);
    } catch {
      toast.show("그룹을 저장하지 못했어요. 잠시 후 다시 시도해주세요.");
    }
  }

  // 활성 그룹 이름 수정 - 매물 스냅샷은 그대로 두고 이름만 바꾼다.
  function handleRenameActiveGroupClick() {
    if (!activeGroupId) return;
    setRenameGroupModalOpen(true);
  }

  async function handleRenameActiveGroup(name) {
    if (!activeGroupId) return;
    try {
      const group = await renameDashboardGroup(activeGroupId, name);
      setActiveGroupName(group.name);
      setGroups((gs) => gs.map((g) => (g.id === group.id ? group : g)));
      setRenameGroupModalOpen(false);
      toast.show(`그룹 이름을 "${group.name}"으로 변경했어요`);
    } catch {
      toast.show("그룹 이름을 변경하지 못했어요. 잠시 후 다시 시도해주세요.");
    }
  }

  // --- 공유 ---------------------------------------------------------
  // 링크를 만드는 건 로그인 사용자만(내 관심 매물을 스냅샷 뜨는 것이므로).
  // 링크를 "여는" 건(아래 handleImportShare) 게스트도 가능 - 공유는 받는
  // 쪽 입장에서 로그인 여부와 무관하게 봐야 의미가 있다.

  async function handleShare() {
    if (!user) {
      toast.show("로그인 후 이용할 수 있어요");
      return;
    }
    if (dashboardItems.length === 0) {
      toast.show("공유할 관심 매물이 없어요. 먼저 매물을 추가해주세요.");
      return;
    }
    let token;
    try {
      ({ token } = await createDashboardShare());
    } catch {
      toast.show("공유 링크를 만들지 못했어요. 잠시 후 다시 시도해주세요.");
      return;
    }
    const url = `${window.location.origin}${window.location.pathname}?share=${token}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.show("공유 링크를 복사했어요");
    } catch {
      // 클립보드 접근이 막힌 환경(HTTP·권한 거부 등) - 링크 자체는 이미
      // 만들어졌으니 직접 복사할 수 있게 토스트에 그대로 보여준다.
      toast.show(`공유 링크: ${url}`);
    }
  }

  // 공유받은 매물을 지금 내 목록 뒤에 이어 붙인다(교체 아님 - 남이 보낸
  // 링크를 열었다고 내가 만들어둔 목록이 사라지면 안 되므로). 남은 슬롯보다
  // 많으면 들어가는 만큼만 추가하고 나머지는 안내한다.
  async function handleImportShare() {
    if (sharePreviewItems.length === 0) return;
    const remaining = MAX_DASHBOARD_ITEMS - dashboardItems.length;
    if (remaining <= 0) {
      toast.show(`관심 매물은 최대 ${MAX_DASHBOARD_ITEMS}개까지 추가할 수 있어요`);
      setImportModalOpen(false);
      setSharePreviewItems([]);
      return;
    }
    const toImport = sharePreviewItems.slice(0, remaining);

    if (user) {
      try {
        // 공유받은 매물을 하나씩 순서대로 기다리지 않고 한꺼번에 보낸다
        // (2026-09 로딩 속도 개선 - 항목이 여러 개면 순차 대기 시간이 그대로
        // 더해져서 느리게 느껴짐). toImport는 이미 남은 슬롯 수만큼만
        // 잘라뒀으므로 최대 개수(6개) 제한을 넘길 위험은 없다.
        await Promise.all(
          toImport.map((item) =>
            createDashboardItem({
              size_id: item.size_id,
              list_price: item.list_price,
              floor: item.floor,
              dong: item.dong,
              ho: item.ho,
              direction: item.direction,
              interior_state: item.interior_state,
            }),
          ),
        );
      } catch {
        toast.show("공유받은 매물을 추가하지 못했어요. 잠시 후 다시 시도해주세요.");
        setImportModalOpen(false);
        setSharePreviewItems([]);
        return;
      }
      try {
        const res = await getDashboardItems();
        const items = res.items.map((raw, index) =>
          fromBackendItem(raw, `item-${index + 1}`),
        );
        setDashboardItemSeq(items.length);
        setDashboardItems(items);
      } catch {
        toast.show("추가는 됐지만 목록을 새로 불러오지 못했어요. 새로고침 해주세요.");
      }
    } else {
      // 게스트: 서버에 저장하지 않고 로컬 상태에만 이어 붙인다(기존 게스트
      // 매물 추가와 동일한 동작).
      let nextSeq = dashboardItemSeq;
      const added = toImport.map((item) => {
        nextSeq += 1;
        return { ...fromBackendItem(item, "item-" + nextSeq), backendId: null };
      });
      setDashboardItemSeq(nextSeq);
      setDashboardItems((items) => [...items, ...added]);
    }

    revealDashboard();
    const skipped = sharePreviewItems.length - toImport.length;
    toast.show(
      skipped > 0
        ? `${toImport.length}개를 추가했어요 (최대 ${MAX_DASHBOARD_ITEMS}개라 ${skipped}개는 제외됨)`
        : `${toImport.length}개의 매물을 추가했어요`,
    );
    setImportModalOpen(false);
    setSharePreviewItems([]);
  }

  function handleImportCancel() {
    setImportModalOpen(false);
    setSharePreviewItems([]);
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
      items.map((it) => (it.id === id ? { ...it, checked: !it.checked } : it)),
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
          groupBarOpen={groupBarOpen}
          onGroupBarToggle={handleGroupBarToggle}
          groups={groups}
          onSelectGroup={handleSelectGroup}
          onAddGroupClick={handleAddGroupClick}
          onDeleteGroup={handleDeleteGroup}
          onShare={handleShare}
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
          activeGroupName={activeGroupName}
          onSaveActiveGroup={handleSaveActiveGroup}
          onRenameActiveGroup={handleRenameActiveGroupClick}
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
      <SaveGroupModal
        open={saveGroupModalOpen}
        onSave={handleSaveGroup}
        onCancel={() => setSaveGroupModalOpen(false)}
      />
      <SaveGroupModal
        open={renameGroupModalOpen}
        initialName={activeGroupName ?? ""}
        title="그룹명 수정"
        description="이 그룹의 이름을 수정해요"
        confirmLabel="수정"
        onSave={handleRenameActiveGroup}
        onCancel={() => setRenameGroupModalOpen(false)}
      />
      <ImportShareModal
        open={importModalOpen}
        items={sharePreviewItems}
        onImport={handleImportShare}
        onCancel={handleImportCancel}
      />

      <Toast message={toast.message} visible={toast.visible} />
    </div>
  );
}
