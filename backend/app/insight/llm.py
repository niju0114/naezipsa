"""[insight] llm — LLM 제공자를 감싸는 얇은 층.

흐름   service ▶ ★llm ▶ 외부 LLM API
소유   A (대시보드 담당)

이 파일만 제공자를 안다. service.py는 "질문을 주면 JSON을 준다" 정도만 알면 된다.
팀 명세가 "AI 공급자: 명세는 기술 중립적으로 작성"이라고 했으므로,
나중에 다른 제공자로 바꿀 때 이 파일 하나만 고치면 되게 분리했다.

현재 구현: Google Gemini (.env의 GEMINI_API_KEY)
"""
import json
import logging

import requests

from app.core.config import GEMINI_API_KEY

logger = logging.getLogger(__name__)

# 모델 이름은 제공자가 주기적으로 바꾼다. 404가 나면 응답 메시지에
# 후속 모델 이름이 안내되므로 그걸로 교체하면 된다.
_MODEL = "gemini-3.6-flash"
_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{_MODEL}:generateContent"

# 사용자가 기다리는 화면이라 무한정 기다릴 수 없다.
# 후보 6개 분석에 보통 5~10초가 걸린다.
_TIMEOUT_SECONDS = 30


class LLMUnavailable(RuntimeError):
    """LLM을 부를 수 없거나 응답이 쓸 수 없는 형태일 때.

    호출한 쪽이 503으로 바꿔서 "잠시 후 다시" 안내하도록 한다.
    분석 실패로 대시보드 전체가 죽으면 안 된다.
    """


def is_configured() -> bool:
    """API 키가 있는지. 라우터가 미리 확인해서 안내 메시지를 다르게 준다."""
    return bool(GEMINI_API_KEY)


def ask_json(system_prompt: str, user_prompt: str, response_schema: dict) -> dict:
    """LLM에게 묻고 JSON으로 받는다.

    response_schema로 응답 형태를 강제한다. 이게 없으면 LLM이 줄글이나
    ```json 으로 감싼 코드블록을 돌려줘서 파싱이 매번 깨진다.
    형태를 지정하면 제공자가 그 구조에 맞는 JSON만 생성한다.
    """
    if not GEMINI_API_KEY:
        raise LLMUnavailable("GEMINI_API_KEY가 설정되지 않았습니다.")

    payload = {
        "systemInstruction": {"parts": [{"text": system_prompt}]},
        "contents": [{"role": "user", "parts": [{"text": user_prompt}]}],
        "generationConfig": {
            "responseMimeType": "application/json",
            "responseSchema": response_schema,
            # 같은 후보를 두 번 분석했을 때 답이 크게 달라지면 신뢰를 잃는다.
            # 창작이 아니라 주어진 숫자를 해석하는 일이므로 낮게 둔다.
            "temperature": 0.3,
        },
    }

    try:
        res = requests.post(
            _URL,
            params={"key": GEMINI_API_KEY},
            json=payload,
            timeout=_TIMEOUT_SECONDS,
        )
    except requests.RequestException as e:
        logger.warning("LLM 호출 실패: %s", e)
        raise LLMUnavailable("AI 분석 서버에 연결하지 못했습니다.") from e

    if res.status_code != 200:
        # 응답 본문에 API 키가 섞여 나올 수 있으므로 앞부분만 로그에 남긴다.
        logger.warning("LLM 오류 응답 %s: %s", res.status_code, res.text[:300])
        raise LLMUnavailable(f"AI 분석 요청이 거부되었습니다. (HTTP {res.status_code})")

    try:
        text = res.json()["candidates"][0]["content"]["parts"][0]["text"]
        return json.loads(text)
    except (KeyError, IndexError, ValueError, TypeError) as e:
        # 안전 필터에 걸리거나 형식이 어긋나면 여기로 온다.
        logger.warning("LLM 응답 파싱 실패: %s / 원문 앞부분: %s", e, res.text[:300])
        raise LLMUnavailable("AI 분석 결과를 읽을 수 없습니다.") from e
