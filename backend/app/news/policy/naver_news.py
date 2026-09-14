"""네이버 뉴스 검색 결과에서 부동산 뉴스를 수집한다."""

import re
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
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


# 제목의 주제와 국내 근거를 함께 확인한다. 요약에 우연히 등장한 "부동산"은 제외한다.
HOUSING_TERMS = re.compile(r"부동산|아파트|주택|전세|월세|청약|분양|재건축|재개발|집값|주거|임대|전월세|매매")
DOMESTIC_TERMS = re.compile(r"국내|한국|우리나라|서울|경기|인천|부산|대구|대전|광주|울산|세종|강원|충북|충남|충청|전북|전남|전라|경북|경남|경상|제주|수도권|국토부|국토교통부|한국부동산원|수원|성남|용인|화성|고양|과천|분당|강남|송파|서초|노원|마포|성동|동작|관악|영등포|강동|강서|은평|광명|하남|남양주|평택|안양|안산|시흥|김포|파주|청주|천안|전주|창원|포항|김해|양산")
FOREIGN_TERMS = re.compile(r"미국|중국|일본|해외|뉴욕|도쿄|홍콩|싱가포르|베트남|유럽|영국|런던|두바이|호주|캐나다")
CRYPTO_TERMS = re.compile(r"가상자산|암호화폐|비트코인|블록체인|토큰|BNB|RWA|크립토", re.I)


def _is_domestic_housing(title, summary):
    if not HOUSING_TERMS.search(title) or CRYPTO_TERMS.search(title):
        return False
    if FOREIGN_TERMS.search(title) and not DOMESTIC_TERMS.search(title):
        return False
    return bool(DOMESTIC_TERMS.search(f"{title} {summary}"))


def _publication_time(value, now):
    relative = re.fullmatch(r"(\d+)(분|시간|일) 전", value or "")
    if relative:
        amount, unit = relative.groups()
        return now - timedelta(seconds=int(amount) * {"분": 60, "시간": 3600, "일": 86400}[unit])
    for fmt in ("%Y.%m.%d.", "%Y-%m-%d"):
        try:
            return datetime.strptime(value, fmt).replace(tzinfo=now.tzinfo)
        except (ValueError, TypeError):
            pass
    return None


def deduplicate_news(items, now=None):
    """제목의 서로 다른 단어 3개 이상이 겹치면 먼저 게시된 수집 기사를 남긴다."""
    now = now or datetime.now(ZoneInfo("Asia/Seoul"))
    indexed = [(item, _publication_time(item.get("date"), now), index) for index, item in enumerate(items)]
    indexed.sort(key=lambda row: (row[1] is None, row[1] or now, row[2]))
    kept = []
    for item, published, index in indexed:
        words = set(re.findall(r"[가-힣a-z0-9]+", item["title"].lower()))
        if any(item["link"] == other[0]["link"] or len(words & other[3]) >= 3 for other in kept):
            continue
        kept.append((item, published, index, words))
    # 다른 주제끼리는 기존 최신 뉴스 순서를 유지한다.
    kept.sort(key=lambda row: row[2])
    return [row[0] for row in kept]


def _fetch_news_page(keyword, start):
    """네이버 뉴스 검색 결과를 최신순으로 가져온다."""
    try:
        response = requests.get(
            NAVER_NEWS_URL,
            params={"where": "news", "query": f"{keyword} 아파트", "sort": "1", "start": start},
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

        title = title_tag.get("title") or _text(headline_tag or title_tag).replace("새 창 열림", "").strip()
        summary = _content_text(summary_tag)
        if not _is_domestic_housing(title, summary):
            continue

        results.append(
            {
                "title": title,
                "link": link,
                "press": press,
                "summary": summary,
                "date": date,
            }
        )
        seen_links.add(link)

    return results


def fetch_real_estate_news(keyword: str = "부동산", limit: int = 10) -> List[Dict[str, str]]:
    """날짜 제한 없이 최대 5페이지를 조회해 중복 제거 후 요청 개수를 채운다."""
    collected = []
    seen = set()
    for start in (1, 11, 21, 31, 41):
        try:
            page = _fetch_news_page(keyword, start)
        except HTTPException:
            if collected:
                break
            raise
        fresh = [item for item in page if item["link"] not in seen]
        collected.extend(fresh)
        seen.update(item["link"] for item in fresh)
        unique = deduplicate_news(collected)
        if len(unique) >= limit:
            return unique[:limit]
        if page and not fresh:
            break
    return deduplicate_news(collected)[:limit]
