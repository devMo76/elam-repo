import { useEffect, type ComponentProps } from "react";

export function TestLink({ children, ...props }: ComponentProps<"a">) {
  return <a {...props}>{children}</a>;
}
let loaded = false;
export function TestScript({ onLoad, onReady }: { onLoad?: () => void; onReady?: () => void }) {
  useEffect(() => {
    if (!loaded) { loaded = true; onLoad?.(); }
    onReady?.();
    // Match Next Script: onLoad once per script, onReady on every mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
export function useRouter() {
  return { replace: (url: string) => window.history.replaceState(null, "", url), refresh: () => window.dispatchEvent(new Event("fixture:refresh")) };
}
export function usePathname() { return "/learn/courses/example"; }
export function useSearchParams() { return new URLSearchParams(window.location.search); }
