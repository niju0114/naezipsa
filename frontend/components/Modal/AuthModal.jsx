"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CloseIcon } from "../icons";

const VALID_IDS = ["admin", "demo", "naejipsa", "test"];

const SIGNUP_AGREEMENTS = [
  { key: "all", label: "전제 동의하기" },
  { key: "terms", label: "[필수] 내집사 이용약관", required: true },
  { key: "privacy", label: "[필수] 개인정보 처리방침", required: true },
  { key: "marketing", label: "[선택] 마케팅 정보 수신 동의", required: false },
];

// Feature toggles for temporary shutdown.
// Set a flag to true to restore the flow later in one place.
const FEATURE_FLAGS = {
  login: true,
  accountRecovery: false,
  signupTerms: false,
  signupPhone: false,
};

export default function AuthModal({ open, onClose, onSignupComplete }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [screen, setScreen] = useState("login");
  const [agreements, setAgreements] = useState({
    all: false,
    terms: false,
    privacy: false,
    marketing: false,
  });
  const [signupStep, setSignupStep] = useState(0);
  const [signupData, setSignupData] = useState({
    username: "",
    password: "",
    passwordConfirm: "",
    gender: "",
    birth: "",
    phone: "",
  });
  const [usernameCheckStatus, setUsernameCheckStatus] = useState("idle");
  const [usernameCheckMessage, setUsernameCheckMessage] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [showVerificationInput, setShowVerificationInput] = useState(false);
  const [recoveryType, setRecoveryType] = useState(null);
  const [recoveryName, setRecoveryName] = useState("");
  const [recoveryUsername, setRecoveryUsername] = useState("");
  const [recoveryPhone, setRecoveryPhone] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [showRecoveryCodeInput, setShowRecoveryCodeInput] = useState(false);
  const [recoveryError, setRecoveryError] = useState("");
  const [recoveryResult, setRecoveryResult] = useState("");
  const [recoveryPassword, setRecoveryPassword] = useState("");
  const [recoveryPasswordConfirm, setRecoveryPasswordConfirm] = useState("");

  const phoneInputRef = useRef(null);
  const verificationInputRef = useRef(null);
  const recoveryPhoneInputRef = useRef(null);
  const recoveryVerificationInputRef = useRef(null);
  const modalRef = useRef(null);
  const usernameInputRef = useRef(null);
  const loginButtonRef = useRef(null);
  const consentButtonRef = useRef(null);
  const nameInputRef = useRef(null);
  const birthInputRef = useRef(null);

  const signupSteps = useMemo(() => {
    const steps = [
      { key: "username", title: "아이디를 입력해 주세요", label: "아이디" },
      {
        key: "password",
        title: "비밀번호를 설정해 주세요",
        label: "비밀번호",
      },
      // { key: "gender", title: "성별을 선택해 주세요", label: "성별" },
      // { key: "birth", title: "생년월일을 입력해 주세요", label: "생년월일" },
    ];

    // if (FEATURE_FLAGS.signupPhone) {
    //   steps.push({
    //     key: "phone",
    //     title: "휴대폰 번호를 입력해 주세요",
    //     label: "휴대폰 번호",
    //   });
    // }

    return steps;
  }, []);

  const requiredAgreementsChecked = agreements.terms && agreements.privacy;
  const currentSignupStep = signupSteps[signupStep];

  const resetRecoveryState = useCallback(() => {
    setRecoveryType(null);
    setRecoveryName("");
    setRecoveryUsername("");
    setRecoveryPhone("");
    setRecoveryCode("");
    setShowRecoveryCodeInput(false);
    setRecoveryError("");
    setRecoveryResult("");
    setRecoveryPassword("");
    setRecoveryPasswordConfirm("");
  }, []);

  const resetAuthState = useCallback(() => {
    setUsername("");
    setPassword("");
    setError("");
    setScreen("login");
    setAgreements({
      all: false,
      terms: false,
      privacy: false,
      marketing: false,
    });
    setSignupStep(0);
    setSignupData({
      username: "",
      password: "",
      passwordConfirm: "",
      gender: "",
      birth: "",
      phone: "",
    });
    setUsernameCheckStatus("idle");
    setUsernameCheckMessage("");
    setVerificationCode("");
    setShowVerificationInput(false);
    resetRecoveryState();
  }, [resetRecoveryState]);

  const handleClose = useCallback(() => {
    resetAuthState();
    onClose();
  }, [onClose, resetAuthState]);

  const getFocusableElements = useCallback(() => {
    if (!modalRef.current) return [];

    return Array.from(
      modalRef.current.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((element) => {
      const style = window.getComputedStyle(element);
      return (
        style.visibility !== "hidden" &&
        style.display !== "none" &&
        element.getAttribute("aria-hidden") !== "true"
      );
    });
  }, []);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        handleClose();
        return;
      }

      if (event.key !== "Tab" || !modalRef.current) return;

      const focusable = getFocusableElements();
      if (!focusable.length) {
        event.preventDefault();
        return;
      }

      const currentIndex = focusable.indexOf(document.activeElement);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (currentIndex === -1) {
        event.preventDefault();
        if (event.shiftKey) {
          last.focus();
        } else {
          first.focus();
        }
        return;
      }

      const nextIndex = event.shiftKey ? currentIndex - 1 : currentIndex + 1;
      const target = focusable[nextIndex];

      if (target) {
        event.preventDefault();
        target.focus();
        return;
      }

      event.preventDefault();
      if (event.shiftKey) {
        last.focus();
      } else {
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, handleClose, getFocusableElements]);

  useEffect(() => {
    if (!open || !modalRef.current) return;

    requestAnimationFrame(() => {
      if (screen === "login") {
        usernameInputRef.current?.focus();
        return;
      }

      if (screen === "signup") {
        consentButtonRef.current?.focus();
        return;
      }

      if (screen === "signup-form") {
        if (signupStep === 0) {
          nameInputRef.current?.focus();
          return;
        }

        if (signupStep === 1) {
          const passwordInput = modalRef.current?.querySelector(
            'input[type="password"]',
          );
          passwordInput?.focus();
        }
      }
    });
  }, [open, screen, signupStep]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  function handleSubmit(event) {
    event.preventDefault();

    if (!VALID_IDS.includes(username.trim())) {
      setError("등록되지 않은 아이디입니다. 정확한 아이디를 입력해 주세요.");
      return;
    }

    if (!password.trim()) {
      setError("비밀번호를 입력해 주세요.");
      return;
    }

    setError("");
    resetAuthState();
    onClose();
  }

  function handleAgreementToggle(key) {
    if (key === "all") {
      const next = !agreements.all;
      setAgreements({ all: next, terms: next, privacy: next, marketing: next });
      return;
    }

    const nextValue = !agreements[key];
    const nextAgreements = { ...agreements, [key]: nextValue };
    nextAgreements.all =
      nextAgreements.terms &&
      nextAgreements.privacy &&
      nextAgreements.marketing;
    setAgreements(nextAgreements);
  }

  function canProceedSignup() {
    if (screen !== "signup-form") return false;

    // if (FEATURE_FLAGS.signupPhone) {
    //   if (signupStep !== signupSteps.length - 1) return false;
    //   return (
    //     signupData.phone.replace(/\D/g, "").length >= 8 &&
    //     verificationCode.replace(/\D/g, "").length === 6
    //   );
    // }

    return (
      signupStep === signupSteps.length - 1 &&
      signupData.password.length >= 8 &&
      signupData.password === signupData.passwordConfirm
    );
  }

  function handleSignupComplete() {
    if (!canProceedSignup()) return;
    resetAuthState();
    onClose();
    onSignupComplete?.();
  }

  function isValidUsernameValue(value) {
    const trimmed = value.trim();
    if (!trimmed) return false;
    if (trimmed.length < 4 || trimmed.length > 20) return false;
    return /^[a-zA-Z0-9_]+$/.test(trimmed);
  }

  function handleUsernameChange(nextValue) {
    const trimmedValue = nextValue.slice(0, 20);
    setSignupData((prev) => ({ ...prev, username: trimmedValue }));

    if (usernameCheckStatus !== "idle") {
      setUsernameCheckStatus("idle");
      setUsernameCheckMessage("");
    }
  }

  function handleUsernameCheck() {
    const normalized = signupData.username.trim();
    if (!isValidUsernameValue(normalized)) {
      setUsernameCheckStatus("idle");
      setUsernameCheckMessage("");
      return;
    }

    const isTaken = VALID_IDS.includes(normalized.toLowerCase());

    if (isTaken) {
      setUsernameCheckStatus("taken");
      setUsernameCheckMessage("이미 사용 중인 아이디 입니다.");
      return;
    }

    setUsernameCheckStatus("available");
    setUsernameCheckMessage("사용 가능한 아이디 입니다.");
  }

  function handlePasswordChange(nextValue, field) {
    setSignupData((prev) => ({
      ...prev,
      [field]: nextValue,
    }));
  }

  function handleNextSignupStep() {
    if (screen !== "signup-form") return;

    if (signupStep === 0) {
      if (!isValidUsernameValue(signupData.username)) return;
      if (usernameCheckStatus !== "available") return;
      setSignupStep(1);
      return;
    }

    if (signupStep === 1) {
      if (signupData.password.length < 8) return;
      if (signupData.password !== signupData.passwordConfirm) return;
      handleSignupComplete();
    }
  }

  // function handleGenderSelect(value) {
  //   setSignupData((prev) => ({
  //     ...prev,
  //     gender: value,
  //   }));

  //   if (screen === "signup-form" && signupStep === 2) {
  //     setSignupStep(3);
  //   }
  // }

  // function handleBirthChange(nextValue) {
  //   const digits = nextValue.replace(/\D/g, "").slice(0, 8);
  //   setSignupData((prev) => ({ ...prev, birth: digits }));
  //   if (
  //     screen === "signup-form" &&
  //     signupStep === 3 &&
  //     digits.length === 8 &&
  //     FEATURE_FLAGS.signupPhone
  //   ) {
  //     setSignupStep(4);
  //     requestAnimationFrame(() => phoneInputRef.current?.focus());
  //   }
  // }

  function handlePhoneChange(nextValue) {
    const digits = nextValue.replace(/\D/g, "").slice(0, 8);
    setSignupData((prev) => ({ ...prev, phone: digits }));
    if (screen === "signup-form" && signupStep === 3) {
      if (digits.length < 8) {
        setShowVerificationInput(false);
        setVerificationCode("");
      }
    }
  }

  function handleVerifyPhone() {
    if (signupData.phone.replace(/\D/g, "").length < 8) return;
    setShowVerificationInput(true);
    setVerificationCode("");
    requestAnimationFrame(() => verificationInputRef.current?.focus());
  }

  function openRecoveryFlow(type) {
    resetRecoveryState();
    setRecoveryType(type);
    setScreen(type === "id" ? "find-id" : "find-password");
  }

  function handleRecoveryPhoneChange(nextValue) {
    const digits = nextValue.replace(/\D/g, "").slice(0, 8);
    setRecoveryPhone(digits);
    if (digits.length < 8) {
      setShowRecoveryCodeInput(false);
      setRecoveryCode("");
      setRecoveryError("");
    }
  }

  function handleRecoveryVerifyPhone() {
    if (recoveryPhone.replace(/\D/g, "").length < 8) return;
    setShowRecoveryCodeInput(true);
    setRecoveryCode("");
    setRecoveryError("");
    requestAnimationFrame(() => recoveryVerificationInputRef.current?.focus());
  }

  function handleRecoverySubmit() {
    if (screen === "find-id") {
      if (!recoveryName.trim()) {
        setRecoveryError("이름을 입력해 주세요.");
        return;
      }

      if (recoveryPhone.replace(/\D/g, "").length < 8) {
        setRecoveryError("휴대폰 번호를 입력해 주세요.");
        return;
      }

      if (recoveryCode.replace(/\D/g, "").length !== 6) {
        setRecoveryError("인증번호 6자리를 입력해 주세요.");
        return;
      }

      setRecoveryError("");
      setRecoveryResult("demo");
      setScreen("find-id-result");
      return;
    }

    if (screen === "find-password") {
      if (!recoveryUsername.trim()) {
        setRecoveryError("아이디를 입력해 주세요.");
        return;
      }

      if (recoveryPhone.replace(/\D/g, "").length < 8) {
        setRecoveryError("휴대폰 번호를 입력해 주세요.");
        return;
      }

      if (recoveryCode.replace(/\D/g, "").length !== 6) {
        setRecoveryError("인증번호 6자리를 입력해 주세요.");
        return;
      }

      setRecoveryError("");
      setScreen("find-password-reset");
      return;
    }

    if (screen === "find-password-reset") {
      const trimmedPassword = recoveryPassword.trim();
      const trimmedConfirm = recoveryPasswordConfirm.trim();

      if (!trimmedPassword || !trimmedConfirm) {
        setRecoveryError("비밀번호를 입력해 주세요.");
        return;
      }

      if (trimmedPassword !== trimmedConfirm) {
        setRecoveryError("비밀번호를 확인해 주세요.");
        return;
      }

      setRecoveryError("");
      setRecoveryResult("비밀번호가 변경되었습니다.");
      setScreen("find-password-result");
    }
  }

  function goToSignupStep(index) {
    if (index < 0 || index >= signupSteps.length) return;
    setSignupStep(index);
  }

  function renderRecoveryScreen() {
    const isIdRecovery = recoveryType === "id";

    return (
      <div className="auth-signup-flow">
        <h2 className="auth-signup-title">
          {isIdRecovery ? "아이디 찾기" : "비밀번호 찾기"}
        </h2>

        {isIdRecovery && (
          <label className="auth-field">
            <span>이름</span>
            <input
              type="text"
              value={recoveryName}
              onChange={(event) => setRecoveryName(event.target.value)}
              placeholder="이름을 입력해 주세요"
            />
          </label>
        )}

        {!isIdRecovery && (
          <label className="auth-field">
            <span>아이디</span>
            <input
              type="text"
              value={recoveryUsername}
              onChange={(event) => setRecoveryUsername(event.target.value)}
              placeholder="아이디를 입력해 주세요"
            />
          </label>
        )}

        <label className="auth-field">
          <span>휴대폰 번호</span>
          <div className="phone-input-row">
            <button
              type="button"
              className="phone-prefix"
              onClick={() => recoveryPhoneInputRef.current?.focus()}
            >
              010
            </button>
            <input
              ref={recoveryPhoneInputRef}
              type="tel"
              value={recoveryPhone}
              onChange={(event) =>
                handleRecoveryPhoneChange(event.target.value)
              }
              placeholder="12345678"
              inputMode="numeric"
            />
            {recoveryPhone.replace(/\D/g, "").length >= 8 && (
              <button
                type="button"
                className="phone-verify-btn"
                onClick={handleRecoveryVerifyPhone}
              >
                인증하기
              </button>
            )}
          </div>
          {showRecoveryCodeInput && (
            <div className="verification-row" key="recovery-verification-row">
              <input
                ref={recoveryVerificationInputRef}
                type="tel"
                value={recoveryCode}
                onChange={(event) =>
                  setRecoveryCode(
                    event.target.value.replace(/\D/g, "").slice(0, 6),
                  )
                }
                placeholder="인증번호 6자리"
                inputMode="numeric"
              />
            </div>
          )}
        </label>

        {recoveryError && (
          <p className="auth-error" role="alert">
            {recoveryError}
          </p>
        )}

        <button
          type="button"
          className="auth-submit-btn"
          disabled={
            isIdRecovery
              ? !recoveryName.trim() ||
                recoveryPhone.replace(/\D/g, "").length < 8 ||
                recoveryCode.replace(/\D/g, "").length !== 6
              : !recoveryUsername.trim() ||
                recoveryPhone.replace(/\D/g, "").length < 8 ||
                recoveryCode.replace(/\D/g, "").length !== 6
          }
          onClick={handleRecoverySubmit}
        >
          {screen === "find-password" ? "다음" : "다음"}
        </button>
      </div>
    );
  }

  function renderPasswordResetScreen() {
    return (
      <div className="auth-signup-flow">
        <h2 className="auth-signup-title">비밀번호 재설정</h2>

        <label className="auth-field">
          <span>새 비밀번호</span>
          <input
            type="password"
            value={recoveryPassword}
            onChange={(event) => setRecoveryPassword(event.target.value)}
            placeholder="비밀번호를 입력해 주세요"
          />
        </label>

        <label className="auth-field">
          <span>비밀번호 확인</span>
          <input
            type="password"
            value={recoveryPasswordConfirm}
            onChange={(event) => setRecoveryPasswordConfirm(event.target.value)}
            placeholder="비밀번호를 다시 입력해 주세요"
          />
        </label>

        {recoveryError && (
          <p className="auth-error" role="alert">
            {recoveryError}
          </p>
        )}

        <button
          type="button"
          className="auth-submit-btn"
          disabled={!recoveryPassword || !recoveryPasswordConfirm}
          onClick={handleRecoverySubmit}
        >
          변경
        </button>
      </div>
    );
  }

  function renderRecoveryResultScreen() {
    const isIdRecovery = recoveryType === "id";

    return (
      <div className="auth-signup-flow">
        <h2 className="auth-signup-title">
          {isIdRecovery ? "아이디 찾기" : "비밀번호 찾기"}
        </h2>

        <div
          className="auth-error"
          style={{
            background: "#edfdf6",
            borderColor: "rgba(11, 183, 109, 0.2)",
            color: "#0e8f59",
          }}
        >
          {isIdRecovery
            ? `회원님의 아이디는 ${recoveryResult} 입니다.`
            : recoveryResult}
        </div>

        <button
          type="button"
          className="auth-submit-btn"
          onClick={() => {
            resetAuthState();
            onClose();
          }}
        >
          로그인
        </button>
      </div>
    );
  }

  function renderLoginScreen() {
    return (
      <form className="auth-form" onSubmit={handleSubmit}>
        <label className="auth-field">
          <span>아이디</span>
          <input
            ref={usernameInputRef}
            type="text"
            value={username}
            onChange={(event) => {
              setUsername(event.target.value);
              if (error) setError("");
            }}
            placeholder="아이디를 입력해 주세요"
            autoComplete="username"
          />
        </label>

        <label className="auth-field">
          <span>비밀번호</span>
          <input
            type="password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              if (error) setError("");
            }}
            placeholder="비밀번호를 입력해 주세요"
            autoComplete="current-password"
          />
        </label>

        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}

        <div className="auth-sns-wrap">
          <div className="auth-divider">
            <span>또는</span>
          </div>

          <div className="auth-sns-list" aria-label="SNS 로그인">
            <button
              type="button"
              className="sns-btn sns-google"
              aria-label="Google 로그인"
            >
              <span className="sns-mark">G</span>
            </button>
            <button
              type="button"
              className="sns-btn sns-kakao"
              aria-label="Kakao 로그인"
            >
              <span className="sns-mark">K</span>
            </button>
          </div>
        </div>

        <button ref={loginButtonRef} type="submit" className="auth-submit-btn">
          로그인
        </button>

        {FEATURE_FLAGS.login && (
          <div
            className="auth-service-links"
            aria-label="회원가입 및 계정 찾기"
          >
            <button
              type="button"
              className="auth-text-link"
              onClick={() =>
                setScreen(FEATURE_FLAGS.signupTerms ? "signup" : "signup-form")
              }
            >
              회원가입
            </button>
            {FEATURE_FLAGS.accountRecovery && (
              <>
                <span className="auth-link-separator" aria-hidden="true" />
                <button
                  type="button"
                  className="auth-text-link"
                  onClick={() => openRecoveryFlow("id")}
                >
                  아이디 찾기
                </button>
                <span className="auth-link-separator" aria-hidden="true" />
                <button
                  type="button"
                  className="auth-text-link"
                  onClick={() => openRecoveryFlow("password")}
                >
                  비밀번호 찾기
                </button>
              </>
            )}
          </div>
        )}
      </form>
    );
  }

  function renderSignupConsentScreen() {
    return (
      <div className="auth-signup-flow">
        <h2 className="auth-signup-title">
          회원가입을 위한 약관 동의가 필요해요
        </h2>

        <div className="signup-agreement-list">
          {SIGNUP_AGREEMENTS.map((item) => (
            <label key={item.key} className="agreement-row">
              <span className="agreement-checkbox">
                <input
                  type="checkbox"
                  checked={agreements[item.key]}
                  onChange={() => handleAgreementToggle(item.key)}
                />
                <span
                  className="agreement-checkbox-visual"
                  aria-hidden="true"
                />
              </span>
              <span className="agreement-label">{item.label}</span>
              {item.key !== "all" && item.key !== "marketing" && (
                <button type="button" className="agreement-more-btn">
                  보기
                </button>
              )}
            </label>
          ))}
        </div>

        {FEATURE_FLAGS.signupTerms && (
          <button
            ref={consentButtonRef}
            type="button"
            className="auth-submit-btn"
            aria-disabled={!requiredAgreementsChecked}
            onClick={() => {
              if (!requiredAgreementsChecked) return;
              setScreen("signup-form");
            }}
          >
            다음
          </button>
        )}
        {!FEATURE_FLAGS.signupTerms && (
          <button
            ref={consentButtonRef}
            type="button"
            className="auth-submit-btn"
            onClick={() => setScreen("signup-form")}
          >
            다음
          </button>
        )}
      </div>
    );
  }

  function renderSignupFormScreen() {
    const completedSteps = signupSteps.slice(0, signupStep).filter((step) => {
      if (step.key === "username")
        return isValidUsernameValue(signupData.username);
      if (step.key === "password")
        return (
          signupData.password.length >= 8 &&
          signupData.password === signupData.passwordConfirm
        );
      return false;
    });

    return (
      <div className="auth-signup-flow">
        <div className="signup-summary-list">
          {completedSteps.map((step, index) => {
            const value =
              step.key === "username"
                ? signupData.username
                : step.key === "password"
                  ? signupData.password
                    ? "비밀번호 설정 완료"
                    : ""
                  : "";

            return (
              <button
                key={step.key}
                type="button"
                className="signup-summary-row"
                onClick={() => goToSignupStep(signupSteps.indexOf(step))}
              >
                <div className="signup-summary-label">{step.label}</div>
                <div className="signup-summary-value">{value}</div>
              </button>
            );
          })}
        </div>

        <div className="signup-step-stack">
          <div className="signup-step-panel" key={currentSignupStep.key}>
            <div className="signup-step-title">{currentSignupStep.title}</div>

            {currentSignupStep.key === "username" && (
              <label className="signup-field">
                <span>{currentSignupStep.label}</span>
                <div className="username-check-row">
                  <input
                    ref={nameInputRef}
                    type="text"
                    value={signupData.username}
                    onChange={(event) =>
                      handleUsernameChange(event.target.value)
                    }
                    placeholder="아이디를 입력해 주세요"
                  />
                  <button
                    type="button"
                    className="username-check-btn"
                    disabled={!isValidUsernameValue(signupData.username)}
                    onClick={handleUsernameCheck}
                  >
                    중복 확인
                  </button>
                </div>
                {usernameCheckStatus !== "idle" && (
                  <p
                    className={
                      "username-check-message" +
                      (usernameCheckStatus === "available"
                        ? " is-success"
                        : " is-error")
                    }
                  >
                    {usernameCheckMessage}
                  </p>
                )}
              </label>
            )}

            {currentSignupStep.key === "password" && (
              <div className="auth-form">
                <label className="auth-field">
                  <span>비밀번호</span>
                  <input
                    type="password"
                    value={signupData.password}
                    onChange={(event) =>
                      handlePasswordChange(event.target.value, "password")
                    }
                    placeholder="비밀번호를 입력해 주세요"
                  />
                </label>

                <label className="auth-field">
                  <span>비밀번호 확인</span>
                  <input
                    type="password"
                    value={signupData.passwordConfirm}
                    onChange={(event) =>
                      handlePasswordChange(
                        event.target.value,
                        "passwordConfirm",
                      )
                    }
                    placeholder="비밀번호를 다시 입력해 주세요"
                  />
                </label>
              </div>
            )}

            {/* {currentSignupStep.key === "gender" && (
              <div className="signup-choice-group">
                {[
                  { value: "male", label: "남성" },
                  { value: "female", label: "여성" },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={
                      "signup-choice-btn" +
                      (signupData.gender === option.value ? " is-selected" : "")
                    }
                    onClick={() => handleGenderSelect(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )} */}

            {/* {currentSignupStep.key === "birth" && (
              <label className="signup-field">
                <span>{currentSignupStep.label}</span>
                <input
                  ref={birthInputRef}
                  type="text"
                  value={signupData.birth}
                  onChange={(event) => handleBirthChange(event.target.value)}
                  placeholder="19930415"
                  inputMode="numeric"
                />
              </label>
            )} */}

            {currentSignupStep.key === "phone" && (
              <label className="signup-field">
                <span>{currentSignupStep.label}</span>
                <div className="phone-input-row">
                  <button
                    type="button"
                    className="phone-prefix"
                    onClick={() => phoneInputRef.current?.focus()}
                  >
                    010
                  </button>
                  <input
                    ref={phoneInputRef}
                    type="tel"
                    value={signupData.phone}
                    onChange={(event) => handlePhoneChange(event.target.value)}
                    placeholder="12345678"
                    inputMode="numeric"
                  />
                  {signupData.phone.replace(/\D/g, "").length >= 8 && (
                    <button
                      type="button"
                      className="phone-verify-btn"
                      onClick={handleVerifyPhone}
                    >
                      인증하기
                    </button>
                  )}
                </div>
                {showVerificationInput && (
                  <div className="verification-row" key="verification-row">
                    <input
                      ref={verificationInputRef}
                      type="tel"
                      value={verificationCode}
                      onChange={(event) =>
                        setVerificationCode(
                          event.target.value.replace(/\D/g, "").slice(0, 6),
                        )
                      }
                      placeholder="인증번호 6자리"
                      inputMode="numeric"
                    />
                  </div>
                )}
              </label>
            )}
          </div>
        </div>

        <button
          type="button"
          className="auth-submit-btn"
          disabled={
            signupStep < signupSteps.length - 1
              ? !(
                  (signupStep === 0 && usernameCheckStatus === "available") ||
                  (signupStep === 1 &&
                    signupData.password.length >= 8 &&
                    signupData.password === signupData.passwordConfirm)
                )
              : !canProceedSignup()
          }
          aria-disabled={
            signupStep < signupSteps.length - 1
              ? !(
                  (signupStep === 0 && usernameCheckStatus === "available") ||
                  (signupStep === 1 &&
                    signupData.password.length >= 8 &&
                    signupData.password === signupData.passwordConfirm)
                )
              : !canProceedSignup()
          }
          onClick={() => {
            const isCurrentStepReady =
              signupStep < signupSteps.length - 1
                ? (signupStep === 0 && usernameCheckStatus === "available") ||
                  (signupStep === 1 &&
                    signupData.password.length >= 8 &&
                    signupData.password === signupData.passwordConfirm)
                : canProceedSignup();

            if (!isCurrentStepReady) {
              return;
            }

            if (signupStep < signupSteps.length - 1) {
              handleNextSignupStep();
              return;
            }

            handleSignupComplete();
          }}
        >
          {signupStep === signupSteps.length - 1 ? "가입 완료" : "다음"}
        </button>
      </div>
    );
  }

  if (!open) return null;

  return (
    <div
      className="modal-overlay auth-modal-overlay is-open"
      data-component="AuthModal"
      aria-hidden={false}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        ref={modalRef}
        className="auth-modal"
        role="dialog"
        aria-modal="true"
        aria-label="로그인"
        tabIndex={-1}
      >
        <div className="auth-modal-header">
          <button
            type="button"
            className="modal-close auth-modal-close"
            aria-label="닫기"
            onClick={handleClose}
          >
            <CloseIcon />
          </button>
        </div>

        <div className="auth-modal-body">
          {screen === "login" && renderLoginScreen()}
          {screen === "signup" &&
            (FEATURE_FLAGS.signupTerms
              ? renderSignupConsentScreen()
              : renderSignupFormScreen())}
          {screen === "signup-form" && renderSignupFormScreen()}
          {FEATURE_FLAGS.accountRecovery &&
            (screen === "find-id" || screen === "find-password") &&
            renderRecoveryScreen()}
          {screen === "find-password-reset" && renderPasswordResetScreen()}
          {(screen === "find-id-result" || screen === "find-password-result") &&
            renderRecoveryResultScreen()}
        </div>
      </div>
    </div>
  );
}
