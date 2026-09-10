from fastapi import APIRouter, HTTPException, Query

from app.subscription import fetch_recent_announcements, SubscriptionFetchError

router = APIRouter(prefix="/subscription", tags=["subscription"])


@router.get("", summary="청약 소식 목록 조회")
def get_subscription_news(
    region: str | None = Query(default=None, max_length=20),
    limit: int = Query(default=4, ge=1, le=30),
):
    try:
        items = fetch_recent_announcements(region=region, limit=limit)
    except SubscriptionFetchError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return {"status": "success", "count": len(items), "data": items}
