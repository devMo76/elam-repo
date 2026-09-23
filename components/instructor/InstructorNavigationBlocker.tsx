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
  isBlocked: boolean;
  confirmNavigation: () => boolean;
  setSourceDirty: (sourceId: string, dirty: boolean) => void;
};

const NavigationBlockerContext = createContext<NavigationBlockerValue | null>(null);

export function InstructorNavigationBlockerProvider({ children }: { children: ReactNode }) {
  const [dirtySources, setDirtySources] = useState<ReadonlySet<string>>(() => new Set());
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
    () => !isBlocked || window.confirm(leaveMessage),
    [isBlocked],
  );

  useEffect(() => {
    if (!isBlocked) return;

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
  }, [confirmNavigation, isBlocked]);

  const value = useMemo(
    () => ({ confirmNavigation, isBlocked, setSourceDirty }),
    [confirmNavigation, isBlocked, setSourceDirty],
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
  return context ?? { confirmNavigation: () => true, isBlocked: false, setSourceDirty: () => undefined };
}

export function InstructorLink({ onNavigate, ...props }: ComponentProps<typeof Link>) {
  const { confirmNavigation, isBlocked } = useInstructorNavigationBlocker();

  return (
    <Link
      {...props}
      onNavigate={(event) => {
        onNavigate?.(event);
        if (!isBlocked) return;
        if (!confirmNavigation()) event.preventDefault();
      }}
    />
  );
}
