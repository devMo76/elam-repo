import { describe, expect, it } from "vitest";

import { getInstructorEditPolicy } from "./edit-policy";

describe("instructor course edit policy", () => {
  it("keeps full draft authoring available to the owner", () => {
    const policy = getInstructorEditPolicy({ status: "draft", isOwner: true });
    expect(policy.canEditDescription).toBe(true);
    expect(policy.canPrepareAdditions).toBe(true);
    expect(policy.canChangePriceOrSlug).toBe(true);
    expect(policy.canReplaceExistingMedia).toBe(true);
    expect(policy.canRemoveExistingContent).toBe(true);
    expect(policy.canReleasePreparedAdditions).toBe(false);
  });

  it("defaults published editing to locked", () => {
    const policy = getInstructorEditPolicy({ status: "published", isOwner: true });
    expect(policy.canInspect).toBe(true);
    expect(policy.canEditDescription).toBe(false);
    expect(policy.canPrepareAdditions).toBe(false);
    expect(policy.reason).toBe("published_locked");
  });

  it("allows bounded edits without granting destructive permissions", () => {
    const policy = getInstructorEditPolicy({ status: "published", isOwner: true, publishedEditsAllowed: true });
    expect(policy.canEditDescription).toBe(true);
    expect(policy.canPrepareAdditions).toBe(true);
    expect(policy.canReleasePreparedAdditions).toBe(true);
    expect(policy.canChangePriceOrSlug).toBe(false);
    expect(policy.canEditExistingCurriculum).toBe(false);
    expect(policy.canReplaceExistingMedia).toBe(false);
    expect(policy.canRemoveExistingContent).toBe(false);
  });

  it.each(["draft", "in_review", "published", "archived"] as const)("denies a non-owner in %s even with the live permission", (status) => {
    const policy = getInstructorEditPolicy({ status, isOwner: false, publishedEditsAllowed: true });
    expect(Object.entries(policy).filter(([key]) => key.startsWith("can")).every(([, value]) => value === false)).toBe(true);
    expect(policy.reason).toBe("not_owner");
  });

  it.each(["in_review", "archived"] as const)("keeps %s read-only regardless of the live permission", (status) => {
    const policy = getInstructorEditPolicy({ status, isOwner: true, publishedEditsAllowed: true });
    expect(policy.canInspect).toBe(true);
    expect(Object.entries(policy).filter(([key]) => key.startsWith("can") && key !== "canInspect").every(([, value]) => value === false)).toBe(true);
  });
});
