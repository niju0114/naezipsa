"use client";

import { useEffect, useRef, useState } from "react";
import Header from "./Header";
import Workspace from "./Workspace";
import InterestModal from "./Modal/InterestModal";
import EditListingDialog from "./EditListingDialog";
import AuthModal from "./Modal/AuthModal";
import ProfileOnboardingModal from "./Modal/ProfileOnboardingModal";
import useProfileOnboarding from "@/hooks/useProfileOnboarding";
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
  getGroups,
  getGroup,
  createGroup,
  renameGroup,
  deleteGroup,
  addGroupItems,
  removeGroupItem,
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
  const [dashboardUserId, setDashboardUserId] = useState(null);
  const [dashboardItemSeq, setDashboardItemSeq] = useState(0);
  // dashboardRevealed: 한 번 true가 되면 영구히 true(다시 안 돌아감) — 대시보드
  // 탭/"대시보드로 돌아가기" 버튼처럼 "최초 1회 이후로 쓸 수 있는" UI를 켜는
  // 가드. heroCleared: 히어로가 지금 시각적으로 걷혀있는지 — 로고 클릭으로
  // 다시 열 수 있고, 매물을 등록할 때마다(최초든 재등록이든) 다시 닫힌다.
  const [dashboardRevealed, setDashboardRevealed] = useState(false);
  const [heroCleared, setHeroCleared] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [profileEditorUserId, setProfileEditorUserId] = useState(null);
  const [editingItemId, setEditingItemId] = useState(null);
  // activeContentTab: 헤더의 "상세 데이터"/"인사이트" 메뉴 - Workspace가 이
  // 값을 받아 .content-track(오른쪽 차트 영역)을 좌우로 슬라이드한다.
  const [activeContentTab, setActiveContentTab] = useState("detail");
  // 로그인 세션(user) - Supabase Auth가 관리하는 세션을 그대로 반영한다.
  // getSession()으로 새로고침 시 기존 로그인을 복원하고, onAuthStateChange로
  // 로그인/로그아웃/토큰 갱신이 일어날 때마다 최신 상태를 따라간다(로그인
  // 모달의 이메일·소셜 로그인은 성공하면 이 리스너를 통해 자동으로 반영됨).
  const [user, setUser] = useState(null);
  const { profile, error: profileError, retry: retryProfile, save: saveProfile } = useProfileOnboarding(user?.id);
  const profileEditorOpen = Boolean(profile && user?.id === profileEditorUserId);
  const toast = useToast();

  // 그룹(Phase 4) - 그룹은 기존 후보를 가리키기만 한다(백엔드 app/group). 그룹을 보거나
  // 바꿔도 dashboardItems를 지우거나 다시 만들지 않으므로 후보 id가 유지되고, 후보에
  // 연결된 임장 기록 같은 데이터도 끊기지 않는다. groups는 GroupBar를 펼칠 때마다 새로 받는다.
  const [groups, setGroups] = useState([]);
  const [groupBarOpen, setGroupBarOpen] = useState(false);
  // 지금 보고 있는 그룹. null이면 "전체 후보". itemIds는 그룹에 든 후보의 서버 id(backendId),
  // userId는 이 보기 상태를 만든 계정(계정이 바뀌면 쓰지 않는다).
  const [activeGroup, setActiveGroup] = useState(null);
  // 그룹 이름 입력 모달. mode: "create"(체크한 후보로 새 그룹) | "copy"(이 그룹으로 새 그룹) |
  // "rename". 닫히는 동안 문구가 바뀌지 않도록 닫을 때 mode는 그대로 둔다.
  const [groupNameModal, setGroupNameModal] = useState({ open: false, mode: "create" });
  // 그룹 요청이 끝나기 전에 Enter/클릭이 반복돼 같은 요청이 두 번 가는 것을 막는다.
  const groupBusyRef = useRef(false);

  // 공유 - URL의 ?share=<token>을 열었을 때 보여줄 미리보기 상태.
  const [sharePreviewItems, setSharePreviewItems] = useState([]);
  const [importModalOpen, setImportModalOpen] = useState(false);

  // 늦은 프로필 조회가 기존 후보 입력창·그룹/공유 팝업 위에 새 모달을 겹쳐 열지
  // 않게 한다. 그룹·공유 팝업 state를 참조하므로 그 선언 뒤에 둔다.
  const onboardingOpen = profile?.service_purposes === null &&
    !modalOpen && !authModalOpen && !profileEditorOpen && editingItemId === null &&
    !groupNameModal.open && !importModalOpen;

  useEffect(() => {
    let cancelled = false;
    let authEventReceived = false;

    supabase.auth.getSession().then(({ data }) => {
      // 초기 조회보다 로그인 이벤트가 먼저 왔다면 최신 세션을 유지한다.
      if (cancelled || authEventReceived) return;
      setUser(data.session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      authEventReceived = true;
      setUser(session?.user ?? null);
      setProfileEditorUserId((current) => current === session?.user?.id ? current : null);
      if (session?.user) setAuthModalOpen(false);
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
    setGroups([]);
    setActiveGroup(null);
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
        setDashboardUserId(user.id);
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
    onboardingOpen ||
    profileEditorOpen ||
    groupNameModal.open ||
    importModalOpen;

  // 그룹을 보고 있으면 그 그룹에 든 후보만 보여준다(순서는 전체 후보에서 정한 순서).
  // 후보 자체는 dashboardItems에 그대로 있다.
  const shownGroup = activeGroup && activeGroup.userId === user?.id ? activeGroup : null;
  const visibleItems = shownGroup
    ? dashboardItems.filter(
        (it) => it.backendId != null && shownGroup.itemIds.includes(it.backendId),
      )
    : dashboardItems;
  // 그룹 만들기·기존 그룹에 추가의 "선택"은 카드 체크 상태를 그대로 쓴다(서버에 저장된 후보만).
  const selectedBackendIds = visibleItems
    .filter((it) => it.checked && it.backendId != null)
    .map((it) => it.backendId);

  // Escape로 닫기 — edit-overlay가 열려 있으면 그쪽을 먼저 닫고, 아니면
  // modal-overlay를 닫는 순서(프로토타입과 동일). 그룹 모달/ImportShareModal도
  // 같은 edit-overlay 뼈대를 쓰므로 같은 순서에 낀다.
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key !== "Escape") return;
      if (editingItemId != null) {
        setEditingItemId(null);
        return;
      }
      if (groupNameModal.open) {
        setGroupNameModal((m) => ({ ...m, open: false }));
        return;
      }
      if (groupBarOpen) {
        setGroupBarOpen(false);
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
  }, [editingItemId, modalOpen, authModalOpen, groupNameModal.open, groupBarOpen, importModalOpen]);

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

  // --- 그룹 --------------------------------------------------------------
  // 게스트는 서버에 후보가 없으므로 로그인 사용자만 쓸 수 있다.

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

  function showGroup(group) {
    setActiveGroup({ id: group.id, name: group.name, itemIds: group.item_ids, userId: user.id });
  }

  // 서버가 돌려준 그룹 상세로 GroupBar 목록과 보고 있는 그룹을 함께 갱신한다.
  function applyGroup(group) {
    setGroups((gs) => gs.map((g) => (g.id === group.id ? group : g)));
    setActiveGroup((current) =>
      current?.id === group.id ? { ...current, name: group.name, itemIds: group.item_ids } : current,
    );
  }

  async function refreshGroups() {
    const res = await getGroups();
    setGroups(res.groups);
  }

  async function handleGroupBarToggle() {
    if (!user) {
      toast.show("로그인 후 이용할 수 있어요");
      return;
    }
    const next = !groupBarOpen;
    setGroupBarOpen(next);
    if (!next) return;
    try {
      await refreshGroups();
    } catch (err) {
      toast.show(err.message);
    }
  }

  // 그룹 보기 - 목록을 이 그룹의 후보로 좁혀 보여줄 뿐, 후보를 지우거나 다시 만들지 않는다.
  // 메뉴는 열어 둬서 보고 있는 그룹의 이름 수정·새 그룹 만들기를 바로 쓸 수 있게 한다.
  async function handleSelectGroup(groupId) {
    try {
      showGroup(await getGroup(groupId));
    } catch (err) {
      toast.show(err.message);
    }
  }

  function handleShowAllCandidates() {
    setActiveGroup(null);
  }

  function openGroupNameModal(mode) {
    setGroupBarOpen(false);
    setGroupNameModal({ open: true, mode });
  }
  function closeGroupNameModal() {
    setGroupNameModal((m) => ({ ...m, open: false }));
  }

  // 그룹 메뉴의 새 그룹 만들기 - 지금 보이는 목록에서 체크한 후보로 만든다.
  function handleCreateGroupClick() {
    if (groups.length >= MAX_DASHBOARD_GROUPS) {
      toast.show(`그룹은 최대 ${MAX_DASHBOARD_GROUPS}개까지 만들 수 있어요`);
      return;
    }
    openGroupNameModal("create");
  }

  async function handleGroupNameSubmit(name) {
    if (groupBusyRef.current) return;
    groupBusyRef.current = true;
    const { mode } = groupNameModal;
    try {
      if (mode === "rename") {
        if (!shownGroup) return;
        const group = await renameGroup(shownGroup.id, name);
        applyGroup(group);
        toast.show(`그룹 이름을 "${group.name}"(으)로 바꿨어요`);
      } else {
        // copy는 보고 있는 그룹의 후보 전체를, create는 체크한 후보를 가리키는 새 그룹을
        // 만든다. 원래 그룹과 후보는 그대로 남는다.
        const itemIds = mode === "copy" ? shownGroup?.itemIds ?? [] : selectedBackendIds;
        const group = await createGroup(name, itemIds);
        setGroups((gs) => [...gs, group]);
        showGroup(group);
        toast.show(`"${group.name}" 그룹을 만들었어요 (후보 ${group.item_count}개)`);
      }
      closeGroupNameModal();
    } catch (err) {
      toast.show(err.message);
    } finally {
      groupBusyRef.current = false;
    }
  }

  function groupNameModalText() {
    if (groupNameModal.mode === "rename") {
      return {
        title: "그룹명 수정",
        description: "이 그룹의 이름을 수정해요",
        confirmLabel: "수정",
        initialName: shownGroup?.name ?? "",
      };
    }
    if (groupNameModal.mode === "copy") {
      return {
        title: "이 그룹으로 새 그룹 만들기",
        description: `이 그룹의 후보 ${shownGroup?.itemIds.length ?? 0}개로 새 그룹을 만들어요. 원래 그룹은 그대로 남아요`,
        confirmLabel: "만들기",
      };
    }
    return {
      title: "새 그룹 만들기",
      description: selectedBackendIds.length > 0
        ? `체크한 후보 ${selectedBackendIds.length}개로 새 그룹을 만들어요`
        : "체크한 후보가 없어 빈 그룹을 만들어요",
      confirmLabel: "만들기",
    };
  }

  // 그룹 메뉴의 "추가" - 체크한 후보를 그 그룹에 넣는다. 이미 들어 있는 후보는 빼고
  // 보낸다(서버도 중복은 409로 막는다).
  async function handleAddToGroup(groupId) {
    const itemIds = selectedBackendIds;
    if (itemIds.length === 0) {
      toast.show("그룹에 넣을 후보를 체크해주세요");
      return;
    }
    if (groupBusyRef.current) return;
    groupBusyRef.current = true;
    try {
      const current = await getGroup(groupId);
      const missing = itemIds.filter((id) => !current.item_ids.includes(id));
      if (missing.length === 0) {
        toast.show(`"${current.name}" 그룹에 이미 모두 들어 있어요`);
      } else {
        const group = await addGroupItems(groupId, missing);
        applyGroup(group);
        const skipped = itemIds.length - missing.length;
        toast.show(
          skipped > 0
            ? `"${group.name}" 그룹에 ${missing.length}개를 넣었어요 (이미 있던 ${skipped}개 제외)`
            : `"${group.name}" 그룹에 ${missing.length}개를 넣었어요`,
        );
      }
    } catch (err) {
      toast.show(err.message);
    } finally {
      groupBusyRef.current = false;
    }
  }

  // 그룹 삭제 - 그룹과 그 관계만 지운다. 후보는 전체 후보에 그대로 남는다.
  // 낙관적으로 먼저 화면에서 지우지 않고 성공한 뒤에 지운다(이 앱의 다른 삭제 동작과 동일).
  async function handleDeleteGroup(groupId) {
    try {
      await deleteGroup(groupId);
      setGroups((gs) => gs.filter((g) => g.id !== groupId));
      setActiveGroup((current) => (current?.id === groupId ? null : current));
      toast.show("그룹을 삭제했어요. 후보는 전체 후보에 그대로 있어요");
    } catch (err) {
      toast.show(err.message);
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

    // 추가한 후보가 그룹 보기에 가려지지 않게 전체 후보로 돌아간다.
    setActiveGroup(null);
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

  // 체크박스(비교 차트·AI 분석에 포함할지) 토글. 로그인 상태면 서버에도 저장해
  // 새로고침·재로그인 후에도 유지한다. PATCH에는 { checked }만 담는다 - 편집창용
  // toDetailsPayload처럼 전체 필드를 보내면 호가·동·호 같은 다른 정보를 덮어쓴다.
  // 저장이 끝나기 전에 같은 카드를 또 누르면 이전 값을 기준으로 두 번 저장하게
  // 되므로, 저장 중인 카드의 추가 토글은 무시한다.
  const togglingIdsRef = useRef(new Set());
  async function handleToggle(id) {
    const item = dashboardItems.find((it) => it.id === id);
    if (!item || togglingIdsRef.current.has(id)) return;
    const nextChecked = !item.checked;
    if (user && item.backendId) {
      togglingIdsRef.current.add(id);
      try {
        await updateDashboardItemDetails(item.backendId, { checked: nextChecked });
      } catch {
        toast.show("체크 상태를 저장하지 못했어요. 잠시 후 다시 시도해주세요.");
        return;
      } finally {
        togglingIdsRef.current.delete(id);
      }
    }
    setDashboardItems((items) =>
      items.map((it) => (it.id === id ? { ...it, checked: nextChecked } : it)),
    );
  }
  async function handleRemove(id) {
    const item = dashboardItems.find((it) => it.id === id);
    // 그룹을 보고 있을 때는 후보를 지우지 않고 이 그룹에서만 뺀다.
    if (shownGroup && item?.backendId != null) {
      try {
        applyGroup(await removeGroupItem(shownGroup.id, item.backendId));
        toast.show("그룹에서 뺐어요. 전체 후보에는 그대로 있어요");
      } catch (err) {
        toast.show(err.message);
      }
      return;
    }
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
    if (!shownGroup) {
      setDashboardItems(nextItems);
      return;
    }
    // 그룹 보기에서는 보이는 후보끼리만 자리를 바꾸고, 그룹 밖 후보는 제자리에 둔다.
    const shownIds = new Set(nextItems.map((it) => it.id));
    setDashboardItems((items) => {
      const reordered = [...nextItems];
      return items.map((it) => (shownIds.has(it.id) ? reordered.shift() : it));
    });
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
        setDashboardUserId(user.id);
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
    // 그룹을 보고 있을 때 등록한 후보는 그 그룹에도 넣는다. 후보 자체는 전체 후보에 한 번만 등록된다.
    if (shownGroup && backendId != null) {
      try {
        applyGroup(await addGroupItems(shownGroup.id, [backendId]));
      } catch (err) {
        toast.show(`전체 후보에는 추가했지만 그룹에는 넣지 못했어요. ${err.message}`);
        return;
      }
    }
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
          onProfileClick={() => setProfileEditorUserId(user.id)}
          profileReady={Boolean(profile)}
          activeContentTab={activeContentTab}
          onContentTabChange={setActiveContentTab}
          showContentTabs={dashboardRevealed}
          groupMenu={{
            open: groupBarOpen,
            groups,
            activeGroup: shownGroup,
            totalCount: dashboardItems.length,
            selectedCount: selectedBackendIds.length,
            onToggle: handleGroupBarToggle,
            onShowAll: handleShowAllCandidates,
            onSelect: handleSelectGroup,
            onCreate: handleCreateGroupClick,
            onAddTo: handleAddToGroup,
            onRename: () => openGroupNameModal("rename"),
            onCopy: () => openGroupNameModal("copy"),
            onDelete: handleDeleteGroup,
          }}
          onShare={handleShare}
        />
        <Workspace
          items={visibleItems}
          totalCount={dashboardItems.length}
          insightItems={dashboardUserId === user?.id ? visibleItems : []}
          userId={user?.id}
          profile={profile}
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

      {profileError && (
        <div className="profile-load-error" role="alert">
          <span>프로필을 불러오지 못했어요. {profileError}</span>
          <button type="button" className="auth-text-link" onClick={retryProfile}>다시 시도</button>
        </div>
      )}
      {onboardingOpen && (
        <ProfileOnboardingModal key={user.id} profile={profile} onSave={saveProfile} />
      )}
      {profileEditorOpen && (
        <ProfileOnboardingModal
          key={`profile-${user.id}`}
          mode="edit"
          profile={profile}
          email={user.email}
          onSave={saveProfile}
          onClose={() => setProfileEditorUserId((current) => current === user.id ? null : current)}
        />
      )}
      <AuthModal
        open={authModalOpen && !onboardingOpen}
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
        open={groupNameModal.open}
        {...groupNameModalText()}
        onSave={handleGroupNameSubmit}
        onCancel={closeGroupNameModal}
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
