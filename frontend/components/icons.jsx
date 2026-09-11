// 프로토타입에서 문자열을 리턴하던 svg 헬퍼 함수들을 그대로 React 컴포넌트로
// 옮긴 것. 색은 stroke/fill에 currentColor 또는 CSS 변수를 그대로 사용.

// SNS 로그인 버튼용 브랜드 로고 - stroke=currentColor를 쓰는 다른 아이콘들과
// 달리 브랜드 고유 색을 고정으로 쓴다(2026-09, 로그인 모달 SNS 버튼 개편).
export function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
      />
    </svg>
  );
}

export function KakaoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <circle cx="9" cy="9" r="9" fill="#FEE500" />
      <path
        fill="#391B1B"
        d="M9 4.5c-3.31 0-6 2.14-6 4.78 0 1.7 1.13 3.19 2.83 4.03-.12.44-.45 1.63-.51 1.88-.08.31.11.32.24.23.1-.07 1.66-1.13 2.33-1.58.36.05.74.08 1.11.08 3.31 0 6-2.14 6-4.78S12.31 4.5 9 4.5Z"
      />
    </svg>
  );
}

// 로그인 버튼 옆 아이콘(2026-09) - 화살표가 문/괄호 모양 안으로 들어가는
// 표준 "로그인" 아이콘. 버튼 글자색을 그대로 물려받도록 stroke=currentColor.
export function LoginIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 8l4 4-4 4M14 12H3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CheckIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M5 12l5 5L19 7"
        stroke="#fff"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// 6개 점의 반지름/간격을 키워 "잡고 옮길 수 있는 그립"이라는 인상을 강화.
// 색은 fill="currentColor"로 둬서 .interest-drag-handle의 color 값(hover/focus/
// 드래그 중 진해짐)을 그대로 물려받는다.
export function DragHandleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <circle cx="8" cy="5.5" r="2" fill="currentColor" />
      <circle cx="16" cy="5.5" r="2" fill="currentColor" />
      <circle cx="8" cy="12" r="2" fill="currentColor" />
      <circle cx="16" cy="12" r="2" fill="currentColor" />
      <circle cx="8" cy="18.5" r="2" fill="currentColor" />
      <circle cx="16" cy="18.5" r="2" fill="currentColor" />
    </svg>
  );
}

export function PencilIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 20l.9-3.6L16.2 5.1a1.5 1.5 0 0 1 2.1 0l.6.6a1.5 1.5 0 0 1 0 2.1L7.6 19.1 4 20Z"
        stroke="var(--color-text-secondary)"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke="var(--color-text-secondary)"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 5v14M5 12h14"
        stroke="var(--color-text-secondary)"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ChevronDownIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M6 9l6 6 6-6"
        stroke="var(--color-text-secondary)"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ChevronRightIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M9 6l6 6-6 6"
        stroke="var(--color-text-faint)"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <circle cx="11" cy="11" r="6.5" stroke="var(--color-ink)" strokeWidth="1.8" />
      <path
        d="M20 20l-4.3-4.3"
        stroke="var(--color-ink)"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function BackArrowIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path
        d="M15 6l-6 6 6 6"
        stroke="var(--color-text-secondary)"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M6 6l12 12M18 6L6 18" stroke="var(--color-ink)" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function ArrowUpIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path
        d="M18 15l-6-6-6 6"
        stroke="var(--color-text-secondary)"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function HomeMarkIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 18 18" fill="none">
      <path
        d="M4 9.2 9 4.6 14 9.2"
        stroke="var(--color-on-logo)"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5.6 8.6V13.2H12.4V8.6"
        stroke="var(--color-on-logo)"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12.4" cy="13.2" r="1.5" fill="var(--color-on-logo)" />
    </svg>
  );
}

export function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M6 9a6 6 0 0 1 12 0c0 4.2 1.4 5.8 2 6.5H4c.6-.7 2-2.3 2-6.5Z"
        stroke="var(--color-ink)"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M9.5 18.5a2.5 2.5 0 0 0 5 0"
        stroke="var(--color-ink)"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function GearIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="3" stroke="var(--color-ink)" strokeWidth="1.7" />
      <path
        d="M12 3.5v2.2M12 18.3v2.2M20.5 12h-2.2M5.7 12H3.5M17.8 6.2l-1.5 1.5M7.7 16.3l-1.5 1.5M17.8 17.8l-1.5-1.5M7.7 7.7 6.2 6.2"
        stroke="var(--color-ink)"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}
