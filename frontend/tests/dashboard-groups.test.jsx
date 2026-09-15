import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import NaejipsaApp from "@/components/NaejipsaApp";
import {
  addGroupItems,
  createDashboardItem,
  createGroup,
  deleteDashboardItem,
  getDashboardItems,
  getGroup,
  getGroups,
  getMyProfile,
  removeGroupItem,
  renameGroup,
} from "@/lib/api";

// Phase 4: 그룹 동작은 모두 헤더의 그룹 메뉴에서 하고, 어떤 동작도 후보를 지우거나 다시 만들지 않는다.
// 헤더·그룹 메뉴·목록·새 그룹 이름 모달은 실제 컴포넌트로 그리고, 외부 데이터를 부르는
// 차트·인사이트·히어로와 이 파일과 무관한 모달만 대체한다. 서버 그룹 상태는 serverGroups로 흉내 낸다.
const auth = vi.hoisted(() => ({ callback: null, session: null }));
vi.mock("@/lib/supabaseClient", () => ({ supabase: { auth: {
  getSession: async () => ({ data: { session: auth.session } }),
  onAuthStateChange: (callback) => { auth.callback = callback; return { data: { subscription: { unsubscribe: () => {} } } }; },
  signOut: async () => { auth.session = null; auth.callback("SIGNED_OUT", null); },
} } }));
vi.mock("@/lib/api", () => ({
  getMyProfile: vi.fn(), updateMyProfile: vi.fn(), getDashboardItems: vi.fn(),
  createDashboardItem: vi.fn(), updateDashboardItemDetails: vi.fn(), deleteDashboardItem: vi.fn(),
  getGroups: vi.fn(), getGroup: vi.fn(), createGroup: vi.fn(), renameGroup: vi.fn(), deleteGroup: vi.fn(),
  addGroupItems: vi.fn(), removeGroupItem: vi.fn(),
  createDashboardShare: vi.fn(), getDashboardShare: vi.fn(),
}));
vi.mock("@/components/Dashboard/DashboardCharts", () => ({ default: () => null }));
vi.mock("@/components/Insight/InsightPanel", () => ({ default: () => null }));
vi.mock("@/components/Hero/MainHeroOverlay", () => ({ default: () => null }));
vi.mock("@/components/Modal/InterestModal", () => ({ default: () => null }));
vi.mock("@/components/EditListingDialog", () => ({ default: () => null }));
vi.mock("@/components/Modal/AuthModal", () => ({ default: () => null }));
vi.mock("@/components/Modal/ImportShareModal", () => ({ default: () => null }));

const ALL = ["가단지", "나단지", "다단지"];
const BACKEND_ITEMS = [
  { id: 11, size_id: 200, complex_name: "가단지", representative_area: 84.95, checked: true },
  { id: 12, size_id: 201, complex_name: "나단지", representative_area: 59.9, checked: true },
  { id: 13, size_id: 202, complex_name: "다단지", representative_area: 114.2, checked: false },
];

let serverGroups;

function group(id, name, itemIds) {
  return { id, name, item_ids: itemIds, item_count: itemIds.length, items: [] };
}
function saveGroup(next) {
  serverGroups = serverGroups.some((g) => g.id === next.id)
    ? serverGroups.map((g) => (g.id === next.id ? next : g))
    : [...serverGroups, next];
  return next;
}

function cardNames() {
  return [...document.querySelectorAll(".interest-card-name")].map((node) => node.textContent);
}

function expectCandidatesUntouched() {
  expect(deleteDashboardItem).not.toHaveBeenCalled();
  expect(createDashboardItem).not.toHaveBeenCalled();
}

async function renderLoggedIn() {
  auth.session = { user: { id: "a" } };
  render(<NaejipsaApp />);
  await screen.findByText("가단지");
}

async function openGroupMenu() {
  if (!screen.queryByRole("button", { name: /^새 그룹 만들기/ })) {
    fireEvent.click(screen.getByRole("button", { name: "그룹" }));
  }
  await screen.findByRole("button", { name: /^새 그룹 만들기/ });
  await waitFor(() => expect(getGroups).toHaveBeenCalled());
}

async function viewSchoolGroup() {
  await openGroupMenu();
  fireEvent.click(await screen.findByRole("button", { name: "학군 후보 (후보 1개)" }));
  await waitFor(() => expect(cardNames()).toEqual(["나단지"]));
}

// 보고 있는 그룹을 한 번 더 누르면 전체 후보로 돌아간다.
async function backToAllCandidates() {
  await openGroupMenu();
  fireEvent.click(screen.getByRole("button", { pressed: true, name: /\(후보 \d+개\)$/ }));
}

async function submitNewGroup(name) {
  const dialog = screen.getByRole("dialog", { name: "새 그룹 만들기" });
  fireEvent.change(within(dialog).getByRole("textbox"), { target: { value: name } });
  fireEvent.click(within(dialog).getByRole("button", { name: "만들기" }));
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("fetch", vi.fn(() => { throw new Error("실제 네트워크 호출 금지"); }));
  auth.session = null;
  serverGroups = [group(7, "학군 후보", [12])];
  getMyProfile.mockResolvedValue({ service_purposes: [] });
  getDashboardItems.mockResolvedValue({ items: BACKEND_ITEMS });
  getGroups.mockImplementation(async () => ({ groups: serverGroups, count: serverGroups.length, max_count: 8 }));
  getGroup.mockImplementation(async (id) => serverGroups.find((g) => g.id === id));
  createGroup.mockImplementation(async (name, itemIds) =>
    saveGroup(group(Math.max(...serverGroups.map((g) => g.id)) + 1, name, itemIds)));
  renameGroup.mockImplementation(async (id, name) => {
    const current = serverGroups.find((g) => g.id === id);
    return saveGroup(group(id, name, current.item_ids));
  });
  addGroupItems.mockImplementation(async (id, itemIds) => {
    const current = serverGroups.find((g) => g.id === id);
    return saveGroup(group(id, current.name, [...current.item_ids, ...itemIds]));
  });
  removeGroupItem.mockImplementation(async (id, itemId) => {
    const current = serverGroups.find((g) => g.id === id);
    return saveGroup(group(id, current.name, current.item_ids.filter((x) => x !== itemId)));
  });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("그룹 동작은 헤더 그룹 메뉴에만 있고, 메뉴에는 그룹 줄과 새 그룹 만들기만 있다", async () => {
  await renderLoggedIn();

  expect(screen.queryByRole("button", { name: /새 그룹 만들기/ })).toBeNull();
  expect(screen.queryByRole("button", { name: /기존 그룹에 추가/ })).toBeNull();

  await openGroupMenu();
  expect(screen.getByRole("button", { name: "학군 후보 (후보 1개)" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "새 그룹 만들기 (체크한 후보 2개)" })).toBeTruthy();
  expect(screen.queryByRole("button", { name: /^전체 후보/ })).toBeNull();
  expect(screen.queryByRole("button", { name: /이 그룹으로 새 그룹 만들기/ })).toBeNull();
});

it("그룹을 누르면 목록만 좁히고 그 줄에 테두리가 생기며, 한 번 더 누르면 전체 후보로 돌아간다", async () => {
  await renderLoggedIn();

  await viewSchoolGroup();

  const row = screen.getByRole("button", { name: "학군 후보 (후보 1개)" });
  expect(row.getAttribute("aria-pressed")).toBe("true");
  expect(row.closest(".group-row").classList.contains("is-active")).toBe(true);
  // 헤더 버튼에는 그룹 이름을 따로 붙이지 않는다.
  expect(screen.getByRole("button", { name: "그룹" }).textContent).toBe("");

  await backToAllCandidates();
  expect(cardNames()).toEqual(ALL);
  expect(screen.getByRole("button", { name: "학군 후보 (후보 1개)" }).getAttribute("aria-pressed")).toBe("false");
  expectCandidatesUntouched();
});

it("새 그룹은 지금 보이는 목록에서 체크한 후보로 만들어지고, 원래 그룹과 후보는 그대로다", async () => {
  await renderLoggedIn();

  await openGroupMenu();
  fireEvent.click(screen.getByRole("button", { name: "새 그룹 만들기 (체크한 후보 2개)" }));
  expect(within(screen.getByRole("dialog", { name: "새 그룹 만들기" }))
    .getByText("체크한 후보 2개로 새 그룹을 만들어요")).toBeTruthy();
  await submitNewGroup("이사 후보");

  await waitFor(() => expect(cardNames()).toEqual(["가단지", "나단지"]));
  expect(createGroup).toHaveBeenLastCalledWith("이사 후보", [11, 12]);

  // 그룹을 보는 중에 새 그룹을 만들면 그 그룹의 체크한 후보로 만들어진다.
  await openGroupMenu();
  fireEvent.click(screen.getByRole("button", { name: "새 그룹 만들기 (체크한 후보 2개)" }));
  await submitNewGroup("복사한 그룹");

  await waitFor(() => expect(createGroup).toHaveBeenLastCalledWith("복사한 그룹", [11, 12]));
  expect(serverGroups.find((g) => g.name === "이사 후보").item_ids).toEqual([11, 12]);
  expect(removeGroupItem).not.toHaveBeenCalled();
  expectCandidatesUntouched();
});

it("연필을 누르면 모달 없이 그 자리에서 이름을 고치고, Enter로 저장·Esc로 취소한다", async () => {
  await renderLoggedIn();
  await openGroupMenu();

  fireEvent.click(screen.getByRole("button", { name: '"학군 후보" 그룹 이름 수정' }));
  const input = screen.getByRole("textbox", { name: '"학군 후보" 그룹 이름' });
  expect(input.value).toBe("학군 후보");
  expect(screen.queryByRole("dialog", { name: /그룹명 수정/ })).toBeNull();

  fireEvent.change(input, { target: { value: "  학군 1순위 " } });
  fireEvent.keyDown(input, { key: "Enter" });

  await screen.findByRole("button", { name: "학군 1순위 (후보 1개)" });
  expect(renameGroup).toHaveBeenCalledExactlyOnceWith(7, "학군 1순위");

  fireEvent.click(screen.getByRole("button", { name: '"학군 1순위" 그룹 이름 수정' }));
  const again = screen.getByRole("textbox", { name: '"학군 1순위" 그룹 이름' });
  fireEvent.change(again, { target: { value: "취소할 이름" } });
  fireEvent.keyDown(again, { key: "Escape" });

  expect(screen.queryByRole("textbox", { name: '"학군 1순위" 그룹 이름' })).toBeNull();
  expect(screen.getByRole("button", { name: "학군 1순위 (후보 1개)" })).toBeTruthy();
  // Esc는 이름 편집만 취소하고 그룹 메뉴는 닫지 않는다.
  expect(screen.getByRole("button", { name: /^새 그룹 만들기/ })).toBeTruthy();
  expect(renameGroup).toHaveBeenCalledOnce();
});

it("메뉴의 추가는 체크한 후보 중 그 그룹에 아직 없는 후보만 넣고, 후보 수가 바로 갱신된다", async () => {
  await renderLoggedIn();

  await openGroupMenu();
  fireEvent.click(screen.getByRole("button", { name: '체크한 후보 2개를 "학군 후보" 그룹에 추가' }));

  await waitFor(() => expect(addGroupItems).toHaveBeenCalledWith(7, [11]));
  await screen.findByRole("button", { name: "학군 후보 (후보 2개)" });
  expect(cardNames()).toEqual(ALL);
  expectCandidatesUntouched();
});

it("체크한 후보가 없으면 추가를 누를 수 없고, 새 그룹은 빈 그룹으로 안내한다", async () => {
  getDashboardItems.mockResolvedValue({ items: BACKEND_ITEMS.map((item) => ({ ...item, checked: false })) });
  await renderLoggedIn();

  await openGroupMenu();

  expect(screen.getByRole("button", { name: '체크한 후보 0개를 "학군 후보" 그룹에 추가' }).disabled).toBe(true);
  expect(screen.getByRole("button", { name: "새 그룹 만들기 (빈 그룹)" })).toBeTruthy();
});

it("그룹을 보는 중에 카드를 빼면 그룹에서만 빠지고 후보는 전체 후보에 남는다", async () => {
  await renderLoggedIn();
  await viewSchoolGroup();

  fireEvent.click(screen.getByRole("button", { name: "목록에서 제거" }));

  await waitFor(() => expect(cardNames()).toEqual([]));
  expect(removeGroupItem).toHaveBeenCalledWith(7, 12);
  await backToAllCandidates();
  expect(cardNames()).toEqual(ALL);
  expectCandidatesUntouched();
});
