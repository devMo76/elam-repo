import type { ReactNode } from "react";

import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="relative flex-1" id="main-content" tabIndex={-1}>
        <span
          id="header-sentinel"
          aria-hidden="true"
          className="pointer-events-none absolute top-0 h-px w-px"
        />
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
