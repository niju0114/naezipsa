"""JWT 검증과 로그인 사용자 식별 (A 담당).

--- 전체 흐름 -------------------------------------------------------------

  1. 사용자가 프론트엔드에서 로그인          -> Supabase Auth 가 처리 (우리 서버 아님)
  2. Supabase 가 access_token(JWT) 발급      -> 프론트엔드가 보관
  3. 프론트가 우리 API를 부를 때 헤더에 첨부  -> Authorization: Bearer eyJhbGci...
  4. 우리는 그 토큰이 진짜인지 "검증"만 한다  -> 이 파일이 하는 일

우리는 비밀번호를 저장하지도, 로그인을 처리하지도 않는다.
Supabase가 서명해서 발급한 토큰이 위조/변조되지 않았는지만 확인한다.

--- JWT가 뭔가 ------------------------------------------------------------

점 두 개로 나뉜 문자열이다.

    eyJhbGciOiJIUzI1NiJ9 . eyJzdWIiOiJhYmMiLCJleHAiOjE3MzR9 . 4fJ2xK9...
    └─── 헤더 ────┘       └──────── 페이로드 ────────┘      └ 서명 ┘
       (서명 알고리즘)      (누구인지 sub + 만료시각 exp)      (위조 방지)

페이로드는 암호화가 아니라 그냥 Base64 인코딩이다. 누구나 열어볼 수 있으므로
비밀 정보를 담으면 안 된다. JWT의 안전성은 "내용을 숨기는 것"이 아니라
"비밀키 없이는 유효한 서명을 만들 수 없다"는 데서 나온다.

--- 검증이 확인하는 것 ----------------------------------------------------

  1) 서명  : 헤더+페이로드를 SUPABASE_JWT_SECRET으로 다시 해싱해 서명과 대조.
             누가 페이로드의 sub를 남의 ID로 바꾸면 서명이 안 맞아 즉시 걸린다.
  2) exp   : 만료된 토큰인지
  3) aud   : Supabase가 로그인 사용자에게 발급한 토큰이 맞는지 ("authenticated")

서명만 맞으면 DB를 조회할 필요가 없다. 그래서 세션 테이블 조회 없이 빠르다.

--- 참고: 프로젝트가 비대칭키(ES256/RS256)를 쓰는 경우 -------------------

최근 만들어진 Supabase 프로젝트는 대칭키(HS256 + JWT Secret) 대신
비대칭키 서명이 기본일 수 있다. 이 파일은 대칭키(HS256) 기준이다.
대시보드 -> Project Settings -> API -> JWT Keys 에서 확인할 수 있고,
비대칭키라면 JWKS 공개키를 받아 검증하는 방식으로 바꿔야 한다
(PyJWT의 PyJWKClient 사용). 그때는 이 파일만 고치면 된다.
"""
from dataclasses import dataclass

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import SUPABASE_JWT_SECRET

# Supabase가 로그인한 사용자에게 발급하는 토큰의 aud 클레임 고정값
_EXPECTED_AUDIENCE = "authenticated"
_ALGORITHM = "HS256"

# Swagger(/docs) 화면에 "Authorize" 버튼을 띄워주는 역할도 겸한다.
# auto_error=False 로 두면 헤더가 없을 때 FastAPI가 곧바로 403을 내지 않고
# 우리가 직접 401과 한글 메시지를 돌려줄 수 있다.
_bearer_scheme = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class CurrentUser:
    """검증을 통과한 로그인 사용자. 여기 담긴 값은 위조될 수 없다."""

    id: str      # JWT의 sub 클레임 = auth.users.id (UUID 문자열)
    email: str   # JWT의 email 클레임
    role: str    # Supabase 내부 역할. 보통 "authenticated"


def _unauthorized(detail: str) -> HTTPException:
    # 401에는 WWW-Authenticate 헤더를 같이 주는 것이 HTTP 규약이다.
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


def decode_token(token: str) -> dict:
    """토큰을 검증하고 페이로드를 돌려준다. 실패하면 401.

    라우터에서 직접 쓸 일은 없고, get_current_user가 호출한다.
    (테스트에서 단독으로 부르기 쉽도록 분리해 두었다)
    """
    if not SUPABASE_JWT_SECRET:
        # 설정 실수를 401(사용자 잘못)이 아니라 500(서버 잘못)으로 구분해서 알린다.
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=".env에 SUPABASE_JWT_SECRET이 설정되지 않아 토큰을 검증할 수 없습니다.",
        )

    try:
        return jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=[_ALGORITHM],   # 알고리즘을 고정해야 'alg: none' 위조를 막는다
            audience=_EXPECTED_AUDIENCE,
        )
    except jwt.ExpiredSignatureError:
        raise _unauthorized("토큰이 만료되었습니다. 다시 로그인해 주세요.")
    except jwt.InvalidAudienceError:
        raise _unauthorized("이 서비스용 토큰이 아닙니다.")
    except jwt.InvalidTokenError:
        # 서명 불일치, 형식 오류 등 나머지 전부.
        # 어느 쪽으로 실패했는지 자세히 알려주면 공격자에게 힌트가 되므로 뭉뚱그린다.
        raise _unauthorized("유효하지 않은 토큰입니다.")


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
) -> CurrentUser:
    """로그인이 필요한 엔드포인트에 붙이는 의존성.

    사용법:
        @router.get("/me")
        def read_me(user: CurrentUser = Depends(get_current_user)):
            return {"id": user.id}

    이 함수가 값을 돌려줬다는 것은 검증을 이미 통과했다는 뜻이다.
    """
    if credentials is None:
        raise _unauthorized("로그인이 필요합니다. Authorization 헤더가 없습니다.")

    payload = decode_token(credentials.credentials)

    user_id = payload.get("sub")
    if not user_id:
        raise _unauthorized("토큰에 사용자 정보(sub)가 없습니다.")

    return CurrentUser(
        id=user_id,
        email=payload.get("email", ""),
        role=payload.get("role", ""),
    )


def get_current_user_optional(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
) -> CurrentUser | None:
    """로그인해도 되고 안 해도 되는 엔드포인트용.

    예: 단지 상세 조회는 누구나 볼 수 있지만, 로그인한 사람에게는
        "이미 즐겨찾기에 담았는지"를 같이 내려주고 싶을 때.

    헤더가 없으면 None을 준다. 단, 헤더가 있는데 토큰이 잘못됐다면
    조용히 넘기지 않고 401을 낸다. (만료된 토큰을 들고 온 사용자에게
    비로그인 화면을 보여주면 원인을 알 수 없어 더 혼란스럽다)
    """
    if credentials is None:
        return None
    return get_current_user(credentials)
