"""라우터가 공통으로 쓰는 의존성.

security.py 가 "이 토큰이 진짜인가"를 본다면,
이 파일은 "그 사용자의 DB 행을 가져온다"까지 담당한다.
"""
import uuid

from fastapi import Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.security import CurrentUser, get_current_user
from app.database import get_db
from app.db_models_user import Profile


def get_current_profile(
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Profile:
    """로그인 사용자의 profiles 행을 가져온다. 없으면 만들어서 준다.

    회원가입은 Supabase Auth가 auth.users에만 기록하고 우리 테이블은 건드리지 않는다.
    그 간극을 메우는 방법은 두 가지다.

      (1) auth.users에 트리거를 걸어 가입 즉시 프로필을 만든다 (Supabase 관례)
      (2) 첫 요청이 들어왔을 때 우리가 만든다  <-- 이 방식을 택함

    (2)를 택한 이유: 트리거는 Supabase가 관리하는 auth 스키마를 건드려야 해서
    Alembic 관리 밖으로 새고, 문제가 생겼을 때 파이썬 코드보다 추적이 어렵다.
    """
    try:
        user_uuid = uuid.UUID(user.id)
    except ValueError:
        # 정상적인 Supabase 토큰이라면 sub는 항상 UUID다.
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="토큰의 사용자 식별자 형식이 올바르지 않습니다.",
        )

    profile = db.get(Profile, user_uuid)
    if profile is not None:
        return profile

    profile = Profile(id=user_uuid, email=user.email or "")
    db.add(profile)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        # 같은 사용자의 요청이 동시에 들어와 이미 만들어졌을 수 있으니 다시 조회한다.
        profile = db.get(Profile, user_uuid)
        if profile is not None:
            return profile
        # 그게 아니라면 auth.users에 없는 사용자다.
        # (탈퇴한 계정의 토큰을 아직 들고 있는 경우 - FK 제약에 걸린다)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="존재하지 않는 계정입니다. 다시 로그인해 주세요.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    db.refresh(profile)
    return profile
