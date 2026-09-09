"""아이템(단지+평형) 분석 함수 모음.
raw_trades_sale/raw_trades_rent에서 데이터를 뽑아 계산하는 로직을 한 곳에 모았다.

주의: item_metrics_cache 배치가 아직 없어서, 지금은 요청 시점에 즉석 계산한다.
데이터가 많아지면 이 계산 결과를 item_metrics_cache에 미리 저장해두는 배치로
전환해야 한다 (다음 단계 작업).
"""
import statistics
from datetime import date
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.property.model import RawTradeSale, RawTradeRent, ComplexMaster, SizeMaster


def to_won(manwon_value):
    """만원 단위(DB 원본, 국토부 API 기준) -> 원 단위(팀 API 응답 규칙, 2026-09-08 확정)로 변환.
    DB에는 계속 만원으로 저장하고, API로 나가는 응답에서만 이 함수로 변환해서 내보낸다.
    """
    if manwon_value is None:
        return None
    return int(manwon_value) * 10000


def exclude_incomplete_recent(trades: list[RawTradeSale], months: int = 2) -> list[RawTradeSale]:
    """국토부 신고기한(30일) 때문에 최근 N개월 데이터는 신고가 덜 채워진 상태일 수 있다.
    실거래 추이·가격분포처럼 '정확한 시세'가 중요한 계산에서는 이 구간을 제외한다.
    (거래량 유동성은 '지금 활발한지'를 보는 지표라 여기 적용 안 함 — 팀 규칙표 기준)
    """
    today = date.today()
    cutoff = today.year * 12 + today.month - months
    return [t for t in trades if t.deal_year and t.deal_month and (t.deal_year * 12 + t.deal_month) <= cutoff]


def compute_price_per_pyeong(trades: list[RawTradeSale], pyeong: int | None) -> int | None:
    """평단가 = 최근 10건 실거래가 중앙값 ÷ 평수.
    2026-09-09 팀 확정: "아이템의 평단가 (최근 10건 실거래의 중앙값) / (아이템의 평형)"
    (기존엔 전체기간 중앙값을 썼으나, recent_median_price와 같은 기준으로 통일)
    B-03(아이템 기본지표)과 B-09(생활권 랭킹)가 같은 방식을 쓰도록 통일한 함수.
    """
    if not pyeong:
        return None
    recent_median = compute_recent_median_price(trades)
    if recent_median is None:
        return None
    return round(recent_median / pyeong)


def get_item_full_metrics(db: Session, size_id: int) -> dict:
    """AI 인사이트(AI-01)용 아이템 종합 지표. A가 /dashboard/insight에서 직접 호출.
    원본 거래 수백 건이 아니라, 이미 계산된 지표만 담아서 LLM에 넘기기 위한 재료.
    2026-09-09 프론트 요구사항 반영 통합.

    ⚠️ 이 함수가 반환하는 값은 전부 만원 단위(DB 원본)이다.
       원 단위 변환(to_won)은 이 함수를 호출하는 쪽(라우터/A)에서 필요에 맞게 적용할 것.
    """
    size, complex_ = _get_size_and_complex(db, size_id)
    if not size or not complex_:
        return {"error": "not_found", "size_id": size_id}

    sale_trades = get_trades_for_size(db, size_id)
    rents = get_rents_for_size(db, size_id, pure_jeonse_only=True)
    sale_trades_recent = exclude_incomplete_recent(sale_trades, months=2)

    # 기본정보
    price_per_pyeong = compute_price_per_pyeong(sale_trades, size.pyeong)

    # 시세추이 (매매/전세)
    sale_trend = compute_trend(sale_trades_recent) if sale_trades_recent else {"monthly_prices": [], "trend_direction": "표본 부족"}
    rent_trend = compute_rent_trend(rents)

    # 거래량 (3/12/36개월)
    liquidity_by_period = {
        p: compute_liquidity(sale_trades, rents, p) for p in (3, 12, 36)
    }

    # 전세매매갭
    jeonse_gap = compute_jeonse_gap(sale_trades, rents)

    # 생활권랭킹
    ranking = compute_ranking(db, size_id)

    return {
        "size_id": size_id,
        "basic": {
            "complex_name": complex_.apt_nm,
            "address": f"{complex_.umd_nm} {complex_.jibun}" if complex_.jibun else complex_.umd_nm,
            "build_year": complex_.build_year,
            "area": float(size.representative_area) if size.representative_area else None,
            "pyeong": size.pyeong,
            "recent_median_price": compute_recent_median_price(sale_trades),
            "price_per_pyeong": price_per_pyeong,
        },
        "trend": {
            "sale_monthly": sale_trend["monthly_prices"],
            "sale_direction": sale_trend["trend_direction"],
            "rent_monthly": rent_trend["monthly_prices"],
        },
        "liquidity": liquidity_by_period,
        "jeonse_gap": jeonse_gap,
        "ranking": ranking,
    }


def compute_recent_median_price(trades: list[RawTradeSale], n: int = 10) -> int | None:
    """최근 N건(기본 10건)의 중앙값. B-03/B-04/B-09에서 공통으로 쓰는 'recent_median_price' 정의.
    ✅ 2026-09-09 팀 확정: 평균이 아니라 중앙값. (예전엔 두 표가 서로 달라 모호했으나 확정됨)
    """
    valid = [t for t in trades if t.deal_amount and t.deal_year and t.deal_month]
    if not valid:
        return None
    valid.sort(key=lambda t: (t.deal_year, t.deal_month, t.deal_day or 0), reverse=True)
    recent = valid[:n]
    return round(statistics.median([t.deal_amount for t in recent]))


def compute_jeonse_gap(sale_trades: list[RawTradeSale], rents: list[RawTradeRent]) -> dict:
    """전세·매매 갭 (B-08).
    ✅ 2026-09-09 팀 확정 기준: "최근 3개월 내 10건에 대한 중앙값
       (3개월 내 실거래 10건 이하는 배제)"
    즉 최근 3개월로 먼저 자르고, 그 안에서 10건 미만이면 표본부족 처리.
    (이전엔 기간 제한 없이 3건 이상이면 계산했는데, 더 엄격한 기준으로 교체)
    """
    today = date.today()
    cutoff_ordinal = today.year * 12 + today.month - 3

    def in_last_3_months(year, month):
        if year is None or month is None:
            return False
        return year * 12 + month >= cutoff_ordinal

    recent_sale_prices = [
        t.deal_amount for t in sale_trades
        if t.deal_amount and in_last_3_months(t.deal_year, t.deal_month)
    ]
    recent_jeonse_prices = [
        r.deposit for r in rents
        if r.deposit and in_last_3_months(r.deal_year, r.deal_month)
    ]

    if len(recent_sale_prices) < 10 or len(recent_jeonse_prices) < 10:
        return {
            "sale_median": None, "jeonse_median": None,
            "gap_amount": None, "gap_ratio": None, "sample_insufficient": True,
        }

    sale_median = round(statistics.median(recent_sale_prices))
    jeonse_median = round(statistics.median(recent_jeonse_prices))
    gap_amount = sale_median - jeonse_median
    gap_ratio = round(jeonse_median / sale_median * 100, 1)

    return {
        "sale_median": sale_median, "jeonse_median": jeonse_median,
        "gap_amount": gap_amount, "gap_ratio": gap_ratio, "sample_insufficient": False,
    }


def _get_size_and_complex(db: Session, size_id: int):
    size = db.get(SizeMaster, size_id)
    if not size:
        return None, None
    complex_ = db.get(ComplexMaster, size.complex_id)
    return size, complex_


def get_trades_for_size(db: Session, size_id: int, exclude_canceled: bool = True):
    """이 평형(size_id)에 해당하는 매매 거래 목록.
    같은 단지 + 대표면적 ±1㎡ 이내로 매칭 (평형 그룹핑 때와 같은 기준).
    """
    size, complex_ = _get_size_and_complex(db, size_id)
    if not size or not complex_:
        return []

    lo, hi = float(size.representative_area) - 1.0, float(size.representative_area) + 1.0
    query = select(RawTradeSale).where(
        RawTradeSale.sgg_cd == complex_.sgg_cd,
        RawTradeSale.umd_nm == complex_.umd_nm,
        RawTradeSale.jibun == complex_.jibun,
        RawTradeSale.apt_nm == complex_.apt_nm,
        RawTradeSale.exclu_use_ar >= lo,
        RawTradeSale.exclu_use_ar <= hi,
    )
    if exclude_canceled:
        query = query.where(RawTradeSale.cdeal_type.is_(None))
    return db.execute(query).scalars().all()


def get_rents_for_size(db: Session, size_id: int, pure_jeonse_only: bool = True):
    """이 평형(size_id)에 해당하는 전월세 거래 목록."""
    size, complex_ = _get_size_and_complex(db, size_id)
    if not size or not complex_:
        return []

    lo, hi = float(size.representative_area) - 1.0, float(size.representative_area) + 1.0
    query = select(RawTradeRent).where(
        RawTradeRent.sgg_cd == complex_.sgg_cd,
        RawTradeRent.umd_nm == complex_.umd_nm,
        RawTradeRent.jibun == complex_.jibun,
        RawTradeRent.apt_nm == complex_.apt_nm,
        RawTradeRent.exclu_use_ar >= lo,
        RawTradeRent.exclu_use_ar <= hi,
    )
    rows = db.execute(query).scalars().all()
    if pure_jeonse_only:
        rows = [r for r in rows if r.monthly_rent == 0]
    return rows


def compute_trend(trades: list[RawTradeSale]) -> dict:
    """월별 중앙값 시세 + 추세(모멘텀) 계산. 선형회귀 slope를 직접 계산(numpy 없이)."""
    by_month: dict[tuple, list[int]] = {}
    for t in trades:
        if t.deal_year is None or t.deal_month is None or t.deal_amount is None:
            continue
        key = (t.deal_year, t.deal_month)
        by_month.setdefault(key, []).append(t.deal_amount)

    monthly = sorted(by_month.items())
    series = [
        {"year_month": f"{y}-{m:02d}", "median_price": round(statistics.median(prices))}
        for (y, m), prices in monthly
    ]

    if len(series) < 2:
        return {"monthly_prices": series, "momentum_score": None, "trend_direction": "표본 부족"}

    xs = list(range(len(series)))
    ys = [s["median_price"] for s in series]
    n = len(xs)
    x_mean = sum(xs) / n
    y_mean = sum(ys) / n
    numerator = sum((xs[i] - x_mean) * (ys[i] - y_mean) for i in range(n))
    denominator = sum((xs[i] - x_mean) ** 2 for i in range(n))
    slope = numerator / denominator if denominator else 0

    direction = "상승" if slope > 0 else ("하락" if slope < 0 else "보합")
    return {"monthly_prices": series, "momentum_score": round(slope, 1), "trend_direction": direction}


def compute_rent_trend(rents: list[RawTradeRent]) -> dict:
    """전세 시세 추이(월별 중앙값). 2026-09-09 프론트 요구사항 신규 반영.
    매매용 compute_trend와 로직은 같으나, 순수 전세(pure_jeonse_only)만 들어온다고 가정.
    """
    by_month: dict[tuple, list[int]] = {}
    for r in rents:
        if r.deal_year is None or r.deal_month is None or r.deposit is None:
            continue
        key = (r.deal_year, r.deal_month)
        by_month.setdefault(key, []).append(r.deposit)

    monthly = sorted(by_month.items())
    series = [
        {"year_month": f"{y}-{m:02d}", "median_price": round(statistics.median(prices))}
        for (y, m), prices in monthly
    ]
    return {"monthly_prices": series}


def compute_liquidity(sale_trades: list[RawTradeSale], rents: list[RawTradeRent], period_months: int) -> dict:
    """최근 N개월 기준 매매/전세 거래 건수.
    rents는 호출부(items.py)에서 이미 순수 전세(monthly_rent=0)만 필터링해서 넘겨준다고 가정.
    """
    today = date.today()
    cutoff_ordinal = today.year * 12 + today.month - period_months

    def in_period_sale(t):
        if t.deal_year is None or t.deal_month is None:
            return False
        return t.deal_year * 12 + t.deal_month >= cutoff_ordinal

    def in_period_rent(r):
        if r.deal_year is None or r.deal_month is None:
            return False
        return r.deal_year * 12 + r.deal_month >= cutoff_ordinal

    sale_count = sum(1 for t in sale_trades if in_period_sale(t))
    jeonse_count = sum(1 for r in rents if in_period_rent(r))
    return {"period_months": period_months, "sale_count": sale_count, "jeonse_count": jeonse_count}


def compute_price_distribution(trades: list[RawTradeSale]) -> dict:
    """층별 가격 분포 (B-07 명세: floor_groups + price_points 구조).
    건물 총 층수 데이터가 없어서, 해당 단지 거래 중 관측된 최고층을 근사값(프록시)으로 사용.
    ⚠️ 이 근사는 실제 건물 총 층수와 다를 수 있음 — 팀 논의 필요.
    """
    valid = [t for t in trades if t.floor is not None and t.deal_amount is not None and t.floor > 0]
    if not valid:
        return {"floor_groups": {}, "price_points": [], "note": "표본 없음"}

    max_floor_observed = max(t.floor for t in valid)  # 총 층수 근사값(프록시)

    # 저층 건물 예외: 관측 최고층이 5층 이하면 3단계로 나누는 게 무의미함 (빌라/저층 단지)
    if max_floor_observed <= 5:
        return {
            "floor_groups": {},
            "price_points": [
                {"floor": t.floor, "deal_amount": t.deal_amount,
                 "exclu_use_ar": float(t.exclu_use_ar) if t.exclu_use_ar is not None else None}
                for t in valid
            ],
            "note": f"저층 건물(관측 최고층 {max_floor_observed}층)이라 저/중/고층 분류를 적용하지 않음",
        }

    low_cut = max_floor_observed / 3
    mid_cut = max_floor_observed * 2 / 3

    def group_of(floor):
        if floor <= low_cut:
            return "저층"
        elif floor <= mid_cut:
            return "중층"
        return "고층"

    price_points = [
        {
            "floor": t.floor,
            "deal_amount": t.deal_amount,
            "exclu_use_ar": float(t.exclu_use_ar) if t.exclu_use_ar is not None else None,
            "group": group_of(t.floor),
        }
        for t in valid
    ]

    floor_groups: dict[str, dict] = {}
    for group_name in ["저층", "중층", "고층"]:
        group_prices = [p["deal_amount"] for p in price_points if p["group"] == group_name]
        floor_groups[group_name] = {
            "count": len(group_prices),
            "median_price": round(statistics.median(group_prices)) if group_prices else None,
        }

    return {
        "floor_groups": floor_groups,
        "price_points": price_points,
        "max_floor_observed_proxy": max_floor_observed,
        "note": "총 층수 실데이터가 없어 관측 최고층을 근사값으로 사용함",
    }


def compute_ranking(db: Session, size_id: int) -> dict:
    """같은 구 + 같은 평형(±5㎡) 내 평단가 랭킹."""
    size, complex_ = _get_size_and_complex(db, size_id)
    if not size or not complex_:
        return {"error": "not_found"}

    target_area = float(size.representative_area)
    lo, hi = target_area - 5, target_area + 5

    peer_sizes = db.execute(
        select(SizeMaster, ComplexMaster)
        .join(ComplexMaster, SizeMaster.complex_id == ComplexMaster.id)
        .where(
            ComplexMaster.sgg_cd == complex_.sgg_cd,
            SizeMaster.representative_area >= lo,
            SizeMaster.representative_area <= hi,
        )
    ).all()

    ranked = []
    for peer_size, peer_complex in peer_sizes:
        trades = get_trades_for_size(db, peer_size.id)
        price_per_pyeong = compute_price_per_pyeong(trades, peer_size.pyeong)
        if price_per_pyeong is None:
            continue
        ranked.append({
            "size_id": peer_size.id,
            "apt_nm": peer_complex.apt_nm,
            "price_per_pyeong": price_per_pyeong,
        })

    if not ranked:
        return {"error": "no_data"}

    ranked.sort(key=lambda x: x["price_per_pyeong"], reverse=True)
    total = len(ranked)
    my_rank = next((i + 1 for i, r in enumerate(ranked) if r["size_id"] == size_id), None)
    top = ranked[0]
    my_entry = next((r for r in ranked if r["size_id"] == size_id), None)

    return {
        "my_rank": my_rank,
        "total": total,
        "my_price_per_pyeong": my_entry["price_per_pyeong"] if my_entry else None,
        "top_complex": top["apt_nm"],
        "top_price_per_pyeong": top["price_per_pyeong"],
        # 2026-09-09 프론트 요구사항 신규: 같은 구 전체 단지의 평단가 배열
        "all_price_per_pyeong": [r["price_per_pyeong"] for r in ranked],
    }
