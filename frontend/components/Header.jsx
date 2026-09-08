"use client";

import { HomeMarkIcon, BellIcon, GearIcon } from "./icons";

// <Header /> : 로고 + 우측 네비(알림/설정/로그인). 원래 있던 "단지 추가" 버튼은
// 헤더가 좁아지며(96px→72px) 요청으로 제거됨 — 매물 추가는 히어로 CTA와
// 대시보드 리스트의 "+ 매물 추가하기" 슬롯으로 충분.
//
// onLogoClick: 로고를 누르면 히어로(관심 매물 추가 CTA + 문서 안내)를 다시
// 슬라이드 다운시켜 홈으로 돌아가는 진입점 역할도 겸함.
export default function Header({ onLogoClick, onLoginClick }) {
  return (
    <div className="header" data-component="Header">
      <button
        type="button"
        id="logo-home-btn"
        className="logo-group"
        tabIndex={0}
        data-component="Logo"
        aria-label="홈으로"
        onClick={onLogoClick}
      >
        <div className="logo-mark">
          <HomeMarkIcon />
        </div>
        <span className="logo-word">내집사</span>
      </button>

      <div className="header-actions" data-component="HeaderActions">
        {/* <button
          tabIndex={0}
          className="nav-icon-btn"
          type="button"
          aria-label="알림"
        >
          <BellIcon />
          <span className="badge-dot" />
        </button> */}
        {/* <button
          tabIndex={0}
          className="nav-icon-btn"
          type="button"
          aria-label="다크모드"
        >
          <GearIcon />
        </button> */}
        <button
          type="button"
          tabIndex={0}
          className="nav-link nav-login-btn"
          onClick={onLoginClick}
        >
          로그인
        </button>
      </div>
    </div>
  );
}
