# 개발 실행 계획 — 기존 구조 유지

갱신일: 2026-09-14
현재 단계: **Phase 2 — 프로필 + AI 구현 및 자동 검증 완료, 실제 계정 수동 검증 대기**

사용자가 카카오 보류에 동의한 뒤 Phase 2 착수를 명시적으로 요청했다. 이에 따라 Phase 2를 진행했으며, Phase 1의 이메일·Google 실제 로그인 미검증 이력은 그대로 남긴다. Phase 3은 시작하지 않는다.

재로그인 401 최종 반영 상태 재확인(2026-09-14): 원격 main을 직접 조회한 결과 `f1e8e52`이며, `verify_iat: False` 수정은 아직 `fix/phase1-auth`의 미커밋 변경이다. 기존 알고리즘 화이트리스트 반영과 재로그인 시각 차이 수정 반영은 별개다. 격리 인증 40건 통과 기록은 있으나, main 반영 및 실제 로그아웃 → 즉시 재로그인 → 첫 보호 API 성공이라는 완료 기준은 아직 미충족이다.

이 문서는 사용자의 최신 Phase 지시를 반영한다. 이전 계획의 저장 테이블/API 교체, 별도 비교 상태 신설, 후보별 공유 선택 화면, 임장 모델 선행 신설 제안은 철회한다. 구조 개편보다 기존 동작을 보존하는 최소 변경을 우선한다.

## 인수인계 후 갱신 (2026-09-14 오후)

아래 본문은 인수인계 시점 기록을 그대로 둔다. 그 뒤 달라진 사실만 여기에 적는다.

- **커밋·push:** Phase 1 `e1c5498`, Phase 2 `e695d26`로 나눠 커밋해 `origin/fix/phase1-auth`에 push했다. PR·main 병합·배포는 하지 않았다. 본문의 "미커밋" 표현은 이 시점 이전 기준이다.
- **최신 main 반영:** `b427582`(PR #11 뉴스·청약 화면 연결 + 임장) 위로 rebase했다. `InsightPanel.jsx`는 PR #11의 높이 조절 영역 안에 Phase 2 AI 분석을 넣었고, `Dashboard.jsx`는 양쪽 props를 모두 전달한다. rebase 전 상태는 로컬 `backup/phase1-2-before-rebase`에 있다.
- **재검증:** 백엔드 243개 통과(Phase 1·2 + PR #11의 임장·뉴스·청약, 모두 격리 테스트), 프론트 `npm test` 44개 통과, lint 오류 0개, build 성공.
- **Windows 시간대 DB:** 뉴스·청약의 `ZoneInfo("Asia/Seoul")`가 Windows에서 실패해 `tzdata`를 `requirements.txt`에 추가했다. Phase와 무관하므로 별도 브랜치 `fix/tzdata-windows`(`7d436c3`)로 올렸다.
- **마이그레이션 불일치 (Phase 3 선행 차단):** 공용 DB의 `alembic_version`은 `667be58b68d8`인데 git 어디에도 없어 alembic 명령이 실패한다. 읽기 전용 스키마 비교 결과, 적용 전인 임장 테이블을 제외하면 DB와 main의 차이는 `dashboard_items.checked` 컬럼뿐이다. JINS 브랜치의 `258caef7f856`과 내용은 같고 번호만 다른 것으로 추정한다. JINS 확인 전에는 DB에 upgrade/downgrade/stamp를 실행하지 않는다.
- **main의 후보 삭제 500:** PR #11 이후 후보 삭제가 `property_inspections`를 먼저 조회하는데, 위 불일치로 해당 테이블을 만들지 못해 삭제가 500이 된다(삭제 전 조회에서 실패하므로 데이터 손실은 없음). 마이그레이션 정리 후 해소된다. 그 전까지 수동 검증에서 삭제는 제외한다.
- **정렬 순서 저장 결정:** 사용자가 드래그로 정한 후보 순서를 DB 컬럼으로 저장하기로 결정했다. 기존 팀 규칙("표시 순서는 백엔드에서 관리하지 않음")을 바꾸는 결정이다. **Phase 3(checked)과 함께** 같은 마이그레이션으로 구현한다. 위 마이그레이션 불일치 해소(JINS 확인)가 선행 조건이다.
- **온보딩 미표시 원인:** 수동 확인에 쓴 Google 계정은 이미 `service_purposes=['move','buy']`가 저장돼 있어 모달이 뜨지 않는 것이 정상이다. 새 계정으로 재확인한다.
- **아이디 로그인 전환 (Phase 1 보완):** 사용자 요청으로 이메일 대신 아이디로 가입·로그인한다. Supabase Auth는 이메일 기반이므로 아이디(영문 소문자·숫자·`_` 4~20자)를 배달되지 않는 내부용 주소 `{아이디}@naezipsa.invalid`로 바꿔 넘긴다. 로그인 칸에 `@`가 있으면 기존 이메일 계정으로 처리해 기존 계정 로그인을 유지한다. 가입 응답의 세션으로 바로 로그인 상태가 되며, 세션이 없을 때만 같은 값으로 한 번 더 로그인한다. 마이페이지에는 내부용 주소 대신 아이디를 표시한다. DB·백엔드 변경은 없다.
- **아이디 가입의 콘솔 선행 조건:** 현재 Supabase Auth의 **Confirm email이 켜져 있다**(`mailer_autoconfirm: false`). 이 상태에서는 가입 직후 세션이 나오지 않고, 내부용 주소로 인증 메일이 나가 반송이 쌓인다. 그래서 프론트는 가입 전에 공개 설정을 확인해 켜져 있으면 가입 요청을 보내지 않는다. 프로젝트 관리자가 대시보드 → Authentication → Sign In / Providers → Email → Confirm email을 끈 뒤 수동 검증한다. `.invalid` 도메인을 Supabase가 받아들이는지는 계정을 만들지 않는 방법으로는 확인할 수 없어, 첫 실제 가입에서 확인한다.
- **이메일 로그인 400 원인:** 수동 확인 시점의 `auth.users`에 새 계정이 없었다. 가입이 완료되지 않은 계정으로 로그인해 `invalid_credentials`가 난 것이다.

## 고정 제약

- `dashboard_items`와 기존 후보 CRUD를 유지한다. `saved_items`, `/saved-items`, `/compare`, `/compare/swap`, `on_compare`는 도입하지 않는다. 비교 체크는 `checked`를 사용한다.
- 그룹은 `groups`와 `group_items`로 추가한다. 중첩 그룹은 만들지 않는다. 새 그룹 생성은 기본 copy이며 source group의 관계를 자동 제거하지 않는다.
- 후보 공유 단위는 group이다. 공유 직전에 후보별 별도 선택 UI를 만들지 않는다.
- 비로그인 사용자는 조회만 가능하다. editor도 타인의 원본 후보를 수정·삭제할 수 없다.
- 기존 profile API와 `/dashboard/insight`를 재사용하고 AI 응답 스키마·내 후보만 검사·오류 형식·금액 단위를 유지한다.
- 임장 DB/CRUD가 현재 브랜치에 없으면 임의로 만들지 않는다.
- 각 Phase만 구현·검증·보고하고 다음 Phase는 자동 시작하지 않는다.

## Phase별 범위

| Phase | 범위 | 현재 상태 |
|---|---|---|
| 1 인증 | 이메일·Google 로그인 → session → 보호 API 및 즉시 재로그인 검증. 최신 main 기준으로 기존 인증 수정안만 반영. 카카오는 이메일 권한 확보 전 사용자 결정에 따른 보류 | 인증 수정·자동 검증 및 카카오 버튼 숨김 검증 완료 / 실제 로그인 검증 대기 |
| 2 프로필 + AI | 기존 GET/PATCH `/api/v1/users/me/profile` 사용. `service_purposes === null`은 onboarding, `[]`는 skip 완료, 값 존재는 완료. 목적에 따라 AI 강조점 조정. 나이로 소득·가족·구매력 추론 금지. profile null 동작·응답 스키마 유지 | 구현·자동 검증 완료 / 실제 계정 수동 검증 대기 |
| 3 checked | 기존 auth 브랜치의 checked 수정안을 필요한 diff만 반영. Alembic, model/schema/service 응답, 프론트 toggle 저장·복원. PATCH에 checked만 보내고 다른 detail 필드 보존 | 미착수 |
| 4 groups | `groups`, `group_items`. `POST /api/v1/groups`의 optional `item_ids`로 빈 그룹·선택 후보 그룹·기존 그룹 후보로 새 그룹 생성. clone 전용 API 없음 | 미착수 |
| 5 공유/공동참여 | group 단위 공유. public viewer는 read-only. `allow_join=true`일 때 로그인 후 join. membership 기반 그룹 조회와 원본 item owner 기반 수정 권한 분리 | 미착수 |
| 6 그룹 AI | 기존 `/dashboard/insight`에 그룹 item IDs 전달. 내 후보만 검사 유지. 공동 그룹 전체 AI는 후속 범위 | 미착수 |
| 7 임장 공유 | 현재 브랜치에 임장 DB/CRUD가 있을 때만 시작. 없으면 "선행 임장 데이터 모델이 없어 구현 대기" 보고 | 선행 구조 미확인 / 미착수 |

Phase 2 문구: “간단한 정보를 알려주시면, 내집사가 더 나에게 맞는 AI 인사이트를 제공할 수 있어요.”

Phase 5 CTA: “함께 비교하고 의견을 남기고 싶다면 회원가입하고 공동 참여해보세요.”

## 공통 작업 절차

1. 관련 파일을 읽고 현재 구현과 계획의 차이를 10줄 이내로 정리한다.
2. 수정 파일 목록과 migration 필요 여부를 먼저 제시한다.
3. 해당 Phase만 구현한다. FastAPI router → service → model/schema, SQLAlchemy + Alembic, 기존 Supabase session/auth header를 따른다.
4. 관련 테스트를 실행한다. frontend 변경 시 lint/build도 실행한다.
5. 변경 요약·수정 파일·DB migration·테스트·수동 확인 필요·다음 Phase 전에 확인할 것을 보고한다.
6. 현재 Phase가 완료되지 않으면 다음 Phase로 넘어가지 않는다.

## Phase 1 변경 요약

- 최신 원격 `origin/main`은 `f1e8e52`다. 기존 작업 HEAD `8ffd7f0`와 파일 내용이 같음을 확인하고, `origin/main`에서 `fix/phase1-auth` 브랜치를 생성했다.
- `origin/feature/supabase-auth`의 `f9cc0d1`에는 인증과 checked 수정이 함께 있다. 전체 merge/cherry-pick 없이 인증 부분만 수동 반영했다.
- HS256 및 ES256/RS256 검증의 `verify_iat`만 비활성화했다. 발급 서버의 시계가 앞서 있을 때 로그인 직후 정상 토큰이 거부되는 수정안이다. 허용 알고리즘, 서명, 만료(`exp`), 사용 시작(`nbf`), 대상 서비스(`aud`) 검증을 유지했다.
- 이 수정은 허용 시간 오차에 상한을 추가하는 방식이 아니라 `iat` 검증 자체를 제외하는 방식이다. `iat` 자료형 검증도 제외되며, 원격 인증 수정안의 동작과 같다.
- `alg`가 배열·객체 등 문자열이 아닐 때 500 대신 기존 형식의 401로 거부하도록 보완했다.
- 사용자가 이메일 권한 확보 전 카카오 로그인을 현재 범위에서 제외하기로 했다. `AuthModal.jsx`의 기능 flag를 `false`로 두어 로그인 화면의 카카오 버튼을 숨긴다. 기존 이메일·Google 로그인, 세션 저장, auth header, 기존 후보 CRUD와 프로필/AI/checked 동작은 유지한다.
- 카카오 로그인은 **사용자 결정에 따른 보류**다. 카카오 설정 조치와 실제 로그인 검증은 Phase 1 완료 조건에서 제외하고, 기존 KOE004/KOE205 조사 내용은 향후 재개 참고로 보존한다. Supabase provider·이메일 정책·카카오 콘솔 설정은 변경하지 않는다.
- 실제 계정의 재로그인 성공은 아직 검증하지 않았다. 이 변경은 확인한 브랜치의 `iat` 원인을 처리하며 모든 401 원인을 해결했다고 간주하지 않는다.

### 수정 파일

- [backend/app/core/security.py](../backend/app/core/security.py): 인증 diff 반영, 비정상 알고리즘 자료형 거부.
- [backend/tests/test_auth_algorithms.py](../backend/tests/test_auth_algorithms.py): 미래 발급 시각 및 기존 검증 유지 회귀 테스트.
- [frontend/components/Modal/AuthModal.jsx](../frontend/components/Modal/AuthModal.jsx): 기존 기능 flag로 로그인 화면의 카카오 버튼 숨김 및 비활성 제공자 호출 방지.
- [docs/development-kickoff-plan.md](development-kickoff-plan.md): 사용자 제약과 Phase 1 결과 반영.

### DB migration

없음. DB 스키마·데이터 변경 없음. checked migration은 Phase 3에 남겨둔다.

### 테스트

**이전 인증 변경의 격리 인증 테스트: 40 passed.** 실제 `.env` 로딩을 비활성화하고 테스트용 JWT secret·메모리 SQLite 설정으로 실행했다. SQL 실행은 차단했고, 외부 네트워크도 차단했다. Windows 이벤트 루프에 필요한 loopback 연결만 허용했다. 실제 사용자 계정·후보 데이터는 사용하지 않았다. 이번 카카오 버튼 숨김 변경 후 frontend lint/build도 통과했다. 인증 모달을 메모리에서 정적 렌더링해 카카오 버튼 미노출, Google 버튼 및 이메일·비밀번호 입력란 유지를 확인했다. 이 렌더링 확인에는 실제 OAuth 호출을 사용하지 않았다.

| 항목 | 결과 |
|---|---|
| 기존 + 추가 `test_auth_algorithms.py` | 28개 통과 |
| 토큰 없는 기존 보호 endpoint 9개 | 9개 모두 401 |
| 다른 secret, 잘못된 JWT, 소셜 metadata 추출 | 3개 통과 |
| 미래 `iat` | HS256/ES256/RS256 정상 서명 토큰 허용 |
| 미래 `iat` + 만료/미래 `nbf`/잘못된 `aud`/서명 변조 | 401 유지 |
| `alg` 배열·객체 및 기존 허용 외 알고리즘 | 401, JWKS 미호출 |
| 이전 frontend `npm run lint` | 오류 0개, 기존 img 관련 경고 8개 |
| 이전 frontend `npm run build` | 성공 |
| 카카오 버튼 숨김 후 frontend `npm run lint` | 오류 0개, 기존 img 관련 경고 8개 |
| 카카오 버튼 숨김 후 frontend `npm run build` | 성공 |
| 인증 모달 정적 렌더링 | 카카오 버튼 없음, Google 버튼·이메일·비밀번호 입력란 유지 |
| 실행 중인 로컬 frontend `/` 및 backend `/` | 각각 200 |
| 실행 중인 로컬 profile API 무토큰 / 후보 목록 API 잘못된 토큰 | 각각 401, `UNAUTHORIZED` |

테스트 실행 대상은 아래와 같다. 실제 `.env`를 사용하는 전체 통합 테스트는 실행하지 않았다. 기존 `conftest.py`의 `auth` fixture는 실제 첫 사용자 후보를 삭제·프로필 초기화하므로 별도 검증 환경 없이 전체 테스트를 실행하지 않는다.

```text
pytest tests/test_auth_algorithms.py
       tests/test_auth.py::test_requires_token
       tests/test_auth.py::test_wrong_secret_is_rejected
       tests/test_auth.py::test_malformed_token_is_rejected
       tests/test_auth.py::test_social_metadata_is_extracted
       -q -p no:cacheprovider
```

기존 Starlette/anyio 사용 중단 예정 안내 2개와 테스트용 잘못된 HMAC 키 길이 경고 2개는 남아 있다. 이번 Phase에서 라이브러리 교체는 수행하지 않는다.

### 실제 설정·연결 확인

비밀 값은 출력하지 않고 기존 설정의 유무·일치 여부와 공개 인증 진입 응답만 확인했다.

| 확인 | 결과 | 검증의 한계 |
|---|---|---|
| 프론트/백엔드 Supabase URL | 같은 프로젝트 | 콘솔 전체 설정 일치까지 의미하지 않음 |
| 프론트 공개 키, 백엔드 JWT secret/DB URL | 설정 존재 | 값 전체의 유효성을 단정하지 않음 |
| Supabase `/auth/v1/settings` | 200; Kakao/Google/email 활성화 | 카카오 앱 자체의 사용 설정과는 별개 |
| Kakao authorize 진입 | 302 → `kauth.kakao.com`, 프로젝트 callback 일치 | 카카오 로그인·동의·토큰 교환 미완료 |
| Google authorize 진입 | 302 → `accounts.google.com`, 프로젝트 callback 일치 | Google 로그인·동의·토큰 교환 미완료 |
| 사용자 제공 카카오 오류 | 최초 `KOE004` → QR 인증 진행 후 `KOE205` | 로그인 사용 설정 이후 동의항목 단계에서 실패 |
| Kakao authorize의 실제 scope | `account_email profile_image profile_nickname` | 키·state·토큰은 출력하지 않고 scope만 조회 |
| KOE205 상세 화면 | 위 세 항목 모두 미설정으로 표시 | Supabase 요청 항목과 카카오 앱의 동의항목 설정 불일치 확인 |

### 수동 확인 필요

현재 Phase 1에서 필요한 수동 확인은 아래와 같다. 카카오 설정 조치와 로그인 성공은 현재 완료 조건에 포함하지 않는다.

1. 로그인 화면에서 카카오 버튼이 숨겨지고 이메일·Google 로그인이 계속 제공되는지 확인한다.
2. 이메일·Google 각각 실제 로그인 후 앱 복귀 → session 생성 → 첫 `/api/v1/users/me/profile` 및 `/api/v1/dashboard/items` 조회가 200인지 확인한다.
3. 로그아웃 → 즉시 재로그인 후 첫 보호 API가 성공하는지 확인한다. 토큰 원문·비밀키는 공유하지 않는다.

이메일·Google의 실제 로그인과 재로그인 성공은 아직 검증하지 않았다. 카카오 보류 결정만으로 Phase 1 전체를 완료 처리하지 않는다.

### 카카오 보류 이력 및 향후 재개 참고

사용자는 이메일 허용을 위한 앱 권한 준비 때문에 카카오 로그인을 현재 단계에서 제외하기로 했다. 이는 **이메일 권한 확보 전 사용자 결정에 따른 보류**다. 아래 조사 결과와 설정 확인 절차는 향후 카카오 재개 시 참고용으로 남긴다.

최초 `KOE004` 이후 사용자가 카카오 설정을 조치했고, QR 인증 뒤 `KOE205`가 표시됐다. 당시 상세 화면은 `account_email`, `profile_image`, `profile_nickname` 세 동의항목 모두 미설정이라고 명시했다. 실제 Supabase authorize 요청에서도 같은 세 scope를 확인했다. 재개 시에는 카카오 앱의 동의항목과 요청 항목을 일치시켜야 한다. [카카오 공식 오류 안내](https://developers.kakao.com/docs/ko/kakaologin/trouble-shooting)

향후 재개할 때 **Supabase에 등록한 REST API 키가 속한 카카오 앱**(오류 화면 표시명: “서울 사람”)에서 다음을 확인한다.

1. Kakao Developers → 해당 앱 → 카카오 로그인 → 사용 설정 → 상태를 **ON**으로 설정한다.
2. 이미 ON이면 Supabase Kakao provider의 Client ID가 그 앱의 **REST API 키**인지 확인한다. 다른 앱이나 다른 종류의 키와 혼동하지 않는다.
3. 카카오 로그인 → 동의항목에서 **닉네임(`profile_nickname`)**, **프로필 사진(`profile_image`)**, **카카오계정 이메일(`account_email`)**의 사용 설정을 확인하고 저장한다. 현재는 세 항목 모두 미설정이므로 닉네임·사진만 설정하고 이메일을 남겨두면 같은 오류가 계속될 수 있다.
4. `account_email`이 앱 권한상 설정 불가라면 그 상태를 먼저 확인한다. 기존 이메일 수신 동작을 보존하려면 해당 항목의 사용 권한·설정을 확보해야 한다. 이메일 없이 로그인하는 방식은 별도 대안이며, Supabase의 **Allow users without an email**과 이메일을 제외한 scope 요청을 함께 검토해야 한다. 현재는 이 정책·코드를 변경하지 않았다. [Supabase Kakao 설정](https://supabase.com/docs/guides/auth/social-login/auth-kakao)
5. Kakao redirect URI는 Supabase 프로젝트의 `https://<project-ref>.supabase.co/auth/v1/callback`으로 확인한다. Supabase Redirect URLs에는 앱 복귀 주소를 등록한다. 현재 코드의 `redirectTo`는 `window.location.origin`이다. [앱 복귀 URL 설정](https://supabase.com/docs/guides/auth/redirect-urls)
6. 설정과 카카오 버튼 복원을 반영한 뒤 `http://localhost:3000`에서 카카오 로그인을 새로 시작한다. 앱 복귀 → session 생성 → 첫 `/api/v1/users/me/profile` 및 `/api/v1/dashboard/items` 조회가 200인지 확인한다. 당시 로컬 backend 확인 주소는 `http://127.0.0.1:8000`이었다.
7. 카카오 로그아웃 → 즉시 재로그인 후 첫 보호 API를 다시 확인하고, 이메일·Google 실제 로그인도 회귀 확인한다. 토큰 원문·비밀키는 공유하지 않는다.

당시 자동화 세션에 연결된 브라우저가 없어 실제 사용자 계정으로 위 흐름을 완료하지 못했다. 에이전트가 콘솔 설정·기존 자격증명·계정을 변경하지 않았으며, KOE004/KOE205 해결을 위한 scope·이메일 정책 변경은 적용하지 않았다. 이번 프론트 변경은 사용자 보류 결정에 따른 카카오 버튼 숨김에 한정한다.

### 다음 Phase 전에 확인할 것

- [x] 사용자 결정에 따라 카카오 로그인을 현재 범위에서 보류하고 설정·실제 로그인 검증을 완료 조건에서 제외.
- [x] 카카오 버튼 숨김 후 frontend lint/build 및 로그인 화면 정적 렌더링 확인.
- [ ] 실제 로그아웃 → 즉시 재로그인 후 첫 보호 API 성공.
- [ ] 실제 이메일·Google 로그인 → session → 첫 보호 API 성공.
- [ ] Phase 1 결과 확인 및 필요 시 main 반영·배포.

위 현재 범위의 실제 로그인 검증은 대기 중이다. 이후 사용자가 Phase 2 진행을 명시적으로 요청하여 아래 범위를 구현했다. 카카오의 KOE205 해소는 보류 범위다. 현재 코드 변경은 로컬 작업 브랜치에 있으며 커밋·push·main 병합·배포는 수행하지 않았다.

## Phase 2 변경 요약

- 기존 프로필 model/schema/API가 nullable `service_purposes`와 부분 PATCH를 이미 지원하여 새 API·테이블 없이 연결했다.
- 로그인 세션 복원/변경 후 `GET /api/v1/users/me/profile`을 호출한다. `service_purposes === null`일 때만 온보딩을 표시하고, `[]`와 선택값은 완료로 처리한다.
- 닉네임·나이대는 선택 입력이며 이용 목적은 기존 `move/buy/jeonse/invest` 값으로 복수 선택한다. 안내문은 지정된 문구를 그대로 사용한다.
- 저장은 기존 PATCH를 사용한다. 건너뛰기는 `{ "service_purposes": [] }`만 보내 기존 닉네임·나이대를 보존한다. 요청 성공 후 닫으며 실패하면 입력과 모달을 유지한다.
- 계정 전환 중 이전 화면의 프로필/AI 요청은 세션 사용자 ID를 확인한다. 이전 계정의 늦은 응답과 저장 뒤 도착한 이전 조회 응답은 화면에 반영하지 않는다.
- 초기 `getSession()` 응답이 이미 수신한 최신 로그인 이벤트를 덮어쓰지 않도록 보완했다. 기존 후보 등록·편집·인증 모달이 열려 있으면 온보딩은 해당 모달이 닫힌 후 표시한다.
- 기존 `/dashboard/insight`에서 현재 프로필의 이용 목적만 고정 강조 지침으로 변환한다. 나이·닉네임 값은 AI에 전달하지 않으며 소득·가족 구성·구매력 추론 금지 지침을 둔다.
- 목적이 null/빈 배열이면 기존 system/user prompt를 유지한다. `get_items_with_metrics(db, user_id)` 소유권 필터, 요청·응답 schema, 오류 형식, 금액 단위는 유지한다.
- 인사이트 화면의 기존 빈 영역에 선택 후보 분석 버튼과 요약·강점·약점·분석 시각을 연결했다. 사용자의 클릭 때만 실행하며 비로그인·빈 선택에서는 호출하지 않는다. 후보·계정·목적이 바뀌면 이전 결과를 폐기한다.
- 후보 CRUD와 checked 저장 동작은 이번 Phase에서 변경하지 않았다. checked 영속화는 Phase 3 범위다.
- 사용자 추가 요청으로 로그인 후 헤더에 마이페이지를 연결했다. 로그인 계정 이메일을 확인하고 닉네임·나이대·이용 목적을 수정할 수 있다. 기존 온보딩 폼을 편집 모드로 재사용하며 새 페이지/API는 추가하지 않는다.
- 마이페이지에서는 기존 값을 채워 보여주고 저장 성공 후 닫는다. 취소·닫기·Escape는 저장하지 않으며, 저장 실패 시 입력을 유지한다. 이용 목적을 모두 해제하면 `[]`를 저장해 온보딩 완료 상태를 유지한다. 계정 변경 시 열린 마이페이지는 닫힌다.

### 수정 파일

| 파일 | 변경 내용 |
|---|---|
| [frontend/components/Header.jsx](../frontend/components/Header.jsx) | 로그인 후 마이페이지 진입점, 비로그인 시 기존 로그인 진입 유지 |
| [frontend/components/NaejipsaApp.jsx](../frontend/components/NaejipsaApp.jsx) | 로그인 후 프로필 연결, 모달 표시 조건, 최신 인증 이벤트 보존, AI용 현재 사용자 후보 전달 |
| [frontend/hooks/useProfileOnboarding.js](../frontend/hooks/useProfileOnboarding.js) | 기존 프로필 조회·저장·재시도와 늦은 응답 무효화 |
| [frontend/components/Modal/ProfileOnboardingModal.jsx](../frontend/components/Modal/ProfileOnboardingModal.jsx) | 온보딩과 마이페이지 편집 폼 공유, 선택 입력·목적 복수 선택·저장·건너뛰기·취소·실패 처리 |
| [frontend/lib/api.js](../frontend/lib/api.js) | 기존 GET/PATCH profile 및 POST insight 연결, Supabase 세션·오류 형식 재사용 |
| [frontend/components/Workspace.jsx](../frontend/components/Workspace.jsx), [frontend/components/Dashboard/Dashboard.jsx](../frontend/components/Dashboard/Dashboard.jsx) | 기존 컴포넌트 경로로 AI props 전달 |
| [frontend/components/Insight/InsightPanel.jsx](../frontend/components/Insight/InsightPanel.jsx) | 분석 실행·로딩·결과·실패·재시도·결과 초기화 |
| [frontend/app/globals.css](../frontend/app/globals.css) | 온보딩과 기존 인사이트 영역 스타일 |
| [backend/app/insight/router.py](../backend/app/insight/router.py), [backend/app/insight/service.py](../backend/app/insight/service.py) | 이용 목적만 전달하고 고정 강조 지침 추가 |
| [backend/app/user/router.py](../backend/app/user/router.py) | 온보딩 상태 설명 주석 정정; API 동작 유지 |
| [backend/tests/test_profile_onboarding.py](../backend/tests/test_profile_onboarding.py), [backend/tests/test_insight_profile.py](../backend/tests/test_insight_profile.py) | 격리 프로필·AI 회귀 테스트 |
| [frontend/tests/profile-onboarding.test.jsx](../frontend/tests/profile-onboarding.test.jsx), [frontend/tests/app-onboarding.test.jsx](../frontend/tests/app-onboarding.test.jsx) | 온보딩 저장/skip/재로그인/계정 전환/앱 연결 검증 |
| [frontend/tests/profile-edit.test.jsx](../frontend/tests/profile-edit.test.jsx) | 마이페이지 초기값·수정·취소·실패·목적 전체 해제 검증 |
| [frontend/tests/profile-api.test.js](../frontend/tests/profile-api.test.js), [frontend/tests/insight-panel.test.jsx](../frontend/tests/insight-panel.test.jsx) | auth header·기존 API·분석 화면 회귀 검증 |
| [frontend/vitest.config.mjs](../frontend/vitest.config.mjs), [frontend/package.json](../frontend/package.json), [frontend/package-lock.json](../frontend/package-lock.json) | Vitest/jsdom/Testing Library 테스트 환경과 `npm test` 추가; 기존 의존성 버전 변경 없음 |
| [.gitignore](../.gitignore) | 로컬 검증용 `.tmp/` 산출물 제외 |
| [docs/development-kickoff-plan.md](development-kickoff-plan.md) | Phase 2 결과와 검증 범위 기록 |

기존 Phase 1 변경인 `backend/app/core/security.py`, `backend/tests/test_auth_algorithms.py`, `frontend/components/Modal/AuthModal.jsx`도 같은 작업 브랜치에 남아 있다. Phase 2에서 카카오 제공자 설정은 변경하지 않았다.

### DB migration

**없음.** 기존 profiles 컬럼과 GET/PATCH API를 사용한다. SQLAlchemy 모델·Pydantic schema·Alembic revision은 변경하지 않았다. 실제 DB 스키마나 사용자 데이터도 이번 검증에서 변경하지 않았다.

### 테스트

- 백엔드 **71 passed**: Phase 2 프로필 14개 + AI 17개 + 기존 인증 회귀 40개.
- 프론트엔드 `npm test`: **44 passed** (온보딩 10개 + 앱 연결·마이페이지 연결 7개 + 마이페이지 편집 4개 + API 5개 + AI 화면 18개). 마이페이지 추가 전 기록은 37개였다.
- `npm run lint`: 오류 0개, 기존 `<img>` 관련 경고 8개.
- `npm run build`: production build 및 정적 페이지 생성 성공.
- `git diff --check`: 공백 오류 없음.

백엔드는 `.env` 로딩 비활성화, 테스트 전용 JWT secret, SQLite 설정과 SQL/외부 네트워크 차단 하에 선택한 테스트만 실행했다. 새 프로필 테스트는 메모리 저장소로 실제 JWT 검증과 기존 dependency·router를 통과하며 null/[]/선택값의 요청 간 보존과 사용자 분리를 확인한다. AI 테스트는 DB 조회와 LLM을 mock하여 목적별 강조점, null/[] 기존 프롬프트 동일성, 나이·닉네임 미접근, 소유권 필터, schema, 400/503을 확인한다.

프론트 테스트는 jsdom에서 실제 React 컴포넌트와 hook을 실행하고 API/Supabase를 mock한다. 저장/skip 후 재로그인·재마운트 비반복, 조회·저장 실패 재시도, 계정 전환, 늦은 GET/PATCH/AI 응답, 중복 실행 방지, 기존 후보 모달 우선 표시를 검증한다. 실제 OAuth나 유료 AI 요청을 자동으로 실행하지 않았다. 검증 환경은 Node 24.18.1이며 새 테스트 도구는 Node 24.15 이상인 24.x 또는 지원되는 최신 22.x/26.x 환경이 필요하다.

### 수동 확인 필요

1. 이메일·Google 실제 로그인 후 프로필 조회 200 및 최초 `service_purposes=null` 사용자에게 온보딩이 표시되는지 확인한다. Phase 1의 즉시 재로그인 보호 API 검증도 함께 확인한다.
2. 이용 목적 저장 → 새로고침/재로그인 시 모달 미노출을 확인한다. 다른 최초 사용자로 건너뛰기 → 재로그인 시에도 반복하지 않는지 확인한다.
3. 관심 후보를 선택하고 인사이트 탭에서 AI 분석을 실행해 요약·강점·약점이 표시되는지 확인한다. 목적 설정 여부와 관계없이 실행 가능하며, 외부 AI 미설정/장애 시 실패 안내와 재시도가 표시되어야 한다.
4. 모바일·데스크톱에서 모달 높이/스크롤/키보드 포커스와 실제 AI 결과의 가독성을 확인한다.
5. 헤더 마이페이지 → 프로필 수정 → 다시 열기/새로고침에서 저장값을 확인한다. 취소 시 기존 값이 유지되고, 이용 목적 전체 해제 후에도 온보딩이 다시 표시되지 않는지 확인한다.

실제 Supabase/DB 저장, 외부 LLM의 목적 반영 품질, 브라우저 화면 배치는 격리 자동 테스트만으로 검증하지 않았다. 실제 계정을 연결한 브라우저 검증은 남아 있다.

### 다음 Phase 전에 확인할 것

- [x] Phase 2 구현과 격리 자동 테스트.
- [x] frontend lint/build.
- [ ] 실제 계정 온보딩 저장·건너뛰기·재로그인 및 AI 응답 확인.
- [ ] Phase 2 수동 확인 결과 검토 후 사용자의 Phase 3 착수 지시.

**Phase 3은 시작하지 않았다.** 현재 Phase 2는 구현·자동 검증 완료이며 수동 확인 대기 상태다. 커밋·push·병합·배포는 수행하지 않았다.
