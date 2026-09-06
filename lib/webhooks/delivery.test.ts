import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

import { createAdminClient } from "@/lib/supabase/admin";
import { beginWebhookDelivery, finishWebhookDelivery } from "./delivery";

const rpc = vi.fn();
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(createAdminClient).mockReturnValue({ rpc } as never);
});

describe("webhook delivery tracking", () => {
  it("returns the database attempt number", async () => {
    rpc.mockResolvedValue({ data: [{ delivery_id: 7, delivery_attempt_count: 2 }], error: null });
    await expect(beginWebhookDelivery({ provider: "moyasar", eventKey: "event", eventType: "paid", resourceId: "payment", requestId: "request" })).resolves.toEqual({ id: 7, attemptCount: 2 });
  });

  it("stores a safe failure code", async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    await finishWebhookDelivery(7, "failed", "provider_unavailable");
    expect(rpc).toHaveBeenCalledWith("finish_webhook_delivery", expect.objectContaining({ target_status: "failed", target_error_code: "provider_unavailable" }));
  });
});
