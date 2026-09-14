// 아이디 로그인 — Supabase Auth는 이메일(또는 전화번호)로만 계정을 만든다.
// 그래서 사용자가 입력한 아이디를 "메일이 실제로 가지 않는 내부용 이메일"로
// 바꿔서 넘긴다. .invalid는 RFC 2606 예약 도메인이라 어떤 메일도 실제 사람에게
// 배달되지 않는다(아이디가 외부 메일 서버로 새어 나가지 않는다).
//
// 도메인을 바꾸면 기존 아이디 계정이 전부 로그인되지 않으므로 한 번 정하면
// 바꾸지 않는다.
export const LOGIN_ID_EMAIL_DOMAIN = "naezipsa.invalid";

const LOGIN_ID_PATTERN = /^[a-z0-9_]{4,20}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// 아이디는 대소문자를 구분하지 않는다(이메일 주소가 대소문자를 구분하지 않으므로).
export function normalizeLoginId(value) {
  return (value || "").trim().toLowerCase();
}

// 영문 소문자·숫자·밑줄(_) 4~20자.
export function isValidLoginId(value) {
  return LOGIN_ID_PATTERN.test(normalizeLoginId(value));
}

export function loginIdToAuthEmail(value) {
  return `${normalizeLoginId(value)}@${LOGIN_ID_EMAIL_DOMAIN}`;
}

// 로그인 입력값 -> Supabase에 넘길 이메일. 형식이 틀리면 null.
// '@'가 있으면 아이디 전환 전에 이메일로 가입한 기존 계정이므로 그대로 쓴다.
export function toAuthEmail(value) {
  const trimmed = (value || "").trim();
  if (trimmed.includes("@")) {
    return EMAIL_PATTERN.test(trimmed) ? trimmed : null;
  }
  return isValidLoginId(trimmed) ? loginIdToAuthEmail(trimmed) : null;
}

// 화면 표시용. 내부용 이메일이면 아이디만, 기존 이메일·소셜 계정은 이메일 그대로.
export function displayAccount(email) {
  const suffix = `@${LOGIN_ID_EMAIL_DOMAIN}`;
  if (email && email.toLowerCase().endsWith(suffix)) {
    return email.slice(0, -suffix.length);
  }
  return email || "";
}

// Supabase Auth의 "Confirm email"이 꺼져 있는지(= 가입 즉시 세션 발급) 확인한다.
// 켜져 있으면 가입 직후 자동 로그인이 불가능하고, 배달되지 않는 내부용 주소로
// 인증 메일을 보내 반송만 쌓인다(반송이 많으면 Supabase가 프로젝트 메일 발송을
// 제한할 수 있다). 공개 설정 조회라 publishable key만 쓴다.
export async function isSignupAutoConfirmed() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/rest\/v1\/?$/, "");
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
  const response = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } });
  if (!response.ok) {
    throw new Error(`Supabase 설정 조회 실패 (${response.status})`);
  }
  const settings = await response.json();
  return settings.mailer_autoconfirm === true;
}
