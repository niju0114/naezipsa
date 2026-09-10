"""[도구] Postman·curl 테스트용 토큰 생성기.

흐름   개발자가 직접 실행 (서버 코드와 무관)
소유   공용

사용법:
    cd backend
    .venv\\Scripts\\activate          (macOS: source .venv/bin/activate)
    python scripts/make_test_token.py

로그인이 필요한 API(A-01~A-09)를 Postman으로 테스트하려면 토큰이 있어야 하는데,
원래는 프론트엔드가 Supabase에 로그인해서 받는 값이다. 프론트 없이 백엔드만
확인하고 싶을 때 쓰라고 만들었다.

.env의 SUPABASE_JWT_SECRET으로 직접 서명하므로, Supabase가 발급한 것과
똑같이 우리 백엔드의 검증을 통과한다.

⚠️ 개발용이다.
   - 이 토큰은 1시간 뒤 만료된다. 만료되면 다시 실행하면 된다.
   - 남에게 주거나 Git에 올리지 말 것. 그 계정으로 로그인한 것과 같다.
   - 운영 환경에서는 쓰지 말 것.
"""
import argparse
import datetime as dt
import sys
from pathlib import Path

# scripts/ 에서 실행해도 app 패키지를 찾을 수 있게 한다.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import jwt  # noqa: E402
from sqlalchemy import text  # noqa: E402

from app.core.config import SUPABASE_JWT_SECRET  # noqa: E402
from app.core.database import get_engine  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description="테스트용 JWT 발급")
    parser.add_argument("--email", help="특정 계정으로 발급 (생략하면 가장 먼저 만든 계정)")
    parser.add_argument("--hours", type=int, default=1, help="유효 시간 (기본 1시간)")
    args = parser.parse_args()

    if not SUPABASE_JWT_SECRET:
        print("[오류] .env에 SUPABASE_JWT_SECRET이 없습니다.")
        print("       Supabase 대시보드 -> Settings -> API -> JWT Settings")
        return 1

    # 토큰의 sub는 실제로 auth.users에 있는 id여야 한다.
    # 아무 UUID나 넣으면 프로필 생성 시 외래키에 걸려 401이 난다.
    sql = "select id, email from auth.users"
    params = {}
    if args.email:
        sql += " where email = :email"
        params["email"] = args.email
    sql += " order by created_at limit 1"

    with get_engine().connect() as conn:
        row = conn.execute(text(sql), params).first()

    if row is None:
        print("[오류] auth.users에 계정이 없습니다.")
        print("       Supabase 대시보드 -> Authentication -> Users -> Add user")
        print("       (Auto Confirm User 체크를 잊지 마세요)")
        return 1

    user_id, email = row
    now = dt.datetime.now(dt.timezone.utc)
    expires_at = now + dt.timedelta(hours=args.hours)

    token = jwt.encode(
        {
            "sub": str(user_id),      # 이 값이 profiles.id 가 된다
            "email": email,
            "role": "authenticated",
            "aud": "authenticated",   # 백엔드가 이 값을 확인한다
            "iat": now,
            "exp": expires_at,
        },
        SUPABASE_JWT_SECRET,
        algorithm="HS256",
    )

    print(f"계정   : {email}")
    print(f"만료   : {expires_at.astimezone().strftime('%Y-%m-%d %H:%M:%S')} ({args.hours}시간 뒤)")
    print()
    print("Postman > Authorization 탭 > Type: Bearer Token > 아래 값 붙여넣기")
    print("(또는 Headers 탭에 Authorization = Bearer <값>)")
    print()
    print(token)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
