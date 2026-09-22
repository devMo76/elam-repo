import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("./access", () => ({ requireInstructorAuthoringContext: vi.fn() }));

import { requireInstructorAuthoringContext } from "./access";
import { getInstructorPublishingCapability } from "./capabilities";

function contextWithSetting(value: boolean) {
  const single = vi.fn().mockResolvedValue({
    data: { instructor_direct_publish: value },
    error: null,
  });
  const eq = vi.fn(() => ({ single }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));
  vi.mocked(requireInstructorAuthoringContext).mockResolvedValue({
    supabase: { from } as never,
    user: { id: "11111111-1111-4111-8111-111111111111" } as never,
  });
}

describe("instructor publishing capability", () => {
  beforeEach(() => vi.clearAllMocks());

  it("uses review as the standard instructor workflow", async () => {
    contextWithSetting(false);
    await expect(getInstructorPublishingCapability()).resolves.toEqual({
      canDirectPublish: false,
      primaryWorkflow: "review",
    });
  });

  it("exposes direct publishing only when the platform capability is enabled", async () => {
    contextWithSetting(true);
    await expect(getInstructorPublishingCapability()).resolves.toEqual({
      canDirectPublish: true,
      primaryWorkflow: "direct_publish",
    });
  });

  it("fails closed when the capability cannot be read", async () => {
    const single = vi.fn().mockResolvedValue({ data: null, error: { code: "failure" } });
    const eq = vi.fn(() => ({ single }));
    const select = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ select }));
    vi.mocked(requireInstructorAuthoringContext).mockResolvedValue({
      supabase: { from } as never,
      user: { id: "11111111-1111-4111-8111-111111111111" } as never,
    });

    await expect(getInstructorPublishingCapability()).rejects.toMatchObject({
      code: "publishing_capability_failed",
      status: 500,
    });
  });
});
