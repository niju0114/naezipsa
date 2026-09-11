"""단지 검색 엔드포인트 (B-01). 팀 API 명세 기준으로 필드명 통일."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import select, or_, func
from app.core.database import get_db
from app.property.model import ComplexMaster, SizeMaster

router = APIRouter(prefix="/search", tags=["search"])


@router.get("")
def search_complex(keyword: str, db: Session = Depends(get_db)):
    """단지명 또는 법정동명으로 검색. 예: /search?keyword=래미안 또는 /search?keyword=옥수동
    B-01 명세: keyword 파라미터, complex_id/complex_name/legal_dong_name/address/build_year 반환.
    ⚠️ 2026-09 추가: size_count(이 단지의 평형 개수)도 함께 내려준다 — 프론트 검색
       결과 목록에서 "평형 N개"를 보여주기 위함(기존 B-01 명세 필드는 그대로 유지,
       추가 전용 필드라 기존 소비자에는 영향 없음).
    """
    rows = db.execute(
        select(ComplexMaster).where(
            or_(
                ComplexMaster.apt_nm.ilike(f"%{keyword}%"),
                ComplexMaster.umd_nm.ilike(f"%{keyword}%"),
            )
        ).limit(20)
    ).scalars().all()

    complex_ids = [r.id for r in rows]
    size_counts = dict(
        db.execute(
            select(SizeMaster.complex_id, func.count(SizeMaster.id))
            .where(SizeMaster.complex_id.in_(complex_ids))
            .group_by(SizeMaster.complex_id)
        ).all()
    ) if complex_ids else {}

    return [
        {
            "complex_id": r.id,
            "complex_name": r.apt_nm,
            "legal_dong_name": r.umd_nm,
            # 팀 스키마에 별도 주소 필드가 없어서 법정동+지번으로 임시 구성 (정식 주소 데이터 아님)
            "address": f"{r.umd_nm} {r.jibun}" if r.jibun else r.umd_nm,
            "build_year": r.build_year,
            "size_count": size_counts.get(r.id, 0),
        }
        for r in rows
    ]
