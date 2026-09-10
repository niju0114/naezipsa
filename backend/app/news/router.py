from fastapi import APIRouter, Query

from app.news.policy import fetch_latest_molit_policy, fetch_real_estate_news

router = APIRouter(prefix="/news", tags=["news"])


@router.get("/hot", summary="국토교통부 최신 부동산 정책 보도자료 조회")
def get_hot_policy_news():
    policy = fetch_latest_molit_policy()
    return {
        "status": "success",
        "count": 1 if policy else 0,
        "data": [policy] if policy else [],
    }


@router.get("", summary="부동산 뉴스 목록 조회")
def get_news(
    keyword: str = Query(default="부동산", min_length=1, max_length=50),
    limit: int = Query(default=10, ge=1, le=30),
):
    news_list = fetch_real_estate_news(keyword=keyword.strip(), limit=limit)
    return {"status": "success", "count": len(news_list), "data": news_list}
