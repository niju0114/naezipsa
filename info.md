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
| B-10 거시지표 | 아직 미구현 | `curl -G "http://localhost:8000/api/v1/macro/indices" --data-urlencode "region=서울"` |

**더 편한 방법**: 브라우저에서 `http://localhost:8000/docs` 열어서 "Try it out" → "Execute".

## 1-4c. 사용자 API (A-01~A-09)

B의 조회 API와 달리 **로그인 토큰이 필요합니다.** 토큰 없이 부르면 전부 401입니다.

| ID | 기능 | 메서드 | 주소 |
|---|---|---|---|
| A-01 | 내 프로필 조회 | GET | `/api/v1/users/me/profile` |
| A-02 | 내 프로필 수정 | PATCH | `/api/v1/users/me/profile` |
| A-03 | 후보 등록 | POST | `/api/v1/dashboard/items` |
| A-04 | 후보 목록 | GET | `/api/v1/dashboard/items` |
| A-05 | 후보 상세 | GET | `/api/v1/dashboard/items/{id}` |
| A-06 | 선택 매물정보 수정 | PATCH | `/api/v1/dashboard/items/{id}/details` |
| A-07 | 후보 상태 수정 | PATCH | `/api/v1/dashboard/items/{id}/status` |
| A-08 | 후보 삭제 | DELETE | `/api/v1/dashboard/items/{id}` |
| A-09 | 대시보드 집계 | GET | `/api/v1/dashboard` — **B 지표 조인은 미구현** |

**허용값** (DB에는 VARCHAR로 저장, 검증은 Pydantic에서)

| 항목 | 값 | 비고 |
|---|---|---|
| `age_group` | `20s` `30s` `40s` `50s` `60s+` | |
| `service_purposes` (복수) | `move` `buy` `jeonse` `invest` | ⚠️ 팀 확정 필요 |
| `status` | `considering` `interested` `excluded` | 서버가 기본값 `considering` 부여 |
| `direction` | `north` `northeast` `east` `southeast` `south` `southwest` `west` `northwest` | 한글 표시는 프론트 |
| `interior_state` | `none` `partial` `full` | ⚠️ 팀 확정 필요 |

**기획 규칙**
- 후보는 사용자당 **최대 6개**. 7번째 등록은 409.
- 등록 필수값은 **`size_id` 하나뿐**. 나머지는 나중에 채워도 됨.
- **같은 단지·같은 평형을 여러 번 담을 수 있음** (동·호가 다르면 다른 후보).
- `user_id`와 `status`는 요청으로 받지 않음. 토큰과 서버가 정함.
- 남의 후보는 조회·수정·삭제 불가. 없는 것과 남의 것을 구분하지 않고 둘 다 404.
- 표시 순서·우선순위는 백엔드에서 관리하지 않음. 목록은 등록순.

**`list_price` 단위: 만원** (2026-09-08 팀 확정)

`dashboard_items.list_price`와 B의 `raw_trades_sale.deal_amount`가 **둘 다 만원**입니다.
국토부 원본 `dealAmount`가 만원 단위이고 B가 그대로 저장하기 때문에,
**변환 코드를 아예 두지 않기로** 했습니다. 변환 지점이 없으면 빠뜨리거나
두 번 하는 실수도 생기지 않습니다.

| 실제 금액 | 저장/전송 값 |
|---|---|
| 3억 | `30000` |
| 13.2억 | `132000` |
| 30억 | `300000` |

A가 저장한 호가를 B-04(호가 괴리율)에 그대로 넘길 수 있습니다.

> 팀 "변수명 통일" 표의 예시 `1320000000`(원 단위)은 이 합의로 폐기됐습니다.
> API는 `list_price`가 `10000000`(=1000억원)을 넘으면 422로 거부합니다.
> 원 단위 습관으로 값을 보내는 실수를 그 자리에서 잡기 위한 장치입니다.

**토큰 얻는 법**: 프론트가 Supabase 로그인 후 받는 `access_token`입니다.
백엔드만 테스트할 때는 대시보드 → Authentication → Users → Add user로 계정을 만든 뒤
그 계정으로 로그인해 받습니다.

```bash
TOKEN="eyJhbGciOi..."
AUTH="Authorization: Bearer $TOKEN"

curl "http://localhost:8000/api/v1/users/me/profile" -H "$AUTH"

curl -X PATCH "http://localhost:8000/api/v1/users/me/profile" -H "$AUTH"   -H "Content-Type: application/json"   -d '{"nickname":"홍길동","age_group":"30s","service_purposes":["move","buy"]}'

curl -X POST "http://localhost:8000/api/v1/dashboard/items" -H "$AUTH"   -H "Content-Type: application/json" -d '{"size_id":1318}'

curl -X PATCH "http://localhost:8000/api/v1/dashboard/items/1/details" -H "$AUTH"   -H "Content-Type: application/json"   -d '{"list_price":1320000000,"dong":"105","ho":"1203","direction":"south"}'

curl -X PATCH "http://localhost:8000/api/v1/dashboard/items/1/status" -H "$AUTH"   -H "Content-Type: application/json" -d '{"status":"interested"}'

curl "http://localhost:8000/api/v1/dashboard" -H "$AUTH"
curl -X DELETE "http://localhost:8000/api/v1/dashboard/items/1" -H "$AUTH"
```

**응답 코드**

| 코드 | 의미 |
|---|---|
| 401 | 토큰 없음 / 만료 / 위조 / 탈퇴한 계정 |
| 404 | 없는 후보이거나 남의 후보 |
| 409 | 후보 6개 초과 |
| 422 | 허용값이 아닌 enum 값 |

## 1-4d. 오류 응답 형식 (A/B 공통) — ⚠️ 팀 합의 필요

FastAPI 기본값은 오류 종류마다 모양이 달랐습니다. 404는 `detail`이 문자열,
422는 배열이라 프론트가 `typeof`로 분기해야 했습니다.
A/B 라우터가 같은 앱에서 도니까 아래 한 가지 형식으로 통일했습니다.

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "해당 후보 매물을 찾을 수 없습니다.",
    "details": null
  }
}
```

| 필드 | 용도 |
|---|---|
| `code` | 프론트가 분기할 값. HTTP 상태코드에서 유도되므로 따로 외울 것이 없음 |
| `message` | 그대로 화면에 띄울 수 있는 한국어 |
| `details` | 검증 오류(422)일 때만 채워짐 |

**`code` 값**: `BAD_REQUEST`(400) `UNAUTHORIZED`(401) `FORBIDDEN`(403)
`NOT_FOUND`(404) `CONFLICT`(409) `VALIDATION_ERROR`(422) `INTERNAL_ERROR`(500)

**422일 때 `details`** — `loc` 배열 대신 필드 경로를 평탄화해서 줍니다:

```json
"details": [
  {"field": "body.status",
   "message": "Input should be 'considering', 'interested' or 'excluded'",
   "type": "literal_error"}
]
```

**500은 내부 정보를 응답에 담지 않습니다.** DB 접속 문자열이나 테이블 구조가
새어 나갈 수 있어서, 원인은 서버 로그로만 남기고 응답에는 일반 메시지만 줍니다.

구현: `app/core/errors.py`. **되돌리려면 `app/main.py`의
`register_exception_handlers(app)` 한 줄만 지우면 됩니다.** 라우터 코드는
손댈 필요가 없습니다.

⚠️ 회원가입·로그인 엔드포인트는 우리 백엔드에 **없습니다.** Supabase Auth가 처리하고
우리는 토큰 검증만 합니다(`app/core/security.py`). 구글 로그인을 붙여도 안 바뀝니다.

## 1-4b. DB 마이그레이션 (Alembic) — A의 회원 테이블 전용

⚠️ **B의 실거래 테이블은 Alembic이 관리하지 않습니다.** `alembic/env.py`의 `include_object`
필터가 `app/db_models_user.py`에 정의된 테이블만 보도록 막아둔 상태입니다.

```bash
# 1. 모델(app/db_models_user.py)을 수정한 뒤 마이그레이션 파일 자동 생성
alembic revision --autogenerate -m "add users table"

# 2. ★ 생성된 alembic/versions/*.py 를 반드시 눈으로 열어서 확인 ★
#    drop_table / drop_column 이 있으면 절대 실행하지 말고 원인부터 찾을 것

# 3. 실제 DB에 적용
alembic upgrade head

# 현재 상태 확인 / 되돌리기
alembic current          # 지금 DB가 어느 리비전인지
alembic history          # 마이그레이션 이력
alembic downgrade -1     # 한 단계 되돌리기
```

**규칙 2개**
1. `alembic upgrade head` 전에 생성된 파일을 **항상 읽는다.** 자동생성 결과를 안 보고
   실행하는 것이 사고의 진짜 원인입니다.
2. 이미 `push`한 마이그레이션 파일은 **수정하지 않고** 새 리비전을 추가합니다.
   (남이 이미 적용했을 수 있어서 이력이 어긋납니다)

## 1-4e. 테스트 실행

```bash
pytest tests/ -q          # 전체
pytest tests/ -v          # 케이스 이름까지 보기
pytest tests/test_auth.py # 인증만
```

⚠️ 가짜 DB가 아니라 **실제 Supabase 개발 DB**에 붙어서 돕니다.
테이블 구조·외래키·JWT 비밀키가 실제로 맞물려 도는지 확인하는 것이 목적입니다.
후보 매물과 프로필은 매 테스트 전후로 정리되므로 데이터가 남지 않습니다.

아래 경우에는 실패가 아니라 **skip** 됩니다.
- `.env`에 `DATABASE_URL` / `SUPABASE_JWT_SECRET` 이 없을 때
- `auth.users`에 계정이 하나도 없을 때
  → 대시보드 → Authentication → Users → Add user 로 하나 만들면 됩니다

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
| curl로 한글이 든 JSON body를 보내면 `error parsing the body` (400) | Windows 셸이 한글을 UTF-8이 아닌 코드페이지로 인코딩해서 깨진 바이트가 전송됨 | body를 UTF-8 파일로 저장하고 `--data-binary "@body.json"`으로 보내거나, 브라우저의 `/docs`에서 테스트 (API 문제 아님) |
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

---

# 아직 미해결/팀 확인 필요 목록

1. `recent_median_price`가 "평균"인지 "중앙값"인지 (위 2-1 참고)
2. B-10 거시지표: R-ONE/KOSIS 통계표 코드 미확정
3. `address` 필드는 실제 도로명 주소 아님(법정동+지번 임시 조합) — 단, 지도 기능을 안 만들기로 해서 문제 없음
