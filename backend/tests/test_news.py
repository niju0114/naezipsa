from unittest.mock import Mock, patch

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
    }
