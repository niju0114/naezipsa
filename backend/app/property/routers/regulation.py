"""B-12: 투기과열지구/조정대상지역 뱃지 표기용 엔드포인트.

⚠️ 이 데이터는 정적 테이블(regulation_zones)에서 조회한다. 국토교통부가
   API가 아니라 고시/공고문으로 발표하는 데이터라 자동 갱신이 안 되므로,
   정부 발표가 나올 때마다 ingest/build_regulation_zones.py를 사람이 고쳐서
   다시 실행해야 최신 상태로 유지된다. (info.md 'B-12 참고' 섹션 참고)
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.property.service import get_regulation_status

router = APIRouter(prefix="/complexes", tags=["regulation"])


@router.get("/{complex_id}/regulation-status")
def get_complex_regulation_status(complex_id: int, db: Session = Depends(get_db)):
    """단지의 투기과열지구/조정대상지역 지정 여부.
    대상 아니면 두 값 다 false로 옴 (에러 아님).
    """
    return get_regulation_status(db, complex_id)
