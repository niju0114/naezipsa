# naezipsa

부동산 실거래 데이터 기반 매물 비교 대시보드.

국토교통부 실거래가를 수집·가공해서 아파트 평형별 시세 지표를 만들고,
사용자가 관심 매물을 최대 6개까지 담아 비교할 수 있는 서비스입니다.

## 폴더 구조

```
naezipsa/
├── backend/          FastAPI 백엔드 (여기서 모든 백엔드 명령어 실행)
│   ├── app/          API 서버
│   ├── ingest/       국토부 데이터 수집 배치
│   ├── alembic/      DB 마이그레이션
│   ├── tests/        pytest
│   └── info.md       ★ 명령어와 API 명세 전부 여기
├── frontend/         프론트엔드 (작업 예정)
└── README.md
```

> **백엔드 작업은 반드시 `backend/` 폴더 안에서 실행합니다.**
> 루트에서 실행하면 `.env`를 못 찾아 서버가 뜨지 않습니다.

## 처음 시작하기

### 1. 저장소 받기

```bash
git clone https://github.com/niju0114/naezipsa.git
cd naezipsa/backend
```

### 2. 가상환경 + 패키지

**Python 3.14 기준**입니다. 다른 버전에서는 일부 패키지 설치가 실패할 수 있습니다.

```bash
# Windows
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt

# macOS / Linux
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

프롬프트 앞에 `(.venv)`가 뜨면 정상입니다.
macOS는 `bash setup.sh`로 위 과정을 한 번에 할 수도 있습니다.

### 3. `.env` 채우기 (이게 없으면 서버가 안 뜹니다)

```bash
cp .env.example .env
```

값은 **Git에 올라가지 않으므로 팀에서 따로 받아야 합니다.**
카톡·슬랙 평문 대신 1Password나 임시 비밀 공유 링크를 쓰세요.

| 항목 | 어디서 | 없으면 |
|---|---|---|
| `DATABASE_URL` | Supabase → Connect → ORMs | **서버가 안 뜸** |
| `SUPABASE_JWT_SECRET` | Supabase → Settings → API → JWT Settings | 로그인 API가 전부 500 |
| `MOLIT_API_KEY` | 공공데이터포털 | 데이터 수집만 불가 |
| `SUPABASE_URL` / `SUPABASE_KEY` | Supabase → Settings → API | 백엔드는 미사용 (프론트용) |

`DATABASE_URL`에서 자주 막히는 두 가지:

- **`https://`로 시작하면 틀린 값입니다.** 그건 Project URL이고, 필요한 건
  `postgresql://`로 시작하는 접속 문자열입니다.
- 연결 방식은 **Session pooler(5432번 포트, 주소에 `pooler.supabase.com`)** 를 쓰세요.
  Direct(IPv6 전용)는 국내 환경에서 자주 막히고, Transaction pooler(6543)는
  마이그레이션이 동작하지 않습니다.
- DB 비밀번호에 `@` 같은 기호가 있으면 `%40`처럼 퍼센트 인코딩해야 합니다.

### 4. 서버 실행

```bash
uvicorn app.main:app --reload
```

- 서버: http://localhost:8000
- **API 문서(자동 생성): http://localhost:8000/docs** ← 프론트엔드는 여기부터 보세요

### 5. 테스트

```bash
pytest tests/ -q
```

실제 개발 DB에 붙어서 돌기 때문에 `.env`가 필요하고, Supabase에 계정이
하나도 없으면 일부가 skip 됩니다. (Supabase → Authentication → Users → Add user)

## API 한눈에 보기

| 담당 | 범위 | 로그인 |
|---|---|---|
| A | 프로필 `/api/v1/users/me/profile` | 필요 |
| A | 후보 매물 `/api/v1/dashboard/items` | 필요 |
| A | 대시보드 `/api/v1/dashboard` | 필요 |
| B | 단지 검색 `/api/v1/search` | 불필요 |
| B | 평형·지표 `/api/v1/items/{size_id}/...` | 불필요 |
| B | 거시지표 `/api/v1/macro/indices` | 불필요 |

엔드포인트별 요청·응답과 허용값은 **[backend/info.md](backend/info.md)** 에 있습니다.

### 로그인은 백엔드가 처리하지 않습니다

**Supabase Auth**가 회원가입·로그인을 담당하고, 백엔드는 발급된 토큰을
**검증만** 합니다 (`backend/app/core/auth/security.py`).

```
프론트 ──로그인──▶ Supabase Auth ──토큰──▶ 프론트
프론트 ──Authorization: Bearer <토큰>──▶ 백엔드 (검증 후 처리)
```

회원 정보는 Supabase의 `auth.users`에 저장되고, 우리 `profiles` 테이블이
그 id를 외래키로 참조합니다. 그래서 **별도 로그인 API를 만들면 사용자 출처가
두 개로 갈라집니다.** 구글 로그인도 Supabase 대시보드에서 켜면 되고
백엔드 코드 변경은 없습니다.

### 오류 응답 형식

성공이 아닌 응답은 전부 같은 모양입니다.

```json
{ "error": { "code": "NOT_FOUND", "message": "해당 후보 매물을 찾을 수 없습니다.", "details": null } }
```

`code`는 `UNAUTHORIZED` `NOT_FOUND` `CONFLICT` `VALIDATION_ERROR` `INTERNAL_ERROR` 등이고,
`details`는 입력값 검증 실패(422)일 때만 채워집니다.

## 협업 규칙

### 브랜치

`main`이 항상 최신이고 동작하는 상태입니다. **`main`에 직접 커밋하지 않습니다.**

```bash
git checkout main
git pull origin main                  # 남의 작업 먼저 받고
git checkout -b feature/작업이름       # 새 브랜치를 따서 작업
# ... 작업 ...
git add . && git commit -m "feat: 무엇을 했는지"
git push origin feature/작업이름
# GitHub에서 main 대상으로 Pull Request 생성
```

작업이 며칠 이상 이어지면 중간에 `git merge origin/main`으로 최신을 당겨오세요.
오래 두면 나중에 충돌이 커집니다.

### 백엔드 A / B 담당 구분

한 폴더 안에서 두 사람이 작업하므로, 소유자를 정해두고 남의 영역은 건드리지 않습니다.

| 담당 | 파일 |
|---|---|
| **A** (회원·대시보드) | `app/routers/users.py`, `app/routers/dashboard.py`, `app/core/auth/`, `app/db_models_user.py`, `app/models/schemas_user.py`, `alembic/`, `tests/` |
| **B** (실거래 데이터) | `app/routers/{search,complexes,items,macro}.py`, `app/services/`, `app/db_models.py`, `app/models/schemas.py`, `ingest/` |
| **공용** | `app/main.py`, `app/config.py`, `app/database.py`, `app/core/errors.py`, `requirements.txt`, `info.md` |

**규칙 4가지**

1. **A는 B의 `app/services/` 함수를 호출만 하고 수정하지 않습니다.**
   대시보드에 실거래 지표를 붙일 때 `analytics.py`의 함수를 그대로 씁니다.
   시그니처를 바꿔야 하면 B에게 요청하세요. 직접 고치면 B의 API가 조용히 깨집니다.
2. **B는 A의 `app/core/auth/`, `db_models_user.py`, `schemas_user.py`를 건드리지 않습니다.**
3. **`requirements.txt`는 자기 섹션에만 추가합니다.**
   파일이 용도별로 나뉘어 있으니 해당 구역에 넣으세요. 파일 끝에 몰아 쓰면 충돌합니다.
4. **`app/main.py`는 라우터 등록 줄만 추가합니다.**
   `# A 담당:` 주석으로 구역이 나뉘어 있으니 자기 구역에 한 줄만 넣으세요.

공용 파일 4개는 양쪽이 건드릴 수밖에 없지만, 서로 다른 줄에 추가하는 형태라
실제 충돌은 거의 없습니다. 지금까지 A/B가 같은 줄을 고친 적은 없습니다.

### DB 스키마 변경

회원·후보매물 테이블은 Alembic으로 관리합니다. Supabase 화면에서 손으로
테이블을 만들지 마세요.

```bash
alembic revision --autogenerate -m "무엇을 바꿨는지"
# ★ 생성된 alembic/versions/*.py 를 반드시 열어서 확인 ★
#   drop_table / drop_column 이 있으면 실행하지 말고 원인부터 찾을 것
alembic upgrade head
```

실거래 데이터 테이블(`raw_trades_*`, `complex_master`, `size_master`,
`item_metrics_cache`)은 Alembic이 관리하지 않습니다. `alembic/env.py`의
`include_object` 필터가 막고 있으니 그대로 두세요.

### 지켜야 할 것

- **`.env`를 커밋하지 않습니다.** 올라가면 모든 키를 재발급해야 합니다.
- **비밀키를 코드에 직접 쓰지 않습니다.** 반드시 `.env`를 거칩니다.
- **`ingest/reset_data.py`를 실행하지 않습니다.** `TRUNCATE ... RESTART IDENTITY`
  라서 `size_master.id`가 1번부터 다시 매겨지고, 사용자가 담아둔 후보 매물이
  전부 엉뚱한 단지를 가리키게 됩니다.

## 더 읽을 것

- **[backend/info.md](backend/info.md)** — 전체 명령어, API 명세, 지표 계산 기준
- [frontend/README.md](frontend/README.md) — 프론트엔드에서 백엔드 붙이는 법
