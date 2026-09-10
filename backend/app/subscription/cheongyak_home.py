"""청약홈(한국부동산원) 분양정보 조회 서비스 연동.

odcloud 기반 API. Swagger 명세 + 실제 호출로 검증 완료 (2026-09-09).
공공데이터포털 데이터셋: https://www.data.go.kr/data/15098547/openapi.do
"""

import os
from datetime import datetime
from typing import Dict, List, Optional
from urllib.parse import unquote

import requests
from dotenv import load_dotenv

load_dotenv()

BASE_URL = "https://api.odcloud.kr/api"
OPERATION_PATH = "ApplyhomeInfoDetailSvc/v1/getAPTLttotPblancDetail"

SERVICE_KEY = unquote(os.getenv("APPLYHOME_API_KEY", ""))

FIELD_MAP = {
    "announcement_no": "HOUSE_MANAGE_NO",
    "house_name": "HOUSE_NM",
    "region": "SUBSCRPT_AREA_CODE_NM",
    "address": "HSSPLY_ADRES",
    "announced_at": "RCRIT_PBLANC_DE",
    "source_url": "PBLANC_URL",
}


class SubscriptionFetchError(Exception):
    """청약 정보 수집 중 발생한 오류. 라우터 계층에서 HTTPException으로 변환한다."""


def _parse_date(raw: str) -> str:
    try:
        return datetime.strptime(raw, "%Y-%m-%d").strftime("%Y-%m-%d")
    except (ValueError, TypeError):
        return raw or ""


def fetch_recent_announcements(
    region: Optional[str] = None, limit: int = 3
) -> List[Dict[str, str]]:
    """최근 분양 공고를 모집공고일 최신순으로 가져온다.

    region: 공급지역명으로 필터링 (예: "충남", "서울"). None이면 전체.
    limit: 반환할 최대 개수.
    """
    if not SERVICE_KEY:
        raise SubscriptionFetchError(
            "APPLYHOME_API_KEY가 설정되지 않았습니다. .env 파일을 확인하세요."
        )

    try:
        response = requests.get(
            f"{BASE_URL}/{OPERATION_PATH}",
            params={
                "serviceKey": SERVICE_KEY,
                "page": 1,
                "perPage": 50,
            },
            timeout=7,
        )
        response.raise_for_status()
    except requests.RequestException as exc:
        raise SubscriptionFetchError(f"청약 정보를 가져오는 데 실패했습니다: {exc}") from exc

    try:
        items = response.json()["data"]
    except (KeyError, TypeError, ValueError) as exc:
        raise SubscriptionFetchError(
            f"응답 형식이 예상과 다릅니다. 필드 매핑을 확인하세요: {exc}"
        ) from exc

    normalized = []
    for item in items:
        region_name = item.get(FIELD_MAP["region"], "")
        if region and region not in region_name:
            continue
        normalized.append(
            {
                "announcement_no": item.get(FIELD_MAP["announcement_no"], ""),
                "house_name": item.get(FIELD_MAP["house_name"], ""),
                "region": region_name,
                "address": item.get(FIELD_MAP["address"], ""),
                "announced_at": _parse_date(item.get(FIELD_MAP["announced_at"], "")),
                "source_url": item.get(FIELD_MAP["source_url"], ""),
            }
        )

    normalized.sort(key=lambda x: x["announced_at"], reverse=True)
    return normalized[:limit]