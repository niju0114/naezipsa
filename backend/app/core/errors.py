"""[공용] core · errors — 모든 오류 응답을 한 형식으로 통일한다.

흐름   어느 단계에서 실패하든 여기로 모임 → {"error": {code, message, details}}
등록   app/main.py 의 register_exception_handlers(app) 한 줄
소유   공용 (2026-09-09 팀 확정)

오류 응답 형식 통일 (A/B 공통 규칙 초안).

--- 왜 필요한가 -----------------------------------------------------------

FastAPI 기본 동작은 오류 종류에 따라 응답 모양이 달라진다.

    404  {"detail": "해당 후보 매물을 찾을 수 없습니다."}          <- 문자열
    422  {"detail": [{"type": "literal_error", "loc": [...], ...}]}  <- 배열
    500  (본문 없음 또는 스택 트레이스)

프론트가 오류를 처리하려면 `typeof detail === "string"` 같은 분기를 써야 하고,
A와 B의 라우터가 같은 앱에서 도는데 형식이 제각각이면 더 헷갈린다.

--- 통일 형식 -------------------------------------------------------------

모든 오류를 아래 한 가지 모양으로 맞춘다.

    {
      "error": {
        "code": "NOT_FOUND",
        "message": "해당 후보 매물을 찾을 수 없습니다.",
        "details": null
      }
    }

  code     기계가 분기할 값. HTTP 상태코드에서 유도되므로 외울 것이 없다.
  message  사람이 읽을 값. 그대로 화면에 띄울 수 있는 한국어.
  details  추가 정보. 검증 오류일 때만 어떤 필드가 왜 틀렸는지 채운다.

프론트는 `res.error.message`만 보면 되고, 분기가 필요하면 `res.error.code`를 쓴다.

--- 되돌리는 법 -----------------------------------------------------------

B가 반대하면 app/main.py의 register_exception_handlers(app) 한 줄만 지우면
FastAPI 기본 형식으로 돌아간다. 라우터 코드는 손댈 필요가 없다.
"""
import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger(__name__)

# HTTP 상태코드 -> 오류 코드. 여기 없는 상태코드는 HTTP_<숫자>로 만든다.
_CODE_BY_STATUS = {
    400: "BAD_REQUEST",
    401: "UNAUTHORIZED",
    403: "FORBIDDEN",
    404: "NOT_FOUND",
    405: "METHOD_NOT_ALLOWED",
    409: "CONFLICT",
    422: "VALIDATION_ERROR",
    429: "TOO_MANY_REQUESTS",
    500: "INTERNAL_ERROR",
}


def _code_for(status_code: int) -> str:
    return _CODE_BY_STATUS.get(status_code, f"HTTP_{status_code}")


def error_response(status_code: int, message: str, details=None, headers=None) -> JSONResponse:
    """통일 형식의 오류 응답을 만든다."""
    return JSONResponse(
        status_code=status_code,
        content={
            "error": {
                "code": _code_for(status_code),
                "message": message,
                "details": details,
            }
        },
        headers=headers,
    )


def register_exception_handlers(app: FastAPI) -> None:
    """앱에 오류 처리기를 등록한다. main.py에서 한 번 호출한다."""

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException):
        """라우터에서 raise HTTPException(...) 한 경우.

        Starlette의 HTTPException을 잡으면 FastAPI의 것까지 함께 처리된다
        (상속 관계). 경로를 못 찾은 404도 여기로 들어온다.

        401 응답의 WWW-Authenticate 같은 헤더는 HTTP 규약상 필요하므로
        그대로 실어 보낸다.
        """
        detail = exc.detail
        # detail이 문자열이 아닌 경우(dict 등)는 details로 옮기고 일반 메시지를 쓴다.
        if isinstance(detail, str):
            message, details = detail, None
        else:
            message, details = "요청을 처리할 수 없습니다.", detail

        return error_response(exc.status_code, message, details, headers=exc.headers)

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        """Pydantic 검증 실패(422).

        기본 응답은 loc이 ["body", "service_purposes", 0] 같은 배열이라
        프론트가 필드명을 뽑아 쓰기 불편하다. "body.service_purposes.0" 형태로
        평탄화해서 어떤 필드가 왜 틀렸는지 바로 보이게 만든다.
        """
        details = [
            {
                "field": ".".join(str(part) for part in err.get("loc", [])),
                "message": err.get("msg", ""),
                "type": err.get("type", ""),
            }
            for err in exc.errors()
        ]
        return error_response(422, "입력값이 올바르지 않습니다.", details)

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        """예상하지 못한 오류(500).

        예외 내용을 응답에 넣지 않는다. DB 접속 문자열이나 테이블 구조가
        그대로 새어 나갈 수 있기 때문이다. 원인은 서버 로그로만 남긴다.
        """
        logger.exception("처리되지 않은 오류: %s %s", request.method, request.url.path)
        return error_response(500, "서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.")
