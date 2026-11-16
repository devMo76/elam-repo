import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/catalogue/queries", () => ({ listPublishedCourseDetails: vi.fn() }));
import Home from "@/app/(marketing)/page";
import { FeaturedCourse } from "@/components/sections/FeaturedCourse";
import { listPublishedCourseDetails } from "@/lib/catalogue/queries";

function findFeatured(node: ReactNode): ReactElement<{ course: unknown }> | undefined {
  for (const child of Children.toArray(node)) {
    if (!isValidElement<{ children?: ReactNode }>(child)) continue;
    if (child.type === FeaturedCourse) return child as ReactElement<{ course: unknown }>;
    const nested = findFeatured(child.props.children);
    if (nested) return nested;
  }
}

afterEach(() => vi.resetAllMocks());
describe("homepage latest published course", () => {
  it("shows the newest result even when an older course is free", async () => {
    // The existing query orders published_at descending, then slug.
    const newestPaid = { id: "newest", priceHalalas: 10000 };
    const olderFree = { id: "older", priceHalalas: 0 };
    vi.mocked(listPublishedCourseDetails).mockResolvedValue([newestPaid, olderFree] as never);
    const page = await Home({ searchParams: Promise.resolve({}) });
    expect(findFeatured(page)?.props.course).toBe(newestPaid);
  });
});
