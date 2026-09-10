"""네이버 뉴스 검색 결과에서 부동산 뉴스를 수집한다."""

import re
from typing import Dict, List

import requests
from bs4 import BeautifulSoup
from fastapi import HTTPException

NAVER_NEWS_URL = "https://search.naver.com/search.naver"
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    )
}


def _text(element, default: str = "") -> str:
    return element.get_text(" ", strip=True) if element else default


def _content_text(element, default: str = "") -> str:
    return _text(element, default).removesuffix("새 창 열림").strip()


def _new_layout_items(soup: BeautifulSoup):
    """2026년 네이버 검색 마크업에서 제목과 해당 뉴스 카드 쌍을 찾는다."""
    for title_tag in soup.select('a[data-heatmap-target=".tit"]'):
        item = title_tag.parent
        while item and not item.select_one(".sds-comps-profile-info-title-text"):
            item = item.parent
        if item:
            yield item, title_tag


def fetch_real_estate_news(keyword: str = "부동산", limit: int = 10) -> List[Dict[str, str]]:
    """네이버 뉴스 검색 결과를 최신순으로 가져온다."""
    try:
        response = requests.get(
            NAVER_NEWS_URL,
            params={"where": "news", "query": keyword, "sort": "1"},
            headers=HEADERS,
            timeout=7,
        )
        response.raise_for_status()
    except requests.RequestException as exc:
        raise HTTPException(
            status_code=502,
            detail=f"뉴스 데이터를 가져오는 데 실패했습니다: {exc}",
        ) from exc

    soup = BeautifulSoup(response.text, "html.parser")
    results: List[Dict[str, str]] = []
    seen_links = set()
    old_items = [(item, item.select_one("a.news_tit")) for item in soup.select("ul.list_news > li")]
    news_items = old_items or list(_new_layout_items(soup))

    for item, title_tag in news_items:
        if len(results) >= limit:
            break

        if not title_tag:
            continue

        link = title_tag.get("href", "")
        if not link or link in seen_links:
            continue

        info_tags = item.select("span.info, .sds-comps-profile-info-subtext")
        date = next(
            (
                _text(tag)
                for tag in info_tags
                if re.fullmatch(r"(?:\d+분 전|\d+시간 전|\d+일 전|\d{4}\.\d{2}\.\d{2}\.)", _text(tag))
            ),
            "",
        )
        press_tag = item.select_one("a.info.press, span.sds-comps-profile-info-title-text")
        summary_tag = item.select_one('div.news_dsc, a[data-heatmap-target=".body"]')
        headline_tag = title_tag.select_one(".sds-comps-text-type-headline1")
        press = _text(press_tag, "알 수 없음")
        press = press.replace("언론사 선정", "").replace("새 창 열림", "").strip()

        results.append(
            {
                "title": title_tag.get("title") or _text(headline_tag or title_tag).replace("새 창 열림", "").strip(),
                "link": link,
                "press": press,
                "summary": _content_text(summary_tag),
                "date": date,
            }
        )
        seen_links.add(link)

    return results
