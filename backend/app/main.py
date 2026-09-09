"""FastAPI 앱 진입점.
실행: uvicorn app.main:app --reload
확인: http://localhost:8000/docs
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.errors import register_exception_handlers
from app.dashboard import router as dashboard_router
from app.news import router as news_router
from app.property.routers import complexes, items, macro, search
from app.user import router as user_router

app = FastAPI(title="부동산 실거래 대시보드 API")

# 오류 응답 형식을 {"error": {code, message, details}} 하나로 통일한다.
# A/B 라우터가 같은 앱에서 도니까 프론트가 오류를 한 가지 방법으로 처리할 수 있다.
# 2026-09-09 팀 확정. 프론트가 이미 이 형식으로 붙고 있으므로 바꾸지 않는다.
# 형식과 code 목록은 app/core/errors.py 참고.
register_exception_handlers(app)

# 프론트엔드(Next.js 등)에서 호출 가능하도록 CORS 허용
# 배포 시에는 allow_origins를 실제 프론트 도메인으로 좁히는 것을 권장
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(search.router, prefix="/api/v1")
app.include_router(complexes.router, prefix="/api/v1")
app.include_router(items.router, prefix="/api/v1")
app.include_router(macro.router, prefix="/api/v1")
app.include_router(news_router.router, prefix="/api/v1")

# A 담당: 프로필/후보매물/대시보드 (로그인 필요)
app.include_router(user_router.router, prefix="/api/v1")
app.include_router(dashboard_router.router, prefix="/api/v1")


@app.get("/")
def health_check():
    return {"status": "ok", "message": "부동산 실거래 대시보드 API 서버 정상 동작 중"}
