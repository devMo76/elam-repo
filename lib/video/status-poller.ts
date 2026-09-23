export const VIDEO_STATUS_POLL_DELAYS = [5_000, 10_000, 20_000, 30_000] as const;

type PollableVideoState = {
  mediaStatus: "absent" | "uploading" | "processing" | "ready" | "failed";
  isClientUpload: boolean;
  isPreparing: boolean;
  isCancelled: boolean;
};

export function shouldPollVideoStatus(state: PollableVideoState) {
  return (
    !state.isClientUpload &&
    !state.isPreparing &&
    !state.isCancelled &&
    (state.mediaStatus === "uploading" || state.mediaStatus === "processing")
  );
}

type TimerHandle = ReturnType<typeof setTimeout>;

type StatusPollerOptions = {
  poll: () => Promise<void> | void;
  isVisible: () => boolean;
  delays?: readonly number[];
  setTimer?: (callback: () => void, delay: number) => TimerHandle;
  clearTimer?: (timer: TimerHandle) => void;
};

export type StatusPoller = {
  start: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
};

/**
 * Runs one status request at a time and gradually reduces provider traffic.
 * Browser visibility events are intentionally owned by the caller so this
 * scheduler remains deterministic and testable without a DOM.
 */
export function createStatusPoller({
  poll,
  isVisible,
  delays = VIDEO_STATUS_POLL_DELAYS,
  setTimer = setTimeout,
  clearTimer = clearTimeout,
}: StatusPollerOptions): StatusPoller {
  if (delays.length === 0 || delays.some((delay) => delay < 0)) {
    throw new Error("At least one non-negative polling delay is required.");
  }

  let attempt = 0;
  let timer: TimerHandle | null = null;
  let running = false;
  let stopped = true;
  let runAfterCurrent = false;

  function clearScheduledPoll() {
    if (timer === null) return;
    clearTimer(timer);
    timer = null;
  }

  function schedule() {
    clearScheduledPoll();
    if (stopped || running || !isVisible()) return;

    const delay = delays[Math.min(attempt, delays.length - 1)];
    timer = setTimer(() => {
      timer = null;
      void run();
    }, delay);
  }

  async function run() {
    if (stopped || !isVisible()) return;
    if (running) {
      runAfterCurrent = true;
      return;
    }

    running = true;
    try {
      await poll();
    } finally {
      running = false;
      attempt += 1;

      if (runAfterCurrent) {
        runAfterCurrent = false;
        if (!stopped && isVisible()) void run();
        return;
      }

      schedule();
    }
  }

  return {
    start() {
      if (!stopped) return;
      stopped = false;
      attempt = 0;
      schedule();
    },
    pause() {
      clearScheduledPoll();
      runAfterCurrent = false;
    },
    resume() {
      if (stopped || !isVisible()) return;
      clearScheduledPoll();
      // The immediate resume check replaces the first scheduled attempt.
      attempt = -1;
      void run();
    },
    stop() {
      stopped = true;
      runAfterCurrent = false;
      clearScheduledPoll();
    },
  };
}
