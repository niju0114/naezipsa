# 프로젝트 참조 문서 (info.md)

마지막 업데이트: 2026-09-07
이 문서 하나에 "전체 명령어"와 "계산 기준"을 다 모아둡니다. 헷갈릴 때마다 이 파일부터 보세요.

---

# 1부. 전체 명령어 정리

## 1-0. 매번 작업 시작할 때 (가장 먼저)

```bash
cd ~/Desktop/real-estate-backend
source .venv/bin/activate
```
프롬프트 앞에 `(real-estate-backend)`가 뜨면 정상입니다.

## 1-1. 서버 켜기 (API 테스트하려면 반드시 필요)

**새 터미널 탭을 하나 더 열어서** (Cmd+T), 위 1-0을 먼저 하고 나서:
```bash
python -m uvicorn app.main:app --reload
```
`Uvicorn running on http://127.0.0.1:8000`이 뜨면 성공. **이 창은 계속 켜둔 채로 두고 여기서 다른 명령어를 치지 마세요.**

## 1-2. 데이터 파이프라인 (순서 중요, 위에서부터 아래로)

| 순서 | 명령어 | 하는 일 | 언제 실행하나 |
|---|---|---|---|
| 1 | `python ingest/create_tables.py` | Supabase에 테이블 5개 생성 | 처음 한 번, 또는 스키마 바뀌었을 때 |
| 2 | `python ingest/dedupe_raw_tables.py` | 중복 거래 데이터 청소 | 유니크 제약 걸기 전에 항상 먼저 |
| 3 | `python ingest/add_unique_constraints.py` | 같은 거래가 중복 저장되는 것을 DB 차원에서 막음 | 2번 끝난 뒤 |
| 4 | `python ingest/batch_collect.py` | 국토부 API에서 실거래 데이터를 받아와 DB에 저장 (지금은 서울 25개 구, 5년치) | 새 지역 추가하거나 데이터 갱신할 때 |
| 5 | `python ingest/build_complex_master.py` | 원본 데이터에서 "단지 목록" 생성 | 4번 끝난 뒤 |
| 6 | `python ingest/build_size_master.py` | 단지별 "평형 목록" 생성 | 5번 끝난 뒤 |
| 7 | `python ingest/compute_metrics.py` | 평형별 대표 지표를 미리 계산해서 캐시에 저장 | 6번 끝난 뒤 |
| 8 | `python ingest/add_performance_indexes.py` | 데이터 많아져도 검색 느려지지 않게 인덱스 추가 | 7번 끝난 뒤, 1회성 |
| 9 | `python ingest/show_status.py` | 지금 데이터가 몇 건 있는지, 테스트용 size_id는 뭔지 확인 | 언제든 |

**전체 초기화**(데이터가 심하게 꼬였을 때만):
```bash
python ingest/reset_data.py   # 실행하면 RESET 입력해야 진짜로 지워짐
```

## 1-3. 문제 생겼을 때 진단용

```bash
python ingest/debug_rent_insert.py
```
전월세 저장이 왜 실패하는지 진짜 에러 원문을 그대로 보여줍니다.

## 1-4. API 테스트 (서버가 켜져 있어야 함)

`size_id`, `complex_id`는 매번 `show_status.py` 결과에서 확인한 실제 숫자로 바꿔서 쓰세요.

| ID | 기능 | 명령어 |
|---|---|---|
| B-01 단지검색 | 한글 검색이라 특수 처리 필요 | `curl -G "http://localhost:8000/api/v1/search" --data-urlencode "keyword=래미안"` |
| B-02 평형목록 | | `curl "http://localhost:8000/api/v1/complexes/624/sizes"` |
| B-03 아이템 기본지표 | | `curl "http://localhost:8000/api/v1/items/1318"` |
| B-04 호가 괴리율 | POST + body | `curl -X POST "http://localhost:8000/api/v1/items/1318/price-check" -H "Content-Type: application/json" -d '{"list_price": 300000}'` |
| B-05 실거래 추이 | | `curl "http://localhost:8000/api/v1/items/1318/trend"` |
| B-06 거래량 유동성 | | `curl "http://localhost:8000/api/v1/items/1318/liquidity?period=12"` |
| B-07 층별 가격분포 | | `curl "http://localhost:8000/api/v1/items/1318/price-distribution"` |
| B-08 전세매매 갭 | | `curl "http://localhost:8000/api/v1/items/jeonse-gap?ids=1318"` |
| B-09 생활권 랭킹 | | `curl "http://localhost:8000/api/v1/items/1318/ranking"` |
| B-10 거시지표 | 연결됨(가격지수 검증완료, 수급동향 미검증) | `curl -G "http://localhost:8000/api/v1/macro/indices" --data-urlencode "region=전국"` |

**더 편한 방법**: 브라우저에서 `http://localhost:8000/docs` 열어서 "Try it out" → "Execute".

## 1-5. GitHub

```bash
git add .
git commit -m "커밋 메시지"
git push
```
충돌 시: `git pull origin main --allow-unrelated-histories`

## 1-6. 자주 나는 실수 모음

| 증상 | 원인 | 해결 |
|---|---|---|
| `command not found: python` | 가상환경 비활성 | `source .venv/bin/activate` |
| `Connection refused` (curl) | 서버 꺼짐 | 1-1(서버 켜기)부터 다시 |
| `Import string "app.main.app" must be...` | 오타(점 vs 콜론) | `app.main:app` (콜론) |
| 한글 검색 시 `Invalid HTTP request` | curl이 한글 못 보냄 | `-G --data-urlencode` 사용 |
| `Not Found` (404) | 주소 앞에 `/api/v1` 빠짐 | 모든 API 앞에 `/api/v1` 붙이기 |
| 특정 문자열 경로가 숫자 파라미터로 잘못 해석됨 | 라우터에 고정 경로(`/jeonse-gap`)가 동적 경로(`/{size_id}`)보다 뒤에 등록됨 | 고정 경로를 항상 동적 경로보다 먼저 등록 (2026-09-07 수정 완료) |

---

# 2부. 계산 기준 (핵심, 팀 공유용)

모든 계산 함수는 `app/services/analytics.py`에 있습니다.

## 2-1. `recent_median_price` (최근 대표가)

**정의**: 계약해제 제외 후, 최신순 정렬한 **최근 10건**의 거래금액 **중앙값**

```
1. 계약해제(cdeal_type)된 거래 제외
2. (연도, 월, 일) 기준 최신순 정렬
3. 상위 10건 추출 (10건 미만이면 있는 만큼)
4. 그 거래금액들의 중앙값 계산
```

⚠️ **팀 확인 필요한 모순**: "변수명 통일" 표는 "평균이 아니라 중앙값"이라 명시하는데, "데이터 산출 기준" 표는 "최근 10건 **평균**"이라 되어 있어 서로 다름. 지금 코드는 **표본 수(10건)는 후자, 계산 방식(중앙값)은 전자**를 따르는 절충안.

## 2-2. `price_per_pyeong` (평단가)

**정의**: **전체 기간**(10건 제한 없음) 거래금액 중앙값 ÷ 평수

```
1. 계약해제 제외한 전체 기간 거래금액 중앙값 계산
2. size_master.pyeong으로 나눔, 반올림
```
B-03(아이템 기본지표)과 B-09(생활권 랭킹)가 반드시 같은 이 함수를 써야 함 (예전엔 평균/중앙값이 서로 달라서 버그였음, 수정 완료).

## 2-3. `monthly_median_prices` (월별 시세 추이)

```
1. 계약해제 제외, 최근 2개월(신고 미완료 구간) 제외
2. (연도, 월)별로 그룹핑
3. 각 그룹의 거래금액 중앙값 계산
4. 오래된 달 → 최신 달 순 정렬
```

## 2-4. `trend_direction` (상승/하락)

```
월별 중앙값을 y, 월 순서를 x(0,1,2...)로 놓고 선형회귀 기울기(slope) 계산
slope = Σ((x-x평균)(y-y평균)) / Σ((x-x평균)²)
slope > 0 → "상승" / slope < 0 → "하락" / slope = 0 → "보합"
```

## 2-5. `min_price`, `max_price`

계약해제 제외한 전체 기간 거래금액의 단순 최솟값/최댓값.

## 2-6. `jeonse_ratio` (전세가율)

```
매매 중앙값 = 계약해제 제외 전체기간 매매가 중앙값
전세 중앙값 = 월세=0인 순수 전세만, 전체기간 중앙값
jeonse_ratio = (전세 중앙값 ÷ 매매 중앙값) × 100
```

## 2-7. `gap_amount`, `gap_pct` (호가 괴리율)

```
gap_amount = 사용자 입력 호가 − recent_median_price
gap_pct = gap_amount ÷ recent_median_price × 100
```

## 2-8. 층별 그룹 분류 (저층/중층/고층)

```
1. 관측 최고층 ≤ 5층이면 → 분류 안 함 (저층 건물 예외)
2. 그 외: 관측최고층 ÷ 3 = 경계값
   - 저층: floor ≤ 경계값
   - 중층: 경계값 < floor ≤ 경계값×2
   - 고층: 경계값×2 < floor
```
⚠️ 국토부 데이터엔 "건물 총 층수"가 없어서 관측된 최고 거래층을 근사값으로 사용. 실제와 다를 수 있음.

## 2-9. 거래량 유동성 (`sale_count`, `jeonse_count`)

```
1. 오늘 기준 최근 N개월(6/12/24/36 중 선택) 이내 거래만 필터링
2. sale_count = 그 기간 매매 거래 건수 (계약해제 제외)
3. jeonse_count = 그 기간 순수 전세(월세=0) 거래 건수
```
"모호한 ratio"(거래량 비율)는 팀 규칙에 따라 응답에 포함하지 않음.

## 2-10. 생활권 랭킹 기준

**확정된 기준** (2026-09-07 팀 확인): 같은 구(sgg_cd) 안에서, 동(umd_nm)이 다른 단지들도 함께 비교. 평형은 대상 평형 ±5㎡ 범위.

## 2-11. 금액 단위 (2026-09-08 확정)

**모든 금액 필드는 원(₩) 단위로 API 응답**한다. DB(`raw_trades_sale.deal_amount` 등)는 국토부 원본 그대로 **만원 단위 유지**, `app/services/analytics.py`의 `to_won()` 함수가 각 라우터의 응답 생성 시점에만 만원×10,000=원으로 변환한다. `list_price`(사용자 호가, A가 저장)는 이미 원 단위이므로 변환 없이 그대로 사용.

적용 대상: `recent_median_price`, `min_price`, `max_price`, `price_per_pyeong`, `monthly_median_prices[].median_price`, `price_points[].deal_amount`, `floor_groups.*.median_price`, `sale_median`, `jeonse_median`, `gap_amount`, `my_price_per_pyeong`, `top_price_per_pyeong`.
**변환 안 하는 것**: `gap_pct`, `gap_ratio`(비율값), `macro/indices`의 지수값들(금액이 아니라 지수).

## 2-12. B-10 거시뷰 (2026-09-08 연결 완료, 부분 검증)

- **가격지수**: R-ONE, **월단위**로 확정(주간 오픈API 자체가 존재하지 않음을 공공데이터포털 AI검색으로 재확인함). `fetch_price_index_by_region(start, end, region)` — "전국"은 실제 호출로 검증 완료, 다른 지역명은 미검증.
- **수급동향**: KOSIS, 주단위. `fetch_supply_demand()` — **응답 필드명(C1_NM, ITM_NM 등)이 아직 실제로 검증 안 됨**. `/api/v1/macro/indices` 호출 시 실패하면 `supply_demand_error`에 이유가 담겨 응답됨(서버는 안 죽음).

---

# 아직 미해결/팀 확인 필요 목록

1. `recent_median_price`가 "평균"인지 "중앙값"인지 (위 2-1 참고)
2. **B-10 KOSIS 수급동향 응답 필드명 검증** — `/api/v1/macro/indices` 호출해서 `supply_demand_error` 내용 확인 필요
3. `address` 필드는 실제 도로명 주소 아님(법정동+지번 임시 조합) — 단, 지도 기능을 안 만들기로 해서 문제 없음
4. **경기도 확장 여부** — 서울까지만 우선 완료, 시간 되면 이후 진행 (통합 DB로 바로 수집 권장, pg_dump 재작업 방지)
5. **git 브랜치 상태 확인 필요** — `main`과 `feature/property` 관계가 의도와 다르게 됐다는 팀장 피드백 있었음, `git log --oneline --graph --all -15`로 재확인 필요

