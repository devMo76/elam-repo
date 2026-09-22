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

import { POST as register } from "@/app/api/auth/register/route";
import { POST as resendConfirmation } from "@/app/api/auth/resend-confirmation/route";
import { GET as confirmEmail } from "@/app/auth/callback/route";
import { createClient } from "@/lib/supabase/server";
import { NextRequest } from "next/server";

const signUp = vi.fn();
const resend = vi.fn();
const exchangeCodeForSession = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  signUp.mockResolvedValue({ data: {}, error: null });
  resend.mockResolvedValue({ data: {}, error: null });
  exchangeCodeForSession.mockResolvedValue({ data: {}, error: null });
  vi.mocked(createClient).mockResolvedValue({
    auth: { signUp, resend, exchangeCodeForSession },
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
