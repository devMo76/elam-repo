import { loadTestConfig, scenarioRequest } from "./config.mjs";

const config = loadTestConfig();
const request = scenarioRequest(config);
const deadline = Date.now() + config.durationSeconds * 1000;
const measurements = [];

async function virtualUser() {
  while (Date.now() < deadline) {
    const started = performance.now();
    try {
      const response = await fetch(new URL(request.path, config.target), request.options);
      await response.arrayBuffer();
      measurements.push({ duration: performance.now() - started, status: response.status });
    } catch {
      measurements.push({ duration: performance.now() - started, status: 0 });
    }
  }
}

console.log(`Starting ${config.scenario} test: ${config.concurrency} users for ${config.durationSeconds}s against ${config.target.origin}`);
await Promise.all(Array.from({ length: config.concurrency }, () => virtualUser()));

const durations = measurements.map(({ duration }) => duration).sort((a, b) => a - b);
const successes = measurements.filter(({ status }) => status >= 200 && status < 400).length;
const statusCounts = Object.fromEntries(
  [...new Set(measurements.map(({ status }) => status))]
    .sort((a, b) => a - b)
    .map((status) => [status, measurements.filter((item) => item.status === status).length]),
);
const percentile = (fraction) => durations[Math.min(durations.length - 1, Math.floor(durations.length * fraction))] ?? 0;
const successRate = measurements.length ? successes / measurements.length : 0;

console.table({
  requests: measurements.length,
  successRate: `${(successRate * 100).toFixed(2)}%`,
  p50Ms: Math.round(percentile(0.5)),
  p95Ms: Math.round(percentile(0.95)),
  p99Ms: Math.round(percentile(0.99)),
});
console.log("HTTP status counts:", statusCounts);

if (successRate < 0.99 || percentile(0.95) > 1500) process.exitCode = 1;
