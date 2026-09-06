import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/admin/directory", () => ({ getAdminUsers: vi.fn(), getAdminAuditHistory: vi.fn() }));
vi.mock("@/lib/auth/authorization", () => ({ requireAdmin: vi.fn() }));

import { GET as getAudit } from "@/app/api/admin/audit/route";
import { GET as getUsers } from "@/app/api/admin/users/route";
import { getAdminAuditHistory, getAdminUsers } from "@/lib/admin/directory";
import { requireAdmin } from "@/lib/auth/authorization";

afterEach(() => vi.clearAllMocks());
const authorize = () => vi.mocked(requireAdmin).mockResolvedValue({ authorized: true, supabase: {}, user: { id: "30000000-0000-4000-8000-000000000001" } } as never);

describe("admin directory routes", () => {
  it("lists filtered users without caching", async () => {
    authorize();
    vi.mocked(getAdminUsers).mockResolvedValue({ data: [], pagination: { page: 1, pageSize: 20, totalCount: 0, totalPages: 0 } });
    const response = await getUsers(new Request("http://localhost/api/admin/users?role=instructor"));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(getAdminUsers).toHaveBeenCalledWith({}, { role: "instructor", page: 1, pageSize: 20 });
  });

  it("rejects invalid user roles before service access", async () => {
    authorize();
    const response = await getUsers(new Request("http://localhost/api/admin/users?role=owner"));
    expect(response.status).toBe(422);
    expect(getAdminUsers).not.toHaveBeenCalled();
  });

  it("lists audit records by action", async () => {
    authorize();
    vi.mocked(getAdminAuditHistory).mockResolvedValue({ data: [], pagination: { page: 1, pageSize: 20, totalCount: 0, totalPages: 0 } });
    const response = await getAudit(new Request("http://localhost/api/admin/audit?action=role.change"));
    expect(response.status).toBe(200);
    expect(getAdminAuditHistory).toHaveBeenCalledWith({}, { action: "role.change", page: 1, pageSize: 20 });
  });
});
