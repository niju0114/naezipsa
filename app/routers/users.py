"""A-01, A-02: 프로필 조회·수정.

로그인은 Supabase Auth가 처리하므로 이 파일에 회원가입·로그인 엔드포인트는 없다.
프론트가 Supabase에서 받은 토큰을 Authorization 헤더에 실어 보내면,
get_current_profile이 검증 + 프로필 조회까지 끝낸 상태로 넘겨준다.

온보딩 화면이든 대시보드의 프로필 화면이든 같은 엔드포인트를 쓴다.
어느 화면에서 호출해도 같은 사용자의 같은 프로필을 읽고 쓰게 된다.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_current_profile
from app.database import get_db
from app.db_models_user import Profile
from app.models.schemas_user import ProfileResponse, ProfileUpdateRequest

router = APIRouter(prefix="/users/me", tags=["users"])


@router.get("/profile", response_model=ProfileResponse)
def read_my_profile(profile: Profile = Depends(get_current_profile)):
    """A-01: 내 프로필 조회.

    첫 호출이면 profiles 행이 이 시점에 만들어진다.
    온보딩을 건너뛴 사용자는 nickname/age_group/service_purposes가 전부 null로 나온다.
    """
    return profile


@router.patch("/profile", response_model=ProfileResponse)
def update_my_profile(
    payload: ProfileUpdateRequest,
    profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    """A-02: 내 프로필 수정. PATCH라서 보낸 필드만 바꾼다.

        {"nickname": "홍길동"}                -> 닉네임만 변경
        {"nickname": null}                    -> 닉네임 삭제
        {"service_purposes": ["move", "buy"]} -> 이용 목적만 변경
        {}                                    -> 아무것도 안 바꿈

    온보딩에서 한 번에 다 보내도 되고, 화면을 나눠 여러 번 보내도 된다.
    """
    # exclude_unset=True로 뽑으면 사용자가 실제로 보낸 필드만 남는다.
    # ("안 보냄"과 "null 보냄"을 구분하기 위함)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(profile, field, value)

    db.commit()
    db.refresh(profile)
    return profile
