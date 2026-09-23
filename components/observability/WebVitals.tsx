"use client";

import { useReportWebVitals } from "next/web-vitals";

import type { WebVitalPayload } from "@/lib/observability/contracts";
import { classifyPerformanceRoute } from "@/lib/observability/routes";

const coreMetrics = new Set(["CLS", "INP", "LCP"]);
const configuredSampleRate = Number(
  process.env.NEXT_PUBLIC_PERFORMANCE_SAMPLE_RATE ??
    (process.env.NODE_ENV === "production" ? "0.1" : "1"),
);
const sampleRate = Number.isFinite(configuredSampleRate)
  ? Math.min(1, Math.max(0, configuredSampleRate))
  : 0.1;
const release =
  process.env.NEXT_PUBLIC_APP_RELEASE ??
  process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ??
  "development";

function getDeviceCategory(): WebVitalPayload["device"] {
  if (window.innerWidth < 768) return "mobile";
  if (window.innerWidth < 1024) return "tablet";
  return "desktop";
}

function sendMetric(payload: WebVitalPayload) {
  const body = JSON.stringify(payload);

  if (
    navigator.sendBeacon?.(
      "/api/telemetry/web-vitals",
      new Blob([body], { type: "application/json" }),
    )
  ) {
    return;
  }

  void fetch("/api/telemetry/web-vitals", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => undefined);
}

const reportWebVital: Parameters<typeof useReportWebVitals>[0] = (metric) => {
  if (!coreMetrics.has(metric.name) || Math.random() > sampleRate) return;

  sendMetric({
    metric: metric.name as WebVitalPayload["metric"],
    value: metric.value,
    rating: metric.rating,
    id: metric.id,
    navigationType: metric.navigationType,
    route: classifyPerformanceRoute(window.location.pathname),
    device: getDeviceCategory(),
    release,
    sampleRate,
  });
};

export function WebVitals() {
  useReportWebVitals(reportWebVital);
  return null;
}
