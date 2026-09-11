// 대시보드 아이템(관심 매물) 프론트 ↔ 백엔드 형태 변환 헬퍼.
//
// 백엔드(app/dashboard)는 향/인테리어를 영문 enum으로, 호가를 "원" 단위로
// 저장한다. 프론트(InterestModal/EditListingDialog)는 향/인테리어를 한글
// 칩 라벨로("남동" 등), 호가를 "만원" 단위 입력값으로 다룬다 - 그 차이를
// 여기서만 흡수해서 다른 컴포넌트는 신경 쓸 필요 없게 한다.

const DIRECTION_TO_BACKEND = {
  남동: "southeast",
  남서: "southwest",
  북동: "northeast",
  북서: "northwest",
};
const DIRECTION_FROM_BACKEND = Object.fromEntries(
  Object.entries(DIRECTION_TO_BACKEND).map(([ko, en]) => [en, ko]),
);

const INTERIOR_TO_BACKEND = {
  "수리 없음": "none",
  "부분 수리": "partial",
  올수리: "full",
};
const INTERIOR_FROM_BACKEND = Object.fromEntries(
  Object.entries(INTERIOR_TO_BACKEND).map(([ko, en]) => [en, ko]),
);

// "32,000" / "32000" (만원 단위 입력값) -> 320000000 (원). 숫자가 없으면 undefined.
function priceToWon(priceInput) {
  const digits = String(priceInput || "").replace(/[^0-9]/g, "");
  if (!digits) return undefined;
  return Number(digits) * 10000;
}

// 320000000 (원) -> "32000" (만원 단위, 입력창에 그대로 넣을 수 있는 문자열).
function wonToPriceInput(won) {
  if (won == null) return "";
  return String(Math.round(won / 10000));
}

// InterestModal의 onSubmit 인자(itemData) -> POST /dashboard/items 바디.
// size_id만 필수이고 나머지는 값이 있을 때만 보낸다(신규 등록이라 굳이
// null을 보내 지울 필요가 없음).
export function toCreateItemPayload(itemData) {
  const payload = { size_id: itemData.sizeId };
  const price = priceToWon(itemData.price);
  if (price !== undefined) payload.list_price = price;
  if (itemData.floor) payload.floor = Number(itemData.floor);
  if (itemData.dong) payload.dong = itemData.dong;
  if (itemData.ho) payload.ho = itemData.ho;
  if (itemData.direction) {
    payload.direction = DIRECTION_TO_BACKEND[itemData.direction] || null;
  }
  if (itemData.interior) {
    payload.interior_state = INTERIOR_TO_BACKEND[itemData.interior] || null;
  }
  return payload;
}

// EditListingDialog의 onSave 인자(data) -> PATCH .../details 바디.
// 여긴 반대로 항상 전체 필드를 보낸다 - 편집 폼은 현재 값을 그대로 다시
// 제출하는 구조라, 사용자가 값을 지웠으면 명시적으로 null을 보내서
// 서버에서도 지워지게 한다.
export function toDetailsPayload(data) {
  const price = priceToWon(data.price);
  return {
    list_price: price !== undefined ? price : null,
    floor: data.floor ? Number(data.floor) : null,
    dong: data.dong || null,
    ho: data.ho || null,
    direction: data.direction
      ? DIRECTION_TO_BACKEND[data.direction] || null
      : null,
    interior_state: data.interior
      ? INTERIOR_TO_BACKEND[data.interior] || null
      : null,
  };
}

// GET /dashboard/items가 준 항목(DashboardItemWithMetrics) -> 프론트 대시보드
// 아이템 모양. localId는 이 세션에서 카드 키/드래그 정렬 등 기존 로직이 쓰는
// 로컬 id("item-N")이고, backendId(서버의 실제 id)와는 별개로 유지한다 -
// 수정/삭제 API를 호출할 때 backendId를 쓴다.
//
// ⚠️ regulations(투기과열지구 등 뱃지)는 대시보드 API 응답에 없다(단지
// 검색 결과에만 있는 정보). 복원된 항목은 일단 빈 배열로 둔다 - 카드에는
// "규제 해당 없음"으로 표시되니 최소한 잘못된 정보를 보여주진 않는다.
export function fromBackendItem(raw, localId) {
  return {
    id: localId,
    backendId: raw.id,
    name: raw.complex_name || "단지 정보 준비중",
    sizeLabel:
      raw.representative_area != null
        ? `${raw.representative_area}㎡`
        : `평형 ${raw.size_id}`,
    price: wonToPriceInput(raw.list_price),
    floor: raw.floor != null ? String(raw.floor) : "",
    dong: raw.dong || "",
    ho: raw.ho || "",
    direction: raw.direction
      ? DIRECTION_FROM_BACKEND[raw.direction] || null
      : null,
    interior: raw.interior_state
      ? INTERIOR_FROM_BACKEND[raw.interior_state] || null
      : null,
    regulations: [],
    complexId: null,
    sizeId: raw.size_id,
    checked: true,
  };
}
