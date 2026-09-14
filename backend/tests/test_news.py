from unittest.mock import Mock, patch

import pytest
from fastapi import HTTPException
from requests import RequestException

from app.news.policy.naver_news import fetch_real_estate_news
from app.news.policy.molit_rss import fetch_latest_molit_policy


def test_fetch_real_estate_news_parses_title_summary_date_and_press():
    response = Mock(
        text="""
        <ul class="list_news">
          <li>
            <a class="news_tit" title="서울 아파트 소식" href="https://example.com/news">제목</a>
            <a class="info press">테스트일보 언론사 선정</a>
            <span class="info">2시간 전</span>
            <div class="news_dsc">부동산 뉴스 요약입니다.</div>
          </li>
        </ul>
        """
    )
    response.raise_for_status.return_value = None

    with patch("app.news.policy.naver_news.requests.get", return_value=response):
        result = fetch_real_estate_news(keyword="부동산 정책", limit=1)

    assert result[0] == {
        "title": "서울 아파트 소식",
        "link": "https://example.com/news",
        "press": "테스트일보",
        "summary": "부동산 뉴스 요약입니다.",
        "date": "2시간 전",
    }


def test_fetch_latest_molit_policy_returns_first_real_estate_policy_item():
    response = Mock(
        content="""<?xml version=\"1.0\" encoding=\"UTF-8\"?>
        <rss version=\"2.0\"><channel>
          <item>
            <title>고속도로 교통안전 대책</title>
            <link>https://www.molit.go.kr/traffic</link>
            <description>교통 분야 보도자료</description>
            <pubDate>Tue, 08 Sep 2026 09:00:00 +0900</pubDate>
          </item>
          <item>
            <title>청년 주거 지원을 확대합니다</title>
            <link>/USR/NEWS/m_71/dtl.jsp?id=1</link>
            <description><![CDATA[<b>주택 정책</b> 보도자료입니다.]]></description>
            <pubDate>Mon, 07 Sep 2026 10:00:00 +0900</pubDate>
          </item>
        </channel></rss>""".encode("utf-8")
    )
    response.raise_for_status.return_value = None

    with patch("app.news.policy.molit_rss.requests.get", return_value=response):
        result = fetch_latest_molit_policy()

    assert result == {
        "title": "청년 주거 지원을 확대합니다",
        "link": "https://www.molit.go.kr/USR/NEWS/m_71/dtl.jsp?id=1",
        "press": "국토교통부",
        "summary": "주택 정책 보도자료입니다.",
        "date": "2026-09-07",
        "source": "molit_rss",
        "is_policy_match": True,
    }


def test_fetch_latest_molit_policy_falls_back_to_latest_official_item():
    response = Mock(
        content="""<?xml version="1.0" encoding="UTF-8"?>
        <rss version="2.0"><channel><item>
          <title>고속도로 교통안전 대책</title>
          <link>https://www.molit.go.kr/traffic</link>
          <description>교통 분야 보도자료</description>
          <pubDate>Tue, 08 Sep 2026 09:00:00 +0900</pubDate>
        </item></channel></rss>""".encode("utf-8")
    )
    response.raise_for_status.return_value = None

    with patch("app.news.policy.molit_rss.requests.get", return_value=response):
        result = fetch_latest_molit_policy()

    assert result["title"] == "고속도로 교통안전 대책"
    assert result["is_policy_match"] is False


def test_fetch_latest_molit_policy_reports_rss_failure():
    with patch(
        "app.news.policy.molit_rss.requests.get",
        side_effect=RequestException("RSS unavailable"),
    ), pytest.raises(HTTPException) as exc_info:
        fetch_latest_molit_policy()

    assert exc_info.value.status_code == 502


@pytest.mark.parametrize("title,summary,expected", [
    ("미국 가계 주식 비중 증가", "부동산 가치 증가", False),
    ("BNB체인 RWA 증가폭 1위", "국내 부동산 토큰", False),
    ("뉴욕 아파트 가격 상승", "한국 투자자 관심", False),
    ("서울 아파트 전세 상승", "", True),
    ("미국 금리 인하에 서울 집값 영향", "", True),
    ("아파트 공급 확대", "국토교통부 발표", True),
])
def test_domestic_housing_filter(title, summary, expected):
    from app.news.policy.naver_news import _is_domestic_housing
    assert _is_domestic_housing(title, summary) is expected


def test_duplicate_titles_keep_earliest_publication():
    from app.news.policy.naver_news import deduplicate_news
    items = [
        {"title": "서울 아파트 가격 상승 오늘", "link": "new", "date": "10분 전"},
        {"title": "서울 아파트 가격 하락 어제", "link": "old", "date": "2시간 전"},
        {"title": "부산 신규 청약 공고", "link": "other", "date": "5분 전"},
    ]
    assert [item["link"] for item in deduplicate_news(items)] == ["old", "other"]


def test_duplicate_filter_counts_distinct_words_not_repetition():
    from app.news.policy.naver_news import deduplicate_news
    items = [{"title": title, "link": str(index), "date": ""} for index, title in enumerate(["서울 서울 아파트", "서울 아파트 청약"])]
    assert len(deduplicate_news(items)) == 2


def test_news_backfills_from_older_pages():
    from app.news.policy.naver_news import fetch_real_estate_news
    pages = [[{"title": title, "link": str(index), "date": "2026-09-01"}] for index, title in enumerate(["서울 아파트 매매", "부산 주택 공급", "인천 전세 계약", "경기 청약 일정"])]
    with patch("app.news.policy.naver_news._fetch_news_page", side_effect=pages) as fetch:
        items = fetch_real_estate_news(limit=4)
    assert len(items) == 4
    assert fetch.call_args.args[1] == 31
