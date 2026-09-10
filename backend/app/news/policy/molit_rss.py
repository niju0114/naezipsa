"""국토교통부 보도자료 RSS에서 최신 부동산 정책 기사를 수집한다."""

from datetime import timezone
from email.utils import parsedate_to_datetime
from typing import Dict, List
from urllib.parse import urljoin
from xml.etree import ElementTree

import requests
from bs4 import BeautifulSoup
from fastapi import HTTPException

MOLIT_PRESS_RELEASE_RSS_URL = (
    "https://www.molit.go.kr/dev/board/board_rss.jsp?rss_id=NEWS"
)
MOLIT_BASE_URL = "https://www.molit.go.kr"
REAL_ESTATE_POLICY_KEYWORDS = (
    "주택",
    "주거",
    "부동산",
    "아파트",
    "청약",
    "전세",
    "월세",
    "임대",
    "토지",
    "재건축",
    "재개발",
)
HEADERS = {
    "Accept": "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
    "User-Agent": "Naejipsa/1.0 (+https://github.com/niju0114/naezipsa)",
}


def _element_text(item: ElementTree.Element, tag: str) -> str:
    element = item.find(tag)
    return (element.text or "").strip() if element is not None else ""


def _plain_text(value: str) -> str:
    return BeautifulSoup(value, "html.parser").get_text(" ", strip=True)


def _display_date(value: str) -> str:
    if not value:
        return ""
    try:
        published_at = parsedate_to_datetime(value)
        if published_at.tzinfo is None:
            published_at = published_at.replace(tzinfo=timezone.utc)
        return published_at.astimezone().strftime("%Y-%m-%d")
    except (TypeError, ValueError, OverflowError):
        return value


def _parse_policy_items(xml_content: bytes) -> List[Dict[str, str]]:
    try:
        root = ElementTree.fromstring(xml_content)
    except ElementTree.ParseError as exc:
        raise HTTPException(
            status_code=502,
            detail="국토교통부 RSS 응답을 해석하지 못했습니다.",
        ) from exc

    results: List[Dict[str, str]] = []
    for item in root.findall(".//item"):
        title = _plain_text(_element_text(item, "title"))
        description = _plain_text(_element_text(item, "description"))
        if not any(keyword in f"{title} {description}" for keyword in REAL_ESTATE_POLICY_KEYWORDS):
            continue

        link = urljoin(MOLIT_BASE_URL, _element_text(item, "link"))
        if not title or not link:
            continue

        results.append(
            {
                "title": title,
                "link": link,
                "press": "국토교통부",
                "summary": description,
                "date": _display_date(_element_text(item, "pubDate")),
                "source": "molit_rss",
            }
        )
    return results


def fetch_latest_molit_policy() -> Dict[str, str] | None:
    """최신순 RSS에서 부동산 정책 키워드가 포함된 첫 보도자료를 반환한다."""
    try:
        response = requests.get(
            MOLIT_PRESS_RELEASE_RSS_URL,
            headers=HEADERS,
            timeout=7,
        )
        response.raise_for_status()
    except requests.RequestException as exc:
        raise HTTPException(
            status_code=502,
            detail="국토교통부 정책 데이터를 가져오는 데 실패했습니다.",
        ) from exc

    items = _parse_policy_items(response.content)
    return items[0] if items else None
