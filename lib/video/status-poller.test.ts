import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createStatusPoller, shouldPollVideoStatus } from "./status-poller";

describe("shouldPollVideoStatus", () => {
  const base = { isClientUpload: false, isPreparing: false, isCancelled: false };

  it("stops after webhook/provider terminal states", () => {
    expect(shouldPollVideoStatus({ ...base, mediaStatus: "ready" })).toBe(false);
    expect(shouldPollVideoStatus({ ...base, mediaStatus: "failed" })).toBe(false);
  });

  it("polls provider-managed uploading and processing states only", () => {
    expect(shouldPollVideoStatus({ ...base, mediaStatus: "uploading" })).toBe(true);
    expect(shouldPollVideoStatus({ ...base, mediaStatus: "processing" })).toBe(true);
    expect(shouldPollVideoStatus({ ...base, mediaStatus: "absent" })).toBe(false);
    expect(shouldPollVideoStatus({ ...base, mediaStatus: "processing", isCancelled: true })).toBe(false);
  });
});

describe("createStatusPoller", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("backs off from 5 to 10 to 20 to 30 seconds", async () => {
    const poll = vi.fn();
    const poller = createStatusPoller({ poll, isVisible: () => true });

    poller.start();
    await vi.advanceTimersByTimeAsync(4_999);
    expect(poll).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(poll).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(poll).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(20_000);
    expect(poll).toHaveBeenCalledTimes(3);
    await vi.advanceTimersByTimeAsync(30_000);
    expect(poll).toHaveBeenCalledTimes(4);
    await vi.advanceTimersByTimeAsync(30_000);
    expect(poll).toHaveBeenCalledTimes(5);
  });

  it("pauses while hidden and checks immediately when resumed", async () => {
    let visible = true;
    const poll = vi.fn();
    const poller = createStatusPoller({ poll, isVisible: () => visible });

    poller.start();
    visible = false;
    poller.pause();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(poll).not.toHaveBeenCalled();

    visible = true;
    poller.resume();
    await vi.runAllTicks();
    expect(poll).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(5_000);
    expect(poll).toHaveBeenCalledTimes(2);
  });

  it("cleans up its timer and ignores later resume calls after stopping", async () => {
    const poll = vi.fn();
    const poller = createStatusPoller({ poll, isVisible: () => true });

    poller.start();
    poller.stop();
    poller.resume();
    await vi.advanceTimersByTimeAsync(60_000);

    expect(poll).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});
