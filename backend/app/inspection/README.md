# 모바일 임장 백엔드 연결

첨부 MVP의 백엔드 요구사항을 기존 FastAPI / SQLAlchemy / Supabase PostgreSQL에 맞췄다.
프런트 화면·모바일 링크·QR은 별도 프런트 작업이다.

## 작업 및 GitHub 반영 범위

이 기능은 기존 뉴스·청약 변경과 구분하는 **모바일 임장 백엔드** 작업이다.
전용 코드는 `app/inspection/`, 테스트는 `tests/test_inspection.py`에 둔다.
공용 코드 변경은 라우터 등록, Alembic 모델 등록, 후보 삭제 시 기록 보존 처리다.
프런트엔드 변경은 이 기능의 커밋에 포함하지 않는다.

backend 디렉터리에서 아래 파일만 선택한다. `git add .` 또는 `git add -A`로
기존 뉴스·청약 작업까지 함께 추가하지 않는다.

```sh
git add -- app/inspection/ tests/test_inspection.py \
  alembic/versions/20260913_1500_c71f9a2d830e_create_property_inspections.py

# 공용 파일은 임장 관련 변경만 선택한다.
git add -p -- app/main.py app/dashboard/router.py alembic/env.py

# 목록과 diff가 위 범위에 해당하는지 확인한 뒤 별도 커밋한다.
# 이미 스테이징된 다른 작업이 있다면 먼저 커밋 범위를 분리해야 한다.
git diff --cached --name-only
git diff --cached
git commit -m "feat(inspection): add authenticated inspection backend"
```

GitHub push는 커밋 단위로 전송한다. 이번 변경에서 프런트 파일을 제외하는 것과
기존 저장소 이력의 프런트 파일을 제거하는 것은 별개이며, 기존 이력은 유지한다.

## 적용 및 실행

```sh
# 연결 대상이 개발 DB인지 확인한 뒤 backend에서 실행
.venv/bin/alembic upgrade head
.venv/bin/uvicorn app.main:app --reload

# 외부 DB나 실제 계정을 사용하지 않는 통합 테스트
.venv/bin/python -m pytest tests/test_inspection.py -q
```

신규 revision은 `c71f9a2d830e`이며 기존 `98a4d5fa65f8` 다음이다.
기존 후보·단지 테이블을 재생성하거나 예시 매물을 넣지 않는다.
테스트는 임시 파일 SQLite에 신규 migration의 upgrade/downgrade를 실행한다.
PostgreSQL SQL 생성도 검증하지만 실제 Supabase 적용·기기 연결 검증은 별도로 필요하다.

## 프런트 계약

- 매물 ID는 `/api/v1/dashboard/items` 응답의 `items[].id`다. `size_id`나 단지 ID가 아니다.
- 모바일 링크는 프런트 도메인의 `/visit/{id}`로 만든다.
- GET `/api/v1/properties/{id}`: 선택 후보의 표시 정보를 반환한다.
- POST `/api/v1/properties/{id}/inspection`: 임장 기록을 매번 신규 저장하고 COMMIT 후 201을 반환한다.
- 두 요청 모두 기존 Supabase `Authorization: Bearer <access_token>`을 보낸다. 첨부 예제의 cookie 전용 fetch로는 인증되지 않는다.
- 로그인 이후 원래 `/visit/{id}` 경로로 복귀하는 처리는 프런트에서 구현한다.

GET 예시:

```json
{
  "id": 1,
  "size_id": 200,
  "complex_name": "테스트 아파트",
  "dong": "0101",
  "ho": "1203",
  "representative_area": 84.95,
  "pyeong": 34,
  "floor": 12,
  "list_price": 1320000000
}
```

첨부 예제와의 필드 대응: `apartment_name` → `complex_name`, `building` → `dong`,
`unit` → `ho`, `area` → `representative_area`(㎡) / `pyeong`(평), `price` → `list_price`(원).
층·동·호·호가는 선택 입력이므로 null을 허용하며, 표시 단위는 프런트에서 붙인다.

POST 예시:

```json
{"transport":3,"commute_road":2,"harmful_facility":0,"overall_rating":4,"memo":"채광이 좋음"}
```

201 응답: `{"id":1,"property_id":1,"created_at":"2026-09-13T05:00:00Z"}`.
시간은 DB가 생성하며 PostgreSQL에서는 시간대가 포함된 ISO 8601로 반환한다.

18개 필드:

| 그룹 | 키 |
| --- | --- |
| 교통 | transport, commute_road |
| 교육·생활 | school, academy, convenience, noise, harmful_facility |
| 단지 | parking, sunlight, natural_light |
| 내부 상태 | leak_mold, wallpaper, water_pressure, toilet_drain, drain_smell |
| 설비 | window_condition, heating, floor_noise |

일반 체크는 정수 1~3, 유해시설은 정수 0~1. 생략하거나 null을 보내면 미확인이다.
`overall_rating`은 체크 평균과 무관한 필수 정수 1~5.
문자열 숫자·실수·boolean은 거부한다. `memo`는 생략 시 빈 문자열, 최대 2,000자이며 null은 거부한다.
본문의 `property_id`, `user_id` 등 정의되지 않은 필드는 거부한다.

401: 로그인 필요. 404: 없는 후보 또는 다른 사용자 후보. 422: 잘못된 입력.
500: DB 저장 실패 등 서버 오류. 오류는 기존 `{"error":{"code":"...","message":"...","details":null}}` 형식을 유지한다.
422의 details에는 필드별 검증 오류 배열이 담긴다.
프런트는 저장 중 버튼을 잠그고, 201에서만 성공을 표시하며 실패 시 입력값을 유지해야 한다.
요청 키 기반 중복 방지는 MVP에 포함하지 않으므로 자동 POST 재시도는 중복 기록을 만들 수 있다.

## 기록 보존과 후보 삭제

`property_inspections.property_id`는 `dashboard_items.id`를 RESTRICT 외래키로 참조한다.
임장 기록이 있는 후보의 기존 DELETE API는 409를 반환한다. 후보를 숨기려면 기존 상태 변경 API로
`excluded`를 사용한다. 임장 기록이 없는 후보는 종전처럼 삭제된다.
이 FK는 프로필/계정의 연쇄 삭제에도 영향을 주므로, 추후 회원 탈퇴 기능에서는 임장 기록 보존·삭제 정책을 함께 구현해야 한다.
저장·삭제는 후보 행 잠금으로 직렬화한다(PostgreSQL). SQLite 테스트는 행 잠금 경합까지 검증하지 않는다.
기록 조회·수정 UI, 사진·GPS·AI, 오프라인 초안은 이번 구현 범위에 포함하지 않는다.

DB 확인(SQL 파라미터에 대상 후보 ID 전달):

```sql
SELECT id, property_id, transport, harmful_facility, overall_rating, memo, created_at
FROM property_inspections
WHERE property_id = :property_id
ORDER BY id DESC;
```
