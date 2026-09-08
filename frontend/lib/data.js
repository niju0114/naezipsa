// 데모용 데이터 배열 — 프로토타입의 COMPLEXES/DIRECTIONS/INTERIORS/REGULATIONS를
// 그대로 옮겨왔다. 실제 서비스에서는 이 자리가 국토부 실거래가 API 응답이나
// DB 조회 결과로 대체될 자리이므로, 지금은 하드코딩이지만 구조(필드 이름)는
// 그대로 유지하는 편이 나중에 교체하기 쉽다.

// regulations: 이 단지가 속한 규제 지정 현황(투기과열지구/조정대상지역/토지거래
// 허가구역, 중복 지정 가능 — 실제로는 서로 다른 법 조항에 근거한 별개 지정임).
// 지금은 국토부 API 연동 전이라 데모용으로 단지마다 하드코딩해뒀고, 실제로는
// 법정동코드 기준 참조 테이블과 매칭해서 자동으로 채워질 값(REGULATIONS 참고).
export const COMPLEXES = [
  {
    id: "doosan",
    name: "행당두산위브",
    region: "성동구 행당동 128",
    built: "2000년 준공",
    dealCount: 3,
    regulations: ["overheated", "adjustment"],
    sizes: [
      { label: "59㎡ 24평", price: "최근거래가 7.8억" },
      { label: "84㎡ 34평", price: "최근거래가 10.9억" },
      { label: "114㎡ 46평", price: "최근거래가 13.8억" },
    ],
  },
  {
    id: "daerim",
    name: "행당대림",
    region: "성동구 행당동 128",
    built: "2000년 준공",
    dealCount: 3,
    regulations: ["adjustment", "land-permit"],
    sizes: [
      { label: "59㎡ 24평", price: "최근거래가 8.2억" },
      { label: "84㎡ 34평", price: "최근거래가 11.4억" },
      { label: "114㎡ 46평", price: "최근거래가 14.6억" },
    ],
  },
  {
    id: "hanjin",
    name: "행당한진타운",
    region: "성동구 행당동 128",
    built: "2000년 준공",
    dealCount: 3,
    regulations: [],
    sizes: [
      { label: "59㎡ 23평", price: "최근거래가 7.5억" },
      { label: "84㎡ 33평", price: "최근거래가 10.6억" },
      { label: "114㎡ 45평", price: "최근거래가 13.4억" },
    ],
  },
];

export const DIRECTIONS = ["남동", "남서", "북동", "북서"];
export const INTERIORS = ["수리 없음", "부분 수리", "올수리"];

// 대시보드 카드 하단에 붙는 규제 지정 뱃지. key는 COMPLEXES[].regulations와
// 대시보드 아이템의 item.regulations 배열에 들어가는 값과 일치해야 함.
export const REGULATIONS = {
  overheated: { label: "투기과열지구", cls: "reg-badge--overheated" },
  adjustment: { label: "조정대상지역", cls: "reg-badge--adjustment" },
  "land-permit": { label: "토지거래 허가구역", cls: "reg-badge--land-permit" },
};

// 관심 매물 리스트는 항상 이 개수만큼 고정 슬롯으로 렌더링된다(데이터가 많아지면
// 복잡해질 것 같아 최대 6개로 제한 — 채워진 카드 + 추가 트리거 1칸 + 나머지 빈
// 자리표시자).
export const MAX_DASHBOARD_ITEMS = 6;

export function dongHoText(item) {
  const d = (item.dong || "").trim();
  const h = (item.ho || "").trim();
  if (!d && !h) return "동/호수 미입력";
  return (d ? d + "동 " : "") + (h ? h + "호" : "");
}
