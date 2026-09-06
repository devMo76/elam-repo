import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/authorization", () => ({ requireAdmin: vi.fn() }));
vi.mock("@/lib/admin/webhooks", () => ({ getAdminWebhookDeliveries: vi.fn() }));

import { GET } from "@/app/api/admin/webhooks/route";
import { getAdminWebhookDeliveries } from "@/lib/admin/webhooks";
import { requireAdmin } from "@/lib/auth/authorization";

beforeEach(() => vi.clearAllMocks());

describe("admin webhook history route", () => {
  it("returns filtered delivery history to administrators", async () => {
    const supabase = {} as never;
    vi.mocked(requireAdmin).mockResolvedValue({ authorized: true, supabase, user: {} as never });
    vi.mocked(getAdminWebhookDeliveries).mockResolvedValue({ data: [], pagination: { page: 1, pageSize: 20, totalCount: 0, totalPages: 0 } });

    const response = await GET(new Request("https://elam.test/api/admin/webhooks?status=failed"));
    expect(response.status).toBe(200);
    expect(getAdminWebhookDeliveries).toHaveBeenCalledWith(supabase, { status: "failed", page: 1, pageSize: 20 });
  });
});
