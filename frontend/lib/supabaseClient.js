import { createClient } from "@supabase/supabase-js";

// Supabase Auth 연동(2026-09) - 실제 로그인/회원가입/소셜 로그인을 처리하는
// 클라이언트 싱글턴. backend/app/core/security.py가 검증하는 바로 그
// Supabase 프로젝트를 가리킨다 (같은 프로젝트, 백엔드는 DB 접속 + 토큰
// 검증만, 로그인 발급은 이 클라이언트가 담당).
//
// 세션(로그인 상태)은 SDK가 기본으로 localStorage에 저장하고 자동으로
// 갱신해준다 - 새로고침해도 로그인 유지됨.
const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(
  /\/rest\/v1\/?$/,
  "",
);
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";

if (!supabaseUrl || !supabaseKey) {
  // 개발 중 .env.local을 안 채워넣고 잊어버리는 실수를 바로 알아채기 위한
  // 콘솔 경고 - 앱을 막지는 않는다(로그인 관련 화면 아닐 땐 몰라도 됨).
  console.warn(
    "[supabaseClient] NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY가 " +
      "설정되지 않았습니다. frontend/.env.local을 확인해 주세요.",
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey);
