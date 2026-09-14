import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import AuthModal from "@/components/Modal/AuthModal";
import { displayAccount, toAuthEmail } from "@/lib/authIdentity";
import { supabase } from "@/lib/supabaseClient";

vi.mock("@/lib/supabaseClient", () => ({ supabase: { auth: {
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  signInWithOAuth: vi.fn(),
} } }));

const auth = supabase.auth;
const PASSWORD = "password123";

function mockSettings(autoconfirm) {
  vi.stubGlobal("fetch", vi.fn(async () => ({
    ok: true,
    json: async () => ({ mailer_autoconfirm: autoconfirm }),
  })));
}

function renderModal() {
  const onClose = vi.fn();
  const onSignupComplete = vi.fn();
  render(<AuthModal open onClose={onClose} onSignupComplete={onSignupComplete} />);
  return { onClose, onSignupComplete };
}

function login(id, password = PASSWORD) {
  fireEvent.change(screen.getByPlaceholderText("아이디를 입력해 주세요"), { target: { value: id } });
  fireEvent.change(screen.getByPlaceholderText("비밀번호를 입력해 주세요"), { target: { value: password } });
  fireEvent.click(screen.getByRole("button", { name: /^로그인/ }));
}

function signup(id, password = PASSWORD) {
  fireEvent.click(screen.getByRole("button", { name: "회원가입" }));
  fireEvent.change(screen.getByPlaceholderText("영문 소문자·숫자·밑줄(_) 4~20자"), { target: { value: id } });
  fireEvent.click(screen.getByRole("button", { name: "확인" }));
  fireEvent.click(screen.getByRole("button", { name: "다음" }));
  fireEvent.change(screen.getByPlaceholderText("비밀번호를 입력해 주세요"), { target: { value: password } });
  fireEvent.change(screen.getByPlaceholderText("비밀번호를 다시 입력해 주세요"), { target: { value: password } });
  fireEvent.click(screen.getByRole("button", { name: "가입 완료" }));
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("requestAnimationFrame", (callback) => setTimeout(callback, 0));
  auth.signInWithPassword.mockResolvedValue({ data: { session: {} }, error: null });
  auth.signUp.mockResolvedValue({ data: { session: { access_token: "t" } }, error: null });
  mockSettings(true);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("아이디 ↔ 내부용 이메일 변환", () => {
  it("아이디는 소문자 내부용 이메일로 바꾸고, 기존 이메일은 그대로 둔다", () => {
    expect(toAuthEmail(" Minjun_01 ")).toBe("minjun_01@naezipsa.invalid");
    expect(toAuthEmail("jins415@naver.com")).toBe("jins415@naver.com");
    expect(toAuthEmail("ab")).toBeNull();
    expect(toAuthEmail("한글아이디")).toBeNull();
    expect(toAuthEmail("broken@")).toBeNull();
  });

  it("화면에는 내부용 이메일 대신 아이디를, 기존 계정은 이메일을 보여준다", () => {
    expect(displayAccount("minjun_01@naezipsa.invalid")).toBe("minjun_01");
    expect(displayAccount("egg886363@gmail.com")).toBe("egg886363@gmail.com");
    expect(displayAccount(undefined)).toBe("");
  });
});

describe("아이디 로그인", () => {
  it("아이디를 내부용 이메일로 바꿔 로그인하고 모달을 닫는다", async () => {
    const { onClose } = renderModal();
    login("Minjun_01");
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(auth.signInWithPassword).toHaveBeenCalledWith({
      email: "minjun_01@naezipsa.invalid",
      password: PASSWORD,
    });
  });

  it("아이디 전환 전에 이메일로 가입한 계정도 계속 로그인된다", async () => {
    const { onClose } = renderModal();
    login("jins415@naver.com");
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(auth.signInWithPassword).toHaveBeenCalledWith({ email: "jins415@naver.com", password: PASSWORD });
  });

  it("형식이 틀린 아이디는 Supabase를 호출하지 않고 안내한다", async () => {
    renderModal();
    login("ab");
    expect((await screen.findByRole("alert")).textContent).toContain("아이디는 영문 소문자·숫자·밑줄(_) 4~20자");
    expect(auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it("잘못된 아이디·비밀번호는 아이디 기준 문구로 안내하고 모달을 유지한다", async () => {
    auth.signInWithPassword.mockResolvedValue({ data: {}, error: { message: "Invalid login credentials" } });
    const { onClose } = renderModal();
    login("minjun_01", "wrong-password");
    expect((await screen.findByRole("alert")).textContent).toContain("아이디 또는 비밀번호가 올바르지 않습니다.");
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe("아이디 회원가입 후 자동 로그인", () => {
  it("가입 응답의 세션으로 바로 로그인 상태가 되어 모달을 닫는다", async () => {
    const { onClose, onSignupComplete } = renderModal();
    signup("New_User1");
    await waitFor(() => expect(onSignupComplete).toHaveBeenCalled());
    expect(onClose).toHaveBeenCalled();
    expect(auth.signUp).toHaveBeenCalledWith({ email: "new_user1@naezipsa.invalid", password: PASSWORD });
    expect(auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it("가입 응답에 세션이 없으면 같은 아이디·비밀번호로 한 번 더 로그인한다", async () => {
    auth.signUp.mockResolvedValue({ data: { session: null, user: { id: "u" } }, error: null });
    const { onClose } = renderModal();
    signup("new_user2");
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(auth.signInWithPassword).toHaveBeenCalledWith({ email: "new_user2@naezipsa.invalid", password: PASSWORD });
  });

  it("자동 로그인에 실패하면 모달을 유지하고 다시 로그인하도록 안내한다", async () => {
    auth.signUp.mockResolvedValue({ data: { session: null }, error: null });
    auth.signInWithPassword.mockResolvedValue({ data: {}, error: { message: "Email not confirmed" } });
    const { onClose, onSignupComplete } = renderModal();
    signup("new_user3");
    expect((await screen.findByRole("alert")).textContent).toContain("가입은 완료됐지만 자동 로그인하지 못했어요");
    expect(onClose).not.toHaveBeenCalled();
    expect(onSignupComplete).not.toHaveBeenCalled();
  });

  it("Supabase 'Confirm email'이 켜져 있으면 가입 요청을 보내지 않는다", async () => {
    mockSettings(false);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { onClose } = renderModal();
    signup("new_user4");
    expect((await screen.findByRole("alert")).textContent).toContain("지금은 회원가입을 완료할 수 없어요");
    expect(auth.signUp).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalled();
  });

  it("설정 조회에 실패하면 가입 요청을 보내지 않고 재시도를 안내한다", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 503 })));
    renderModal();
    signup("new_user5");
    expect((await screen.findByRole("alert")).textContent).toContain("가입 설정을 확인하지 못했어요");
    expect(auth.signUp).not.toHaveBeenCalled();
  });

  it("이미 있는 아이디는 안내하고 아이디 입력 단계로 돌아간다", async () => {
    auth.signUp.mockResolvedValue({ data: {}, error: { message: "User already registered" } });
    renderModal();
    signup("minjun_01");
    await screen.findByPlaceholderText("영문 소문자·숫자·밑줄(_) 4~20자");
    expect(auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it("형식이 틀린 아이디는 확인 버튼이 비활성이라 다음 단계로 못 간다", () => {
    renderModal();
    fireEvent.click(screen.getByRole("button", { name: "회원가입" }));
    fireEvent.change(screen.getByPlaceholderText("영문 소문자·숫자·밑줄(_) 4~20자"), { target: { value: "a!" } });
    expect(screen.getByRole("button", { name: "확인" }).disabled).toBe(true);
  });
});
