"use client";

import Link from "next/link";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";

const leaveMessage = "لديك تغييرات غير محفوظة. هل تريد مغادرة الصفحة دون حفظها؟";

type NavigationBlockerValue = {
  isBusy: boolean;
  setSourceBusy: (sourceId: string, busy: boolean) => void;
  isBlocked: boolean;
  confirmNavigation: () => boolean;
  setSourceDirty: (sourceId: string, dirty: boolean) => void;
};

const NavigationBlockerContext = createContext<NavigationBlockerValue | null>(null);

export function InstructorNavigationBlockerProvider({ children }: { children: ReactNode }) {
  const [dirtySources, setDirtySources] = useState<ReadonlySet<string>>(() => new Set());
  const [busySources, setBusySources] = useState<ReadonlySet<string>>(() => new Set());
  const isBusy = busySources.size > 0;
  const setSourceBusy = useCallback((sourceId: string, busy: boolean) => {
    setBusySources((current) => {
      const next = new Set(current);
      if (busy) next.add(sourceId); else next.delete(sourceId);
      return next;
    });
  }, []);
  const restoringHistory = useRef(false);
  const isBlocked = dirtySources.size > 0;

  const setSourceDirty = useCallback((sourceId: string, dirty: boolean) => {
    setDirtySources((current) => {
      const next = new Set(current);
      if (dirty) next.add(sourceId);
      else next.delete(sourceId);
      return next;
    });
  }, []);
  const confirmNavigation = useCallback(
    () => !isBusy && (!isBlocked || window.confirm(leaveMessage)),
    [isBlocked, isBusy],
  );

  useEffect(() => {
    if (!isBlocked && !isBusy) return;

    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    const warnBeforeHistoryNavigation = (event: PopStateEvent) => {
      if (restoringHistory.current) {
        restoringHistory.current = false;
        return;
      }

      if (confirmNavigation()) return;
      event.stopImmediatePropagation();
      restoringHistory.current = true;
      window.history.forward();
    };

    window.addEventListener("beforeunload", warnBeforeUnload);
    window.addEventListener("popstate", warnBeforeHistoryNavigation, true);
    return () => {
      window.removeEventListener("beforeunload", warnBeforeUnload);
      window.removeEventListener("popstate", warnBeforeHistoryNavigation, true);
    };
  }, [confirmNavigation, isBlocked, isBusy]);

  const value = useMemo(
    () => ({ confirmNavigation, isBlocked, setSourceDirty, isBusy, setSourceBusy }),
    [confirmNavigation, isBlocked, setSourceDirty, isBusy, setSourceBusy],
  );
  return <NavigationBlockerContext.Provider value={value}>{children}</NavigationBlockerContext.Provider>;
}

export function useInstructorUnsavedChanges(dirty: boolean) {
  const context = useContext(NavigationBlockerContext);
  const setSourceDirty = context?.setSourceDirty;
  const sourceId = useId();

  useEffect(() => {
    setSourceDirty?.(sourceId, dirty);
    return () => setSourceDirty?.(sourceId, false);
  }, [dirty, setSourceDirty, sourceId]);
}

export function useInstructorNavigationBlocker() {
  const context = useContext(NavigationBlockerContext);
  return context ?? { confirmNavigation: () => true, isBlocked: false, isBusy: false, setSourceDirty: () => undefined, setSourceBusy: () => undefined };
}

export function useInstructorPendingOperation(busy: boolean) {
  const context = useContext(NavigationBlockerContext);
  const setSourceBusy = context?.setSourceBusy;
  const sourceId = useId();
  useEffect(() => {
    setSourceBusy?.(sourceId, busy);
    return () => setSourceBusy?.(sourceId, false);
  }, [busy, setSourceBusy, sourceId]);
}

export function InstructorLink({ onNavigate, ...props }: ComponentProps<typeof Link>) {
  const { confirmNavigation } = useInstructorNavigationBlocker();

  return (
    <Link
      {...props}
      onNavigate={(event) => {
        if (!confirmNavigation()) { event.preventDefault(); return; }
        onNavigate?.(event);
      }}
    />
  );
}
