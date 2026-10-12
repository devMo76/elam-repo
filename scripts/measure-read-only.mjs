import { performance } from "node:perf_hooks";

const base = process.env.MEASURE_BASE_URL;
if (!base) {
  console.error("Set MEASURE_BASE_URL to an isolated staging origin. This script makes only GET requests.");
  process.exitCode = 2;
} else {
  const origin = new URL(base);
  if (origin.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(origin.hostname)) {
    throw new Error("HTTPS is required outside localhost");
  }
  const paths = ["/", "/courses", "/auth/sign-in"];
  const cohorts = [10, 20, 50];
  for (const concurrency of cohorts) {
    const samples = await Promise.all(Array.from({ length: concurrency }, async (_, index) => {
      const url = new URL(paths[index % paths.length], origin);
      const started = performance.now();
      try {
        const response = await fetch(url, {
          redirect: "manual",
          signal: AbortSignal.timeout(15_000),
          headers: { "User-Agent": "Elam-read-only-release-measurement/1.0" },
        });
        await response.arrayBuffer();
        return { path: url.pathname, status: response.status, ms: Math.round(performance.now() - started) };
      } catch (error) {
        return { path: url.pathname, status: "error", ms: Math.round(performance.now() - started), error: String(error) };
      }
    }));
    const timings = samples.map(({ ms }) => ms).sort((a, b) => a - b);
    console.log(JSON.stringify({
      origin: origin.origin,
      concurrency,
      count: samples.length,
      p50_ms: timings[Math.ceil(timings.length * 0.5) - 1],
      p95_ms: timings[Math.ceil(timings.length * 0.95) - 1],
      max_ms: timings.at(-1),
      failures: samples.filter(({ status }) => typeof status !== "number" || status >= 400),
    }));
  }
}
