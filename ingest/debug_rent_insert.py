"""전월세 삽입이 왜 실패하는지 정확한 에러 원문을 보기 위한 진단 스크립트.
딱 1개 지역·1개월만 가져와서 저장을 시도하고, 실패하면 전체 에러를 그대로 출력한다.

실행: python ingest/debug_rent_insert.py
"""
import sys
import os
import traceback

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.molit_api import fetch_rent_trades_all
from app.database import get_session
from app.db_models import RawTradeRent
from sqlalchemy.dialects.postgresql import insert as pg_insert


def debug():
    sgg = "11110"  # 종로구
    ymd = "202110"

    print(f"1. API 호출 시도: {sgg}/{ymd}")
    try:
        items = fetch_rent_trades_all(sgg, ymd)
        print(f"   성공: {len(items)}건 받아옴")
    except Exception:
        print("   ❌ API 호출 자체에서 실패:")
        traceback.print_exc()
        return

    if not items:
        print("   ⚠️ 받아온 데이터가 0건이라 저장 테스트 불가")
        return

    print(f"\n2. 첫 번째 원본 데이터 확인:")
    print(f"   {items[0]}")

    def _to_int(v):
        if v is None:
            return None
        try:
            return int(str(v).replace(",", "").strip())
        except ValueError:
            return None

    def _to_float(v):
        if v is None:
            return None
        try:
            return float(str(v).strip())
        except ValueError:
            return None

    row = {
        "sgg_cd": sgg,
        "umd_nm": items[0].get("umdNm"),
        "jibun": items[0].get("jibun"),
        "apt_nm": items[0].get("aptNm"),
        "exclu_use_ar": _to_float(items[0].get("excluUseAr")),
        "floor": _to_int(items[0].get("floor")),
        "deposit": _to_int(items[0].get("deposit")),
        "monthly_rent": _to_int(items[0].get("monthlyRent")),
        "deal_year": _to_int(items[0].get("dealYear")),
        "deal_month": _to_int(items[0].get("dealMonth")),
        "contract_type": items[0].get("contractType"),
    }
    print(f"\n3. 변환된 저장용 데이터: {row}")

    print(f"\n4. DB 저장 시도...")
    try:
        with get_session() as session:
            stmt = pg_insert(RawTradeRent).values([row])
            stmt = stmt.on_conflict_do_nothing(constraint="uq_raw_trade_rent_natural_key")
            session.execute(stmt)
            session.commit()
        print("   ✅ 저장 성공!")
    except Exception:
        print("   ❌ 저장 실패 — 아래가 진짜 에러 원문입니다:")
        traceback.print_exc()


if __name__ == "__main__":
    debug()
