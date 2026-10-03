const baseUrl = process.env.RECEIPT_WORKER_URL;
const secret = process.env.PAYMENT_RECEIPT_WORKER_SECRET;

if (!baseUrl || !secret || secret.length < 32) {
  console.error("Receipt job requires RECEIPT_WORKER_URL and a 32+ character PAYMENT_RECEIPT_WORKER_SECRET.");
  process.exitCode = 2;
} else {
  const url = new URL("/api/jobs/payment-receipts", baseUrl);
  if (url.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(url.hostname)) {
    throw new Error("Receipt worker URL must use HTTPS outside localhost.");
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) {
      console.error(`Receipt worker returned HTTP ${response.status}.`);
      process.exitCode = 1;
    } else {
      const payload = await response.json();
      const summary = payload?.data;
      console.log(JSON.stringify({
        selected: summary?.selected,
        sent: summary?.sent,
        failed: summary?.failed,
        skipped: summary?.skipped,
      }));
    }
  } catch (error) {
    console.error(`Receipt worker request failed: ${error instanceof Error ? error.name : "unknown error"}.`);
    process.exitCode = 1;
  }
}
