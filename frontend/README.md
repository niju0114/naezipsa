# 프론트엔드

아직 비어 있습니다. 프론트엔드 코드를 이 폴더 안에 넣어주세요.

## 백엔드와 연결하기

백엔드를 로컬에서 띄우면 `http://localhost:8000` 입니다.

```bash
cd ../backend
source .venv/bin/activate        # Windows: .venv\Scripts\activate
uvicorn app.main:app --reload
```

- API 문서(자동 생성): http://localhost:8000/docs
- 전체 엔드포인트 목록과 규칙: [../backend/info.md](../backend/info.md)

## 로그인 처리 방식

로그인은 **백엔드가 아니라 Supabase Auth가 처리**합니다.
프론트엔드가 Supabase SDK로 직접 로그인하고, 받은 토큰을 우리 API 호출 시
헤더에 실어 보내면 됩니다.

```js
// 1. 로그인 (Supabase에 직접)
const { data } = await supabase.auth.signInWithPassword({ email, password })

// 2. 우리 API 호출 (토큰 첨부)
fetch("http://localhost:8000/api/v1/users/me/profile", {
  headers: { Authorization: `Bearer ${data.session.access_token}` },
})
```

Supabase SDK에 필요한 값(`SUPABASE_URL`, publishable 키)은 팀에서 받으세요.
백엔드가 쓰는 `DATABASE_URL`이나 secret 키는 **프론트엔드에서 절대 쓰면 안 됩니다.**
