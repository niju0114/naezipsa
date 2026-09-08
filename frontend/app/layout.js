import "./globals.css";

// Noto Sans KR은 next/font/google 대신 프로토타입과 동일하게 Google Fonts
// CSS를 <link>로 직접 불러온다. 이유는 두 가지:
//   1) next/font/google이 self-host 가능한 Noto Sans KR 서브셋에는 'korean'이
//      없다(latin/latin-ext/cyrillic/vietnamese만 제공, 직접 확인함) — 즉
//      next/font로 불러오면 한글 글자에는 이 폰트가 아예 적용되지 않는다.
//   2) next/font/google은 빌드 타임에 Google 서버에서 폰트 파일을 미리
//      내려받아야 하는데, 사내망/방화벽처럼 빌드 환경에 외부 네트워크가
//      막혀 있으면 그 자체로 빌드가 실패한다. <link> 태그는 브라우저가
//      "런타임에" 불러오므로 빌드 시점 네트워크 의존이 없다.
// React 19부터는 컴포넌트 어디서든 <link rel="stylesheet">를 렌더링하면
// 자동으로 <head>로 끌어올려지고 중복 제거까지 되므로, 명시적 <head> 태그로
// 감쌀 필요도 없다.
export const metadata = {
  title: "내집사",
  description: "관심 매물을 한눈에 비교하고 관리하는 대시보드",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>
        {/* eslint-disable-next-line @next/next/no-page-custom-font -- 이 린트
            규칙은 Pages Router의 개별 페이지 파일 기준이라 App Router의
            루트 레이아웃(모든 페이지에 항상 적용됨)에는 해당 안 됨. 위 주석
            참고. */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700;800&display=swap"
        />
        {children}
      </body>
    </html>
  );
}
