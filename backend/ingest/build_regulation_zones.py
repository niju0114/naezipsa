"""B-12: 투기과열지구/조정대상지역 지정 현황을 regulation_zones 테이블에 채워넣는 스크립트.

⚠️⚠️⚠️ 이 데이터는 국토교통부가 API가 아니라 '고시/공고문'으로 발표한다.
   자동으로 최신화되지 않으니, 정부가 새로 지정/해제 발표를 하면
   이 파일의 아래 목록을 사람이 직접 고쳐서 다시 실행해야 한다.

조사 근거 (2026-09-10 기준, 웹 검색으로 확인):
- 2025년 10월 15일 국토교통부 발표: 서울 25개 구 전역 + 경기 12개 지역을
  투기과열지구 + 조정대상지역으로 동시 지정 (3중 규제, 토지거래허가구역 포함)
- 2026년 2월 기준 최신 확인 자료에서도 위 지정이 유지되고 있음을 재확인
- 서울 25개 구는 예외 없이 '전역' 지정이라 25개 구 전부 True/True
- 경기 12개 지역은 시(市) 전체가 아니라 특정 구 단위로 지정된 경우가 있음
  (예: 성남시는 분당·수정·중원구만 해당, 수원시는 영통·장안·팔달구만 해당)

⚠️ 법정동코드 5자리 중, 서울 25개 구는 기존 batch_collect.py의 SEOUL_ALL_GU와
   대조 확인된 값이라 신뢰도 높음. 경기 12개 지역 코드는 공개된 시군구코드표로
   대조했으나, 실제 국토부 실거래가 API 호출 결과로 최종 검증하는 걸 권장함
   (batch_collect.py 실행 시 200 정상 응답 + 실제 데이터가 오면 코드가 맞다는 뜻).

실행: python ingest/build_regulation_zones.py
"""
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import get_session
from app.property.model import RegulationZone
from sqlalchemy.dialects.postgresql import insert as pg_insert

# 서울 25개 구 — 전부 예외 없이 투기과열지구 + 조정대상지역
SEOUL_REGULATED = {
    "종로구": "11110", "중구": "11140", "용산구": "11170", "성동구": "11200",
    "광진구": "11215", "동대문구": "11230", "중랑구": "11260", "성북구": "11290",
    "강북구": "11305", "도봉구": "11320", "노원구": "11350", "은평구": "11380",
    "서대문구": "11410", "마포구": "11440", "양천구": "11470", "강서구": "11500",
    "구로구": "11530", "금천구": "11545", "영등포구": "11560", "동작구": "11590",
    "관악구": "11620", "서초구": "11650", "강남구": "11680", "송파구": "11710",
    "강동구": "11740",
}

# 경기도 12개 지역 — 전부 투기과열지구 + 조정대상지역 동시 지정 (2025.10.15 발표 기준)
# ⚠️ 코드 정확도: 서울보다 신뢰도 낮음(공개 코드표 대조, API 실호출 미검증) — 위 주석 참고
GYEONGGI_REGULATED = {
    "과천시": "41290",
    "광명시": "41210",
    "성남시 분당구": "41135",
    "성남시 수정구": "41131",
    "성남시 중원구": "41133",
    "수원시 영통구": "41117",
    "수원시 장안구": "41111",
    "수원시 팔달구": "41115",
    "안양시 동안구": "41173",
    "용인시 수지구": "41465",
    "의왕시": "41430",
    "하남시": "41450",
}


def upsert_zone(session, sgg_name: str, sgg_cd: str, speculation: bool, adjustment: bool):
    stmt = pg_insert(RegulationZone).values(
        sgg_cd=sgg_cd,
        sgg_name=sgg_name,
        is_speculation_overheated=speculation,
        is_adjustment_target=adjustment,
    )
    stmt = stmt.on_conflict_do_update(
        index_elements=["sgg_cd"],
        set_={
            "sgg_name": stmt.excluded.sgg_name,
            "is_speculation_overheated": stmt.excluded.is_speculation_overheated,
            "is_adjustment_target": stmt.excluded.is_adjustment_target,
        },
    )
    session.execute(stmt)


if __name__ == "__main__":
    session = get_session()
    count = 0

    for name, code in SEOUL_REGULATED.items():
        upsert_zone(session, name, code, speculation=True, adjustment=True)
        count += 1

    for name, code in GYEONGGI_REGULATED.items():
        upsert_zone(session, name, code, speculation=True, adjustment=True)
        count += 1

    session.commit()
    session.close()
    print(f"regulation_zones 테이블에 {count}개 지역 반영 완료 (서울 25 + 경기 12)")
    print("⚠️ 경기 12개 지역 코드는 실제 국토부 API 호출로 최종 검증 필요 (batch_collect.py 참고)")
