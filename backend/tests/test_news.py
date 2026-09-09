from unittest.mock import Mock, patch

from app.news.policy.naver_news import fetch_real_estate_news


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
