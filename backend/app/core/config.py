"""환경변수를 한 곳에서 로드하는 설정 모듈.
다른 파일에서는 os.getenv를 직접 쓰지 않고 여기서 import해서 사용합니다.
"""
import os
from urllib.parse import unquote
from dotenv import load_dotenv

load_dotenv()  # .env 파일 로드


def _decode_if_encoded(key: str) -> str:
    """공공데이터포털 서비스키는 발급 화면에 URL 인코딩된 형태
    (예: %2F, %2B, %3D 포함)로 표시되는 경우가 많다.
    인코딩된 키를 그대로 requests에 넘기면, requests가 다시 한 번
    인코딩해버려서(이중 인코딩) API 호출이 실패한다.
    '%'가 포함되어 있으면 디코딩해서 원래 키로 되돌려 놓는다.
    """
    if "%" in key:
        return unquote(key)
    return key


MOLIT_API_KEY = _decode_if_encoded(os.getenv("MOLIT_API_KEY", ""))
KAKAO_API_KEY = os.getenv("KAKAO_API_KEY", "")
REB_API_KEY = os.getenv("REB_API_KEY", "")
KOSIS_API_KEY = os.getenv("KOSIS_API_KEY", "")
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
# 프론트엔드용(브라우저 노출 가능) / 백엔드용(노출 금지)으로 분리해서 관리한다.
# 현재 백엔드 코드는 둘 다 사용하지 않는다(REST API 대신 ORM으로 직접 접속).
# 프론트 담당자에게 넘겨줄 값이라 자리만 잡아둔 것이다.
SUPABASE_PUBLISHABLE_KEY = os.getenv("SUPABASE_PUBLISHABLE_KEY", "")
SUPABASE_SECRET_KEY = os.getenv("SUPABASE_SECRET_KEY", "")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

# Supabase가 발급한 JWT의 서명을 검증할 때 쓰는 비밀키.
# 대시보드 -> Project Settings -> API -> JWT Settings -> JWT Secret
# 접속용 값이 아니라 "토큰이 위조되지 않았는지" 대조하는 용도다.
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")

# ORM(SQLAlchemy)이 직접 DB에 접속할 때 쓰는 연결 문자열.
# Supabase 대시보드 -> Project Settings -> Database -> Connection string(URI)에서 확인.
# SUPABASE_URL/KEY(REST API용)와는 별개의 값이니 혼동하지 말 것.
DATABASE_URL = os.getenv("DATABASE_URL", "")

# 필수 키가 비어있으면 앱 시작 시점에 바로 알 수 있도록 경고
_required = {
    "MOLIT_API_KEY": MOLIT_API_KEY,
    "DATABASE_URL": DATABASE_URL,
}
_missing = [k for k, v in _required.items() if not v]
if _missing:
    print(f"[경고] .env에 다음 값이 비어있습니다: {', '.join(_missing)}")
