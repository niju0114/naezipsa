#!/bin/bash
# 한 번에 실행하는 초기 설정 스크립트 (macOS / Linux 전용)
# 사용법: cd backend && bash setup.sh
# Windows는 README.md의 수동 설치 절차를 따르세요.

set -e  # 중간에 하나라도 실패하면 즉시 멈춤

echo "1/5 가상환경 생성 (Python 3.14)..."
if [ ! -d ".venv" ]; then
  uv venv --python 3.14
else
  echo "  이미 .venv가 있어서 건너뜁니다."
fi

echo "2/5 가상환경 활성화..."
source .venv/bin/activate

echo "3/5 패키지 설치..."
uv pip install -r requirements.txt

echo "4/5 .env 파일 생성..."
if [ ! -f ".env" ]; then
  cp .env.example .env
  echo "  .env 템플릿 생성 완료. 값은 직접 채워야 합니다."
else
  echo "  이미 .env가 있어서 건너뜁니다."
fi

echo "5/5 완료!"
echo ""
echo "=================================================="
echo ".env 파일을 열어서 값을 채워주세요."
echo "비밀키는 Git에 올리면 안 되므로 팀에서 안전한 경로로 받아야 합니다."
echo "  (1Password, 임시 비밀 공유 링크 등. 카톡/슬랙 평문 금지)"
echo ""
echo "필수 값:"
echo "  DATABASE_URL         Supabase -> Connect -> ORMs (Session pooler, 5432 포트)"
echo "  SUPABASE_JWT_SECRET  Supabase -> Settings -> API -> JWT Settings"
echo "  MOLIT_API_KEY        공공데이터포털 (데이터 수집 시에만 필요)"
echo ""
echo "다 채우셨으면 서버를 띄워보세요:"
echo "  source .venv/bin/activate && uvicorn app.main:app --reload"
echo "=================================================="
