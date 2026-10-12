import { execFile } from "node:child_process";
import { createServer } from "node:http";
import { promisify } from "node:util";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const script = resolve(process.cwd(), "scripts/trigger-payment-receipts.mjs");
const secret = "receipt-worker-secret-that-is-long-enough";

describe("Railway payment receipt job", () => {
  it("calls the worker with the shared secret and exits after success", async () => {
    let requestPath: string | undefined;
    let authorization: string | undefined;
    const server = createServer((request, response) => {
      requestPath = request.url;
      authorization = request.headers.authorization;
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify({ data: { selected: 1, sent: 1, failed: 0, skipped: 0 } }));
    });
    await new Promise<void>((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));

    try {
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("Missing server port");
      const { stdout } = await execFileAsync(process.execPath, [script], {
        env: {
          ...process.env,
          RECEIPT_WORKER_URL: `http://127.0.0.1:${address.port}`,
          PAYMENT_RECEIPT_WORKER_SECRET: secret,
        },
        timeout: 5_000,
      });

      expect(requestPath).toBe("/api/jobs/payment-receipts");
      expect(authorization).toBe(`Bearer ${secret}`);
      expect(JSON.parse(stdout)).toEqual({ selected: 1, sent: 1, failed: 0, skipped: 0 });
    } finally {
      server.close();
    }
  });

  it("refuses to run without a configured secret", async () => {
    await expect(execFileAsync(process.execPath, [script], {
      env: {
        ...process.env,
        RECEIPT_WORKER_URL: "http://127.0.0.1:3001",
        PAYMENT_RECEIPT_WORKER_SECRET: "",
      },
      timeout: 5_000,
    })).rejects.toMatchObject({ code: 2 });
  });
});
