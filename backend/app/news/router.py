from fastapi import APIRouter, Query

from app.news.policy import fetch_real_estate_news

router = APIRouter(prefix="/news", tags=["news"])


@router.get("", summary="부동산 뉴스 목록 조회")
def get_news(
    keyword: str = Query(default="부동산", min_length=1, max_length=50),
    limit: int = Query(default=10, ge=1, le=30),
):
    news_list = fetch_real_estate_news(keyword=keyword.strip(), limit=limit)
    return {"status": "success", "count": len(news_list), "data": news_list}
