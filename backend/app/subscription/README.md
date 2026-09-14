# 뉴스·청약 API 연동 및 백엔드 업로드 안내

## 반드시 유지할 작업 원칙

**GitHub에는 백엔드 변경만 커밋·푸시한다. 프론트엔드 변경은 로컬 연동 테스트용으로 유지하고 업로드하지 않는다.**

- 프론트 변경을 삭제하거나 되돌리지 않는다. 로컬 화면 테스트에 계속 사용한다.
- `git add .`, `git add -A`, `git commit -a`, IDE의 ‘모든 변경 커밋’은 사용하지 않는다.
- `.env`, 토큰, 서비스키는 커밋하지 않는다.
- 아래 명령은 사용자가 업로드할 때 실행할 절차다. 이 문서 정리 작업에서는 스테이징·커밋·푸시를 수행하지 않았다.

## GitHub에 올릴 백엔드 파일

저장소 루트 기준으로 아래 **9개 파일만** 이번 작업의 커밋 대상이다.

| 파일 | 변경 내용 |
| --- | --- |
| `backend/app/news/policy/molit_rss.py` | 부동산 정책 우선, 없으면 국토부 최신 보도자료 반환 |
| `backend/app/news/policy/naver_news.py` | 국내 주택 뉴스 필터, 제목 중복 제거, 부족하면 이전 검색 페이지 추가 조회 |
| `backend/app/subscription/cheongyak_home.py` | 공급 유형별 공고, 접수 상태·일정·모집공고일, 외부 오류 구분 |
| `backend/app/subscription/router.py` | 유형별·개인화·최상위 매물 기준 조회 및 마감제외 |
| `backend/app/subscription/regions.py` | 지역명 정규화, 유형/지역 그룹, 대표 지점 거리순 정렬 |
| `backend/app/subscription/README.md` | API 계약, 프론트 인계, 백엔드 업로드 절차 |
| `backend/tests/test_news.py` | 뉴스 파싱·정책·국내 필터·중복 제거·추가 조회 검증 |
| `backend/tests/test_subscription.py` | 정상 빈 결과·오류·마감 공고·일정 검증 |
| `backend/tests/test_subscription_regions.py` | 지역 순서·사용자 범위·기준 매물·마감제외 순서 검증 |

DB 스키마 변경이나 마이그레이션은 없다. `app/main.py`와 의존성 파일은 이번 업로드 대상에 포함하지 않는다.

## 로컬에만 남길 프론트 파일

아래 **6개 파일은 스테이징·커밋하지 않는다.** 백엔드만 푸시해도 이 파일들은 로컬에 남는다.

- `frontend/app/globals.css`
- `frontend/components/Dashboard/Dashboard.jsx`
- `frontend/components/Insight/InsightPanel.jsx`
- `frontend/components/Insight/NewsCard.jsx`
- `frontend/components/Insight/SubscriptionInfoCard.jsx`
- `frontend/lib/insightApi.js`

현재 로컬 화면 동작:

- 뉴스: 핫뉴스 별도 + 일반 뉴스 최대 4건, 더보기 제거, 제목 호버 밑줄.
- 청약: 화면 최상위 매물의 `sizeId`를 기준으로 지역 우선/근거리순 정렬. 매물 순서 변경 시 재조회.
- 청약 유형 카드는 자신의 그룹 끝까지 상단 고정. `[서울]` 등 지역 그룹과 모집공고일·접수 일정·상태 표시.
- `마감제외`는 백엔드 재조회, `지역선택`은 받아온 지역 그룹 중 선택한 지역만 표시. 호버/선택은 파란색.
- 공고가 없는 지역은 지역명과 데이터 없음 문구 모두 숨김. 유형 카드는 유지하며 실제 오류는 별도 안내.
- AI 영역 손잡이는 드래그로 0~600px 조절. 키보드 위/아래는 20px, Home은 접기, End는 최대화, 더블클릭은 240px 복원. 눈에 보이는 설명 문구는 제거.

백엔드만 업로드하면 위 화면 변경이 팀원 환경에 자동 적용되지는 않는다. 프론트 담당자가 별도로 연동해야 한다.

## 백엔드만 선택하는 Git 명령

### 1. 저장소 위치와 기존 스테이징 확인

아래 명령은 현재 IDE의 **backend 터미널**에서 시작한다. 첫 `cd` 이후 모든 Git 경로는 저장소 루트 기준이다.

```bash
cd ..
git rev-parse --show-toplevel
git branch --show-current
git status --short
git diff --cached --name-only
```

루트가 `naezipsa`인지 확인한다. 마지막 명령에 파일이 나오면 기존 스테이징 내용을 먼저 검토한다.
프론트 파일이 이미 올라가 있다면 해당 경로만 다음처럼 해제한다(작업 파일 자체는 보존).

```bash
git restore --staged -- frontend/app/globals.css
```

다른 프론트 파일도 실제 스테이징된 경로별로 해제한다. 다른 작업의 스테이징을 일괄 초기화하지 않는다.

### 2. 작업 브랜치 생성

정리 시점의 브랜치는 `main`이었다. 실제 상태를 위 명령으로 다시 확인한 후 새 작업 브랜치를 사용한다.

```bash
git switch -c feature/news-subscription-integration
```

같은 이름이 이미 존재하면 덮어쓰지 말고 다른 새 브랜치 이름을 사용한다. 로컬 프론트 변경은 그대로 따라온다.

### 3. 백엔드 9개 파일만 스테이징

```bash
git add -- \
  backend/app/news/policy/molit_rss.py \
  backend/app/news/policy/naver_news.py \
  backend/app/subscription/cheongyak_home.py \
  backend/app/subscription/router.py \
  backend/app/subscription/regions.py \
  backend/app/subscription/README.md \
  backend/tests/test_news.py \
  backend/tests/test_subscription.py \
  backend/tests/test_subscription_regions.py

git diff --cached --name-only
git diff --cached --check
git diff --cached
```

**목록이 위 9개 파일과 정확히 일치하고, `frontend/` 및 `.env`가 없는지 확인한다.**
예상하지 않은 파일이 있으면 커밋하지 말고 그 파일의 스테이징부터 검토한다.

### 4. 테스트 후 커밋

```bash
cd backend
.venv/bin/python -m pytest tests/test_news.py tests/test_subscription.py tests/test_subscription_regions.py -q
cd ..
git commit -m "feat: add domestic news filtering and regional subscription APIs"
git show --stat --oneline HEAD
git status --short
```

커밋 후 프론트의 `M`/`??` 표시가 남는 것은 정상이다. 프론트를 추가 커밋하거나 정리하기 위해 삭제하지 않는다.

### 5. 전송할 커밋까지 확인 후 푸시

```bash
git fetch origin
git log --oneline origin/main..HEAD
git diff --name-only origin/main...HEAD
```

전송 대상에 관련 없는 커밋이나 프론트 변경이 있으면 **푸시를 중단하고 확인한다.**
현재 커밋만 백엔드라고 해서 이전 로컬 커밋까지 안전한 것은 아니다.

검토가 끝났고 위에서 만든 브랜치 이름을 그대로 사용했다면:

```bash
git push -u origin feature/news-subscription-integration
```

이후 GitHub에서 PR을 만든다. 브랜치 이름을 변경했다면 실제 이름으로 명령을 바꾼다.

PR 설명 예시:

> 국내 부동산 뉴스 필터와 중복 제거를 적용하고, 부족한 기사 수를 이전 검색 페이지로 보충합니다.
> 청약은 유형·지역 그룹, 기준 매물 지역 우선 거리순 정렬, 마감제외, 모집공고일·접수 상태를 제공합니다.
> 외부 서비스 시간 제한과 장애는 정상 빈 결과와 구분합니다. 프론트 변경은 포함하지 않습니다.
> 검증: 뉴스·청약 관련 테스트 54개 통과. 실제 운영시간 제한 및 화면 동작은 별도 확인이 필요합니다.

## 뉴스 API

- `GET /api/v1/news/hot`: 부동산 정책에 해당하는 국토부 RSS 항목 우선, 없으면 최신 국토부 보도자료. `is_policy_match`로 구분.
- `GET /api/v1/news?limit=5`: 국내 주택 관련 뉴스. 날짜 제한 없이 최대 5페이지까지 조회한다.
- 제목의 서로 다른 단어 3개 이상이 겹치면 수집 결과 중 먼저 게시된 기사를 남긴다. 단어는 문장부호 기준으로 나누며 형태소 분석은 하지 않는다.
- 상대 시각/날짜를 비교한다. 날짜만 있는 기사의 당일 정확한 선후는 구분하지 못한다. 시각 미제공 기사는 원래 수집 순서로 처리한다.
- 일반 뉴스 목록 내부에서 중복을 제거한다. 핫뉴스와의 URL 중복은 로컬 프론트에서 추가 제거한다.
- 국내 키워드 필터가 일부 기사를 누락하거나, 단어 3개가 겹치는 다른 주제를 제외할 수 있다.
- 적합한 기사 부족 또는 후속 페이지 장애 시 확보한 기사만 반환한다. 항상 4건을 보장하지 않는다.

## 청약 API

| 경로 | 용도 및 주요 파라미터 |
| --- | --- |
| `/api/v1/subscription` | 기존 공개 목록. `categorized=true`로 유형별 공고, `region` 지역 필터, `limit` 1~400 |
| `/api/v1/subscription/personalized` | 로그인 필요. 등록된 관심 지역들을 등록순 우선, 나머지는 최소 거리순. `limit_per_region` 1~30 |
| `/api/v1/subscription/nearby` | 현재 화면에서 사용. `size_id` 필수, `limit_per_region` 1~30, `exclude_closed` 기본 false |

현재 화면 예시:

```text
GET /api/v1/subscription/nearby?size_id=123&limit_per_region=30&exclude_closed=true
```

`nearby`는 공개 평형·단지의 지역 코드만 조회하며 사용자 관심 목록을 읽지 않으므로 로그인 토큰이 필요 없다.
`personalized`는 `Authorization: Bearer <access_token>`으로 검증된 사용자의 목록만 읽는다.

지역 정렬은 기준 지역 우선, 이후 시·도 대표 지점 간 직선거리순이다. 실제 매물 간 거리나 차량 이동거리가 아니다.
경기는 수원, 강원은 춘천, 충북은 청주, 충남은 홍성, 전북은 전주, 전남은 무안,
경북은 안동, 경남은 창원, 제주는 제주시 부근을 사용한다. 좌표는 `regions.py`에 명시한다.

### 공고와 상태

- 유형: `priority-1`(1순위), `no-rank`(무순위/잔여세대), `special`(특별공급), `officetel`(오피스텔).
- `announced_at`: 원본 `RCRIT_PBLANC_DE` 모집공고일. 별도 웹 게시 시각이 아니다.
- `receipt_start`, `receipt_end`: 접수 시작/종료일.
- `receipt_status`: `closed`, `open`, `upcoming`, `unknown`. 한국 날짜 기준, 마감일 당일까지 접수중. 당일 마감 시각은 판단하지 않는다.
- `exclude_closed=true`: 수집한 전체 결과에서 `open`/`upcoming`만 남긴 후 지역별 개수 제한을 적용한다. 일정 미상도 제외한다.
- 수집 범위는 외부 API 각 유형 첫 100건이다. 전국 전체 과거 이력을 무제한 조회하는 기능은 아니다.
- 일반 공개 목록은 기존 `status/count/data`의 평면 배열을 유지한다. 그룹 응답은 아래 구조를 사용한다.

### 그룹 응답 구조

```json
{
  "status": "success",
  "reference_size_id": 123,
  "preferred_regions": ["서울"],
  "sort_basis": "region_reference_point_distance",
  "distance_is_approximate": true,
  "count": 0,
  "data": [{
    "category": "priority-1",
    "label": "1순위",
    "regions": [{
      "region": "서울",
      "label": "[서울]",
      "is_preferred": true,
      "distance_km": 0.0,
      "count": 0,
      "total_count": 0,
      "items": [],
      "message": "조건에 맞는 데이터가 없습니다."
    }],
    "message": "조건에 맞는 데이터가 없습니다."
  }]
}
```

예시에서는 나머지 세 유형을 생략했다. 실제 응답에는 빈 유형도 포함된다.
`reference_size_id`는 `nearby`에만 제공한다. `items`에는 기존 공고 필드와 `region_label`이 들어간다.
백엔드는 빈 관심 지역 그룹을 보존한다. **현재 로컬 프론트는 빈 지역과 안내 문구를 렌더링하지 않는다.**

### 정상 빈 결과와 오류 구분

일반 목록에서 조건에 맞는 공고가 없으면 HTTP 200:

```json
{"status":"success","count":0,"data":[]}
```

그룹 API는 HTTP 200, `count: 0`과 빈 유형/지역 그룹 구조를 반환한다.
서비스 시간 외·점검·장애는 정상 빈 결과로 숨기지 않는다.

```json
{
  "error": {
    "code": "HTTP_503",
    "message": "현재 청약홈 서비스 이용 가능 시간이 아닙니다. 이용 가능한 시간에 다시 시도해 주세요.",
    "details": {
      "source": "applyhome",
      "reason": "OUTSIDE_SERVICE_HOURS",
      "retryable": true
    }
  }
}
```

| HTTP | reason | 의미 |
| --- | --- | --- |
| 503 | OUTSIDE_SERVICE_HOURS | 원본에서 서비스 시간 외 문구 확인 |
| 503 | MAINTENANCE | 원본에서 점검 문구 확인 |
| 502 | UPSTREAM_TIMEOUT | 외부 API 시간 초과 |
| 502 | UPSTREAM_ERROR | 외부 연결·HTTP·업무 오류 |
| 502 | INVALID_UPSTREAM_RESPONSE | JSON/data 형식 오류 |
| 502 | CONFIGURATION_ERROR | 서비스키 미설정, retryable=false |

기준 평형/지역 누락은 404, 알 수 없는 지역 코드는 422를 반환한다.
프론트는 `error.message`를 화면에 표시하고 `error.details.reason`으로 세부 분기한다.
운영시간이나 재개 시각을 추정하지 않으며, `retryable=true`는 즉시 반복 호출을 뜻하지 않는다.
외부 요청 URL·서비스키를 오류 응답에 포함하지 않는다.

## 검증 및 남은 확인

뉴스·청약 테스트 54개와 변경 프론트 컴포넌트 ESLint 검사를 통과했다.
테스트는 외부 응답과 DB 조회를 모의 처리한 범위를 포함한다. 전체 서비스 테스트나 운영 환경 검증 완료를 의미하지 않는다.
청약 API에서 실제 마감 공고와 모집공고일 반환을 확인했다.
최신 화면의 필터·드래그·유형 고정·지역 정렬은 사용자의 로컬 화면 확인을 이어간다.
