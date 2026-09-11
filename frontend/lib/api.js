import { supabase } from "@/lib/supabaseClient";

// 백엔드(FastAPI) 통신 헬퍼. 단지 검색(B-01, GET /search), 단지별 평형
// 목록(B-02, GET /complexes/{id}/sizes), 거래량 유동성(B-06,
// GET /items/{size_id}/liquidity), 전세-매매 갭(GET /items/jeonse-gap-recent),
// 매매/전세 시세 추이(B-05, GET /items/{size_id}/trend,
// GET /items/{size_id}/rent-trend), 거시 데이터 매매가격지수(B-10,
// GET /macro/indices), 생활권 내 단지 랭킹(B-09, GET /items/{size_id}/ranking)이
// 연결돼 있다.
//
// API_BASE_URL은 .env.local의 NEXT_PUBLIC_API_BASE_URL을 쓴다(로컬 기본값은
// backend README 기준 http://localhost:8000/api/v1). NEXT_PUBLIC_ 접두어라
// 브라우저에도 노출되지만 그냥 API 주소일 뿐이라 문제 없음.
//
// 2026-09: 로그인 사용자별 관심 매물 저장(A-03~A-08, GET/POST/PATCH/DELETE
// /dashboard/items)도 여기 연결돼 있다. 이 그룹만 로그인이 필수라
// authHeaders()로 Supabase 세션 토큰을 Authorization 헤더에 실어 보낸다.
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";

// 로그인 상태면 현재 Supabase 세션의 access token을 Authorization 헤더로
// 실어 보낸다. 비로그인 상태면 빈 객체 - /dashboard 계열은 이 헤더 없이
// 호출하면 401이 나므로, 호출 자체를 로그인 상태에서만 하도록 호출부
// (components/NaejipsaApp.jsx)에서 user 유무로 막아둔다.
async function authHeaders() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// 단지명/법정동명 키워드로 단지 검색 (B-01).
// 반환 형태(백엔드 응답 그대로): [{ complex_id, complex_name, legal_dong_name, address, build_year }]
export async function searchComplexes(keyword) {
  const res = await fetch(
    `${API_BASE_URL}/search?keyword=${encodeURIComponent(keyword)}`
  );
  if (!res.ok) {
    throw new Error(`search failed with status ${res.status}`);
  }
  return res.json();
}

// 단지 상세페이지에 진입했을 때 이 단지에 실제로 존재하는 평형 목록 (B-02).
// 반환 형태(백엔드 응답 그대로): [{ size_id, representative_area, pyeong, recent_median_price, trade_count_3y }]
export async function getComplexSizes(complexId) {
  const res = await fetch(`${API_BASE_URL}/complexes/${complexId}/sizes`);
  if (!res.ok) {
    throw new Error(`get sizes failed with status ${res.status}`);
  }
  return res.json();
}

// 평형(size_id)의 거래량 유동성 (B-06). period는 3/12/36(개월) 중 하나.
// 반환 형태(백엔드 응답 그대로): { size_id, period_months, sale_count, jeonse_count }
export async function getLiquidity(sizeId, periodMonths) {
  const res = await fetch(
    `${API_BASE_URL}/items/${sizeId}/liquidity?period=${periodMonths}`
  );
  if (!res.ok) {
    throw new Error(`get liquidity failed with status ${res.status}`);
  }
  return res.json();
}

// 여러 평형의 전세-매매 갭을 한 번에 조회. sizeIds는 숫자 배열.
// ⚠️ 백엔드 /items/jeonse-gap(B-08, 팀 확정 3단계 기간완화 로직)과는 다른
// 엔드포인트다 — 이 /jeonse-gap-recent는 매매/전세 각각 "최근 실거래
// 10건의 중앙값"만 단순 비교한다(2026-09 프론트 요구사항). 반환 형태(백엔드
// 응답 그대로): { items: [{ size_id, sample_insufficient, sale_median?,
// jeonse_median?, gap_amount?, gap_ratio?, message? }] }
export async function getJeonseGapRecent(sizeIds) {
  const res = await fetch(
    `${API_BASE_URL}/items/jeonse-gap-recent?ids=${sizeIds.join(",")}`
  );
  if (!res.ok) {
    throw new Error(`get jeonse-gap-recent failed with status ${res.status}`);
  }
  return res.json();
}

// 평형(size_id)의 매매 시세 추이 (B-05). months는 조회 개월 수.
// 반환 형태(백엔드 응답 그대로): { size_id, monthly_median_prices: [{ year_month, median_price }], trend_direction }
export async function getPriceTrend(sizeId, months) {
  const res = await fetch(`${API_BASE_URL}/items/${sizeId}/trend?months=${months}`);
  if (!res.ok) {
    throw new Error(`get price trend failed with status ${res.status}`);
  }
  return res.json();
}

// 평형(size_id)의 전세 시세 추이. months는 조회 개월 수.
// 반환 형태(백엔드 응답 그대로): { size_id, monthly_median_prices: [{ year_month, median_price }] }
export async function getRentTrend(sizeId, months) {
  const res = await fetch(`${API_BASE_URL}/items/${sizeId}/rent-trend?months=${months}`);
  if (!res.ok) {
    throw new Error(`get rent trend failed with status ${res.status}`);
  }
  return res.json();
}

// 거시 데이터: 매매가격지수 + 매매수급동향지수 (B-10). 매물 단위가 아니라
// 전국 단위 지표라 sizeId 없이 기간(개월 수)만 받는다. 가격지수는 월단위라
// months를 그대로 "최근 N개월" 자르기 기준으로 쓴다(백엔드 주석 참고).
// 반환 형태(백엔드 응답 그대로): { region, months, price_index: [{ period,
// value }], price_index_error, supply_demand, supply_demand_error, ... }
export async function getMacroIndices(months) {
  const res = await fetch(`${API_BASE_URL}/macro/indices?months=${months}`);
  if (!res.ok) {
    throw new Error(`get macro indices failed with status ${res.status}`);
  }
  return res.json();
}

// 평형(size_id)의 생활권 내 단지 랭킹 (B-09). 같은 구(sgg_cd) + 비슷한
// 평형(±5㎡) 단지들과 평단가(price_per_pyeong)를 비교해 순위를 매긴
// 결과를 그대로 준다 — "아이템과 동일한 구에 속하는 아파트의 수/평단가
// 비교" 요구사항(2026-09)에 이미 백엔드가 구해둔 값을 그대로 쓴다.
// 반환 형태(백엔드 응답 그대로, 데이터 부족 시 my_rank 등이 없고
// error만 옴): { size_id, area_scope, my_rank?, total?,
// my_price_per_pyeong?, top_complex?, top_price_per_pyeong?,
// all_price_per_pyeong?, error? }
export async function getAreaRanking(sizeId) {
  const res = await fetch(`${API_BASE_URL}/items/${sizeId}/ranking`);
  if (!res.ok) {
    throw new Error(`get area ranking failed with status ${res.status}`);
  }
  return res.json();
}
// --- A-03~A-08: 로그인 사용자의 관심 매물(후보) CRUD -----------------------
// 백엔드 app/dashboard/router.py 참고. 전부 로그인 필수(Authorization 헤더).

// A-04: 내 후보 목록. 단지명·평형·시세 지표까지 함께 온다.
// 반환 형태(백엔드 응답 그대로): { items: [...], count, max_count }
export async function getDashboardItems() {
  const res = await fetch(`${API_BASE_URL}/dashboard/items`, {
    headers: await authHeaders(),
  });
  if (!res.ok) {
    throw new Error(`get dashboard items failed with status ${res.status}`);
  }
  return res.json();
}

// A-03: 후보 등록. size_id만 필수, 나머지 매물 정보는 선택.
export async function createDashboardItem(payload) {
  const res = await fetch(`${API_BASE_URL}/dashboard/items`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(await authHeaders()),
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`create dashboard item failed with status ${res.status}`);
  }
  return res.json();
}

// A-06: 선택 매물정보 수정(호가/층/동/호/향/인테리어). 보낸 필드만 바뀌고,
// null을 보내면 그 필드는 지워진다.
export async function updateDashboardItemDetails(itemId, payload) {
  const res = await fetch(
    `${API_BASE_URL}/dashboard/items/${itemId}/details`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(await authHeaders()),
      },
      body: JSON.stringify(payload),
    },
  );
  if (!res.ok) {
    throw new Error(`update dashboard item failed with status ${res.status}`);
  }
  return res.json();
}

// A-08: 후보 삭제.
export async function deleteDashboardItem(itemId) {
  const res = await fetch(`${API_BASE_URL}/dashboard/items/${itemId}`, {
    method: "DELETE",
    headers: await authHeaders(),
  });
  if (!res.ok) {
    throw new Error(`delete dashboard item failed with status ${res.status}`);
  }
  return res.json();
}
