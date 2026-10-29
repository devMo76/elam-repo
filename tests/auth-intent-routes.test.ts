import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/env/public", () => ({
  getPublicEnvironment: vi.fn(() => ({
    NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
    NEXT_PUBLIC_MOYASAR_PUBLISHABLE_KEY: "pk_test_publickey",
    NEXT_PUBLIC_SITE_URL: "https://elam.example",
  })),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));
vi.mock("@/lib/http/rate-limit", () => ({
  checkRateLimits: vi.fn(async () => null),
}));

import { POST as register } from "@/app/api/auth/register/route";
import { POST as resendConfirmation } from "@/app/api/auth/resend-confirmation/route";
import { GET as confirmEmail } from "@/app/auth/callback/route";
import { createClient } from "@/lib/supabase/server";
import { NextRequest } from "next/server";

const signUp = vi.fn();
const resend = vi.fn();
const exchangeCodeForSession = vi.fn();
const verifyOtp = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  signUp.mockResolvedValue({ data: {}, error: null });
  resend.mockResolvedValue({ data: {}, error: null });
  exchangeCodeForSession.mockResolvedValue({ data: {}, error: null });
  verifyOtp.mockResolvedValue({ data: {}, error: null });
  vi.mocked(createClient).mockResolvedValue({
    auth: { signUp, resend, exchangeCodeForSession, verifyOtp },
  } as never);
});

function jsonRequest(pathname: string, body: object) {
  return new Request(`https://elam.example${pathname}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("authentication destination continuity", () => {
  it("verifies an email token without any registration-browser cookies", async () => {
    const request = new NextRequest(
      "https://0.0.0.0:8080/auth/callback?token_hash=valid-token&type=email&next=%2Faccount",
    );
    expect(request.cookies.getAll()).toEqual([]);
    const response = await confirmEmail(request);

    expect(verifyOtp).toHaveBeenCalledWith({ token_hash: "valid-token", type: "email" });
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe("https://elam.example/account?auth=verified");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
  });

  it("preserves course intent without forwarding verification credentials", async () => {
    const response = await confirmEmail(new NextRequest(
      "https://elam.example/auth/callback?token_hash=valid-token&type=email&next=%2Fcourses%2Fsignals%3Flesson%3Dpreview",
    ));
    expect(response.headers.get("location")).toBe(
      "https://elam.example/courses/signals?lesson=preview&auth=verified",
    );
  });

  it.each(["https://evil.example", "//evil.example", "/\\evil.example"])(
    "rejects unsafe token confirmation destination %s",
    async (next) => {
      const url = new URL("https://elam.example/auth/callback?token_hash=valid-token&type=email");
      url.searchParams.set("next", next);
      const response = await confirmEmail(new NextRequest(url));
      expect(response.headers.get("location")).toBe("https://elam.example/account?auth=verified");
    },
  );

  it.each(["recovery", "invite", "email_change", "signup", "sms", ""])(
    "does not accept OTP type %s on the signup token path",
    async (type) => {
      const url = new URL("https://elam.example/auth/callback?token_hash=valid-token&code=valid-code");
      url.searchParams.set("type", type);
      const response = await confirmEmail(new NextRequest(url));
      expect(response.headers.get("location")).toBe("https://elam.example/?auth_error=confirmation_failed");
      expect(createClient).not.toHaveBeenCalled();
    },
  );

  it.each(["", "x".repeat(2049)])("rejects empty or oversized token hashes", async (token) => {
    const url = new URL("https://elam.example/auth/callback?type=email");
    url.searchParams.set("token_hash", token);
    const response = await confirmEmail(new NextRequest(url));
    expect(response.headers.get("location")).toBe("https://elam.example/?auth_error=confirmation_failed");
    expect(createClient).not.toHaveBeenCalled();
  });

  it("fails safely on expired/replayed tokens without falling back to PKCE", async () => {
    verifyOtp.mockResolvedValueOnce({ error: new Error("Expired token") });
    const response = await confirmEmail(new NextRequest(
      "https://elam.example/auth/callback?token_hash=used-token&type=email&code=valid-code",
    ));
    expect(response.headers.get("location")).toBe("https://elam.example/?auth_error=confirmation_failed");
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("does not claim success when the link has no credentials", async () => {
    const response = await confirmEmail(new NextRequest("https://elam.example/auth/callback"));
    expect(response.headers.get("location")).toBe("https://elam.example/?auth_error=confirmation_failed");
    expect(createClient).not.toHaveBeenCalled();
  });

  it("uses the public site URL after verification behind Railway's proxy", async () => {
    const response = await confirmEmail(
      new NextRequest("https://0.0.0.0:8080/auth/callback?code=valid-code&next=%2Faccount"),
    );

    expect(response.headers.get("location")).toBe("https://elam.example/account?auth=verified");
    expect(exchangeCodeForSession).toHaveBeenCalledWith("valid-code");
  });

  it("keeps failed verification redirects on the public site", async () => {
    exchangeCodeForSession.mockResolvedValueOnce({ error: new Error("Invalid code") });
    const response = await confirmEmail(
      new NextRequest("https://0.0.0.0:8080/auth/callback?code=invalid-code&next=%2Faccount"),
    );

    expect(response.headers.get("location")).toBe("https://elam.example/?auth_error=confirmation_failed");
  });

  it("carries a course destination into the registration confirmation link", async () => {
    const next = "/courses/signals-and-systems-ee301?lesson=preview";
    const response = await register(
      jsonRequest("/api/auth/register", {
        email: "learner@example.com",
        password: "safe-password",
        fullName: "New Learner",
        next,
      }),
    );

    expect(response.status).toBe(202);
    const emailRedirectTo = signUp.mock.calls[0][0].options.emailRedirectTo;
    const confirmationUrl = new URL(emailRedirectTo);
    expect(confirmationUrl.origin).toBe("https://elam.example");
    expect(confirmationUrl.pathname).toBe("/auth/callback");
    expect(confirmationUrl.searchParams.get("next")).toBe(next);
  });

  it("falls back safely when registration receives an external destination", async () => {
    await register(
      jsonRequest("/api/auth/register", {
        email: "learner@example.com",
        password: "safe-password",
        fullName: "New Learner",
        next: "https://evil.example/steal-session",
      }),
    );

    const emailRedirectTo = signUp.mock.calls[0][0].options.emailRedirectTo;
    expect(new URL(emailRedirectTo).searchParams.get("next")).toBe("/account");
  });

  it("preserves the same destination when resending confirmation", async () => {
    const next = "/courses/signals-and-systems-ee301";
    const response = await resendConfirmation(
      jsonRequest("/api/auth/resend-confirmation", {
        email: "learner@example.com",
        next,
      }),
    );

    expect(response.status).toBe(202);
    const emailRedirectTo = resend.mock.calls[0][0].options.emailRedirectTo;
    expect(new URL(emailRedirectTo).searchParams.get("next")).toBe(next);
  });

  it("returns a verified learner to the full safe destination", async () => {
    const response = await confirmEmail(
      new NextRequest(
        "https://elam.example/auth/callback?code=valid-code&next=%2Fcourses%2Fsignals-and-systems-ee301%3Flesson%3Dpreview",
      ),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://elam.example/courses/signals-and-systems-ee301?lesson=preview&auth=verified",
    );
  });

  it("never redirects a verified session to an external origin", async () => {
    const response = await confirmEmail(
      new NextRequest(
        "https://elam.example/auth/callback?code=valid-code&next=https%3A%2F%2Fevil.example%2Fsteal-session",
      ),
    );

    expect(response.headers.get("location")).toBe(
      "https://elam.example/account?auth=verified",
    );
  });
});
