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
} from "@/lib/api";

// Phase 4: 그룹을 보거나 만들거나 바꿔도 후보를 지우거나 다시 만들지 않는다.
// 목록(DashboardList)·헤더 그룹 UI·그룹 모달은 실제 컴포넌트로 그리고, 외부 데이터를
// 부르는 차트·인사이트·히어로와 이 파일과 무관한 모달만 대체한다.
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

function group(id, name, itemIds) {
  return { id, name, item_ids: itemIds, item_count: itemIds.length, items: [] };
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

async function openSchoolGroup() {
  fireEvent.click(screen.getByRole("button", { name: "그룹" }));
  fireEvent.click(await screen.findByRole("button", { name: "학군 후보 (후보 1개)" }));
  await waitFor(() => expect(cardNames()).toEqual(["나단지"]));
}

async function submitGroupName(dialogName, name) {
  const dialog = screen.getByRole("dialog", { name: dialogName });
  fireEvent.change(within(dialog).getByRole("textbox"), { target: { value: name } });
  fireEvent.click(within(dialog).getByRole("button", { name: "만들기" }));
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("fetch", vi.fn(() => { throw new Error("실제 네트워크 호출 금지"); }));
  auth.session = null;
  getMyProfile.mockResolvedValue({ service_purposes: [] });
  getDashboardItems.mockResolvedValue({ items: BACKEND_ITEMS });
  getGroups.mockResolvedValue({ groups: [group(7, "학군 후보", [12])], count: 1, max_count: 8 });
  getGroup.mockResolvedValue(group(7, "학군 후보", [12]));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("그룹을 열면 후보를 지우거나 다시 만들지 않고 목록만 그 그룹 후보로 좁힌다", async () => {
  await renderLoggedIn();

  await openSchoolGroup();

  expect(getGroup).toHaveBeenCalledWith(7);
  fireEvent.click(screen.getByRole("button", { name: "전체 보기" }));
  expect(cardNames()).toEqual(ALL);
  expectCandidatesUntouched();
});

it("체크한 후보로 새 그룹을 만들고, 그 그룹으로 또 새 그룹을 만들어도 원래 그룹과 후보는 그대로다", async () => {
  createGroup
    .mockResolvedValueOnce(group(8, "이사 후보", [11, 12]))
    .mockResolvedValueOnce(group(9, "복사한 그룹", [11, 12]));
  await renderLoggedIn();

  fireEvent.click(screen.getByRole("button", { name: "새 그룹 만들기" }));
  expect(within(screen.getByRole("dialog", { name: "새 그룹 만들기" }))
    .getByText("체크한 후보 2개로 새 그룹을 만들어요")).toBeTruthy();
  await submitGroupName("새 그룹 만들기", "이사 후보");

  await screen.findByText("이사 후보");
  expect(createGroup).toHaveBeenLastCalledWith("이사 후보", [11, 12]);
  expect(cardNames()).toEqual(["가단지", "나단지"]);

  fireEvent.click(screen.getByRole("button", { name: "이 그룹으로 새 그룹 만들기" }));
  await submitGroupName("이 그룹으로 새 그룹 만들기", "복사한 그룹");

  await screen.findByText("복사한 그룹");
  expect(createGroup).toHaveBeenLastCalledWith("복사한 그룹", [11, 12]);
  expect(removeGroupItem).not.toHaveBeenCalled();
  expectCandidatesUntouched();
});

it("그룹을 보는 중에 카드를 빼면 그룹에서만 빠지고 후보는 전체 후보에 남는다", async () => {
  removeGroupItem.mockResolvedValue(group(7, "학군 후보", []));
  await renderLoggedIn();
  await openSchoolGroup();

  fireEvent.click(screen.getByRole("button", { name: "목록에서 제거" }));

  await waitFor(() => expect(cardNames()).toEqual([]));
  expect(removeGroupItem).toHaveBeenCalledWith(7, 12);
  fireEvent.click(screen.getByRole("button", { name: "전체 보기" }));
  expect(cardNames()).toEqual(ALL);
  expectCandidatesUntouched();
});

it("기존 그룹에 추가는 체크한 후보 중 그 그룹에 아직 없는 후보만 보낸다", async () => {
  addGroupItems.mockResolvedValue(group(7, "학군 후보", [12, 11]));
  await renderLoggedIn();

  fireEvent.click(screen.getByRole("button", { name: "기존 그룹에 추가" }));
  const dialog = await screen.findByRole("dialog", { name: "기존 그룹에 추가" });
  fireEvent.click(within(dialog).getByRole("button", { name: "학군 후보 (후보 1개)" }));

  await waitFor(() => expect(addGroupItems).toHaveBeenCalledWith(7, [11]));
  await waitFor(() => expect(screen.queryByRole("dialog", { name: "기존 그룹에 추가" })).toBeNull());
  expect(cardNames()).toEqual(ALL);
  expectCandidatesUntouched();
});

it("체크한 후보가 없으면 기존 그룹에 추가를 누를 수 없다", async () => {
  getDashboardItems.mockResolvedValue({ items: BACKEND_ITEMS.map((item) => ({ ...item, checked: false })) });
  await renderLoggedIn();

  expect(screen.getByRole("button", { name: "기존 그룹에 추가" }).disabled).toBe(true);
});
