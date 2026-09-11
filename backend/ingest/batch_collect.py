"""전체 대상 지역 x 기간에 대해 국토부 API를 반복 호출해서
raw_trades_sale, raw_trades_rent 테이블에 적재하는 배치 스크립트.

SQLAlchemy ORM으로 적재한다 (supabase-py REST 클라이언트 미사용).

실행 전 확인할 것:
1. .env에 MOLIT_API_KEY, DATABASE_URL이 채워져 있는지
2. ingest/create_tables.py를 먼저 실행해서 테이블이 만들어져 있는지
3. 아래 TARGET_SGG_CODES를 팀이 확정한 지역 코드로 바꿨는지

실행 방법: python ingest/batch_collect.py
"""
import sys
import os
from datetime import date

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.property.external.molit_api import fetch_sale_trades_all, fetch_rent_trades_all
from app.core.database import get_session
from app.property.model import RawTradeSale, RawTradeRent
from sqlalchemy.dialects.postgresql import insert as pg_insert

SEOUL_ALL_GU = {
    "종로구": "11110", "중구": "11140", "용산구": "11170", "성동구": "11200",
    "광진구": "11215", "동대문구": "11230", "중랑구": "11260", "성북구": "11290",
    "강북구": "11305", "도봉구": "11320", "노원구": "11350", "은평구": "11380",
    "서대문구": "11410", "마포구": "11440", "양천구": "11470", "강서구": "11500",
    "구로구": "11530", "금천구": "11545", "영등포구": "11560", "동작구": "11590",
    "관악구": "11620", "서초구": "11650", "강남구": "11680", "송파구": "11710",
    "강동구": "11740",
}

# 2026-09-10 경기도 확장: 규제지역(투기과열지구+조정대상지역) 12개 지역.
# ⚠️ 코드 정확도: 공개 시군구코드표로 대조했으나 서울만큼 검증 안 됨.
#    이번 실행에서 특정 지역만 0건 나오면, 그 지역 코드가 틀렸을 가능성이 큼 —
#    코드를 다시 확인해서 고치고 재실행할 것.
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

# ⚠️ 경기도 신규 수집은 서울 25개 구 x 5년치와 맞먹는 추가 부담(12개 지역 x 60개월 x 2 API
#    = 최소 1,440번 호출)이 생긴다. Supabase 무료 요금제 Disk IO 경고를 이미 받은 적 있으니,
#    한 번에 다 돌리지 말고 아래 스위치로 필요할 때만 켜서 나눠 돌리는 걸 권장.
INCLUDE_GYEONGGI = True  # 경기도까지 같이 수집하려면 True, 서울만 하려면 False

TARGET_SGG_CODES = list(SEOUL_ALL_GU.values())
if INCLUDE_GYEONGGI:
    TARGET_SGG_CODES += list(GYEONGGI_REGULATED.values())

# 주의: 5년치를 수집해도 아래 필드들은 시작 시점이 더 짧아서 과거 구간엔 값이 비어있는 게 정상.
# - 계약해제(cdealType): 2020.02~
# - 거래유형(dealingGbn): 2021.11~
# - 등기일자(rgstDate, 이 테이블엔 미포함): 2023.01~


def recent_months(n: int) -> list[str]:
    today = date.today()
    months = []
    y, m = today.year, today.month
    for _ in range(n):
        months.append(f"{y}{m:02d}")
        m -= 1
        if m == 0:
            m = 12
            y -= 1
    return list(reversed(months))


TARGET_DEAL_YMD_LIST = recent_months(36)  # 최근 3년(36개월) 자동 생성 — 최대 수집 범위 (2026-09-11 용량 문제로 축소)


def collect_sale_data():
    total = 0
    failed = []
    with get_session() as session:
        for sgg in TARGET_SGG_CODES:
            for ymd in TARGET_DEAL_YMD_LIST:
                try:
                    items = fetch_sale_trades_all(sgg, ymd)
                except Exception as e:
                    print(f"[매매] {sgg}/{ymd}: 호출 실패({e}) → 건너뛰고 계속 진행")
                    failed.append(("sale", sgg, ymd))
                    continue
                rows = [
                    {
                        "sgg_cd": sgg,
                        "umd_nm": item.get("umdNm"),
                        "jibun": item.get("jibun"),
                        "apt_nm": item.get("aptNm"),
                        "build_year": _to_int(item.get("buildYear")),
                        "exclu_use_ar": _to_float(item.get("excluUseAr")),
                        "floor": _to_int(item.get("floor")),
                        "deal_amount": _to_int(item.get("dealAmount")),
                        "deal_year": _to_int(item.get("dealYear")),
                        "deal_month": _to_int(item.get("dealMonth")),
                        "deal_day": _to_int(item.get("dealDay")),
                        "dealing_gbn": item.get("dealingGbn"),
                        "cdeal_type": item.get("cdealType"),
                        "cdeal_day": item.get("cdealDay"),
                    }
                    for item in items
                ]
                if rows:
                    try:
                        # 중복(같은 거래가 이미 있으면) 무시하고 넘어감 — 여러 번 실행해도 안전
                        stmt = pg_insert(RawTradeSale).values(rows)
                        stmt = stmt.on_conflict_do_nothing(constraint="uq_raw_trade_sale_natural_key")
                        session.execute(stmt)
                        session.commit()
                        total += len(rows)
                    except Exception as e:
                        session.rollback()
                        print(f"[매매] {sgg}/{ymd}: 저장 실패({e}) → 건너뛰고 계속 진행")
                        failed.append(("sale", sgg, ymd))
                        continue
                print(f"[매매] {sgg}/{ymd}: {len(rows)}건 적재")
    print(f"매매 데이터 총 {total}건 적재 완료")
    if failed:
        print(f"⚠️ 실패해서 건너뛴 것: {len(failed)}건 → {failed[:10]}{'...' if len(failed) > 10 else ''}")
        print("   나중에 이 스크립트를 그냥 다시 실행하면 이미 받은 건 중복 없이 건너뛰고, 실패했던 것만 다시 시도됩니다.")


def collect_rent_data():
    total = 0
    failed = []
    with get_session() as session:
        for sgg in TARGET_SGG_CODES:
            for ymd in TARGET_DEAL_YMD_LIST:
                try:
                    items = fetch_rent_trades_all(sgg, ymd)
                except Exception as e:
                    print(f"[전월세] {sgg}/{ymd}: 호출 실패({e}) → 건너뛰고 계속 진행")
                    failed.append(("rent", sgg, ymd))
                    continue
                rows = [
                    {
                        "sgg_cd": sgg,
                        "umd_nm": item.get("umdNm"),
                        "jibun": item.get("jibun"),
                        "apt_nm": item.get("aptNm"),
                        "exclu_use_ar": _to_float(item.get("excluUseAr")),
                        "floor": _to_int(item.get("floor")),
                        "deposit": _to_int(item.get("deposit")),
                        "monthly_rent": _to_int(item.get("monthlyRent")),
                        "deal_year": _to_int(item.get("dealYear")),
                        "deal_month": _to_int(item.get("dealMonth")),
                        "contract_type": item.get("contractType"),
                    }
                    for item in items
                ]
                if rows:
                    try:
                        stmt = pg_insert(RawTradeRent).values(rows)
                        stmt = stmt.on_conflict_do_nothing(constraint="uq_raw_trade_rent_natural_key")
                        session.execute(stmt)
                        session.commit()
                        total += len(rows)
                    except Exception as e:
                        session.rollback()
                        print(f"[전월세] {sgg}/{ymd}: 저장 실패({e}) → 건너뛰고 계속 진행")
                        failed.append(("rent", sgg, ymd))
                        continue
                print(f"[전월세] {sgg}/{ymd}: {len(rows)}건 적재")
    print(f"전월세 데이터 총 {total}건 적재 완료")
    if failed:
        print(f"⚠️ 실패해서 건너뛴 것: {len(failed)}건 → {failed[:10]}{'...' if len(failed) > 10 else ''}")


def _to_int(value) -> int | None:
    if value is None:
        return None
    try:
        return int(str(value).replace(",", "").strip())
    except ValueError:
        return None


def _to_float(value) -> float | None:
    if value is None:
        return None
    try:
        return float(str(value).strip())
    except ValueError:
        return None


if __name__ == "__main__":
    region_desc = "서울 25개 구" + (" + 경기 12개 지역" if INCLUDE_GYEONGGI else "")
    print(f"대상 지역: {region_desc} 전체 ({len(TARGET_SGG_CODES)}개)")
    print(f"대상 기간: {TARGET_DEAL_YMD_LIST[0]} ~ {TARGET_DEAL_YMD_LIST[-1]} (총 {len(TARGET_DEAL_YMD_LIST)}개월, 최대 5년 수집)")
    print("※ SQLAlchemy ORM으로 적재합니다 (Supabase REST API 미사용).")
    print(f"※ {len(TARGET_SGG_CODES)}개 구 x {len(TARGET_DEAL_YMD_LIST)}개월 x 2개 API = 최소 {len(TARGET_SGG_CODES)*len(TARGET_DEAL_YMD_LIST)*2}번 호출 예상")
    print("※ 시간이 오래 걸리고 트래픽 제한에 걸릴 수 있습니다. 중간에 실패해도 계속 진행되며,")
    print("※ 나중에 이 스크립트를 다시 실행하면 실패했던 부분만 이어서 재시도됩니다.")
    if INCLUDE_GYEONGGI:
        print("⚠️ 경기도 지역코드는 서울만큼 검증되지 않았습니다. 실행 후 특정 지역만 0건이면 코드를 재확인하세요.")
    print("=== 배치 수집 시작 ===")
    collect_sale_data()
    collect_rent_data()
    print("=== 배치 수집 완료 ===")
    print("\n다음 단계: python ingest/build_complex_master.py → build_size_master.py → compute_metrics.py 순서로 실행하세요.")
