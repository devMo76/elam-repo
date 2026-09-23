import type { ReactNode } from "react";

import { InstructorShell } from "@/components/instructor/InstructorShell";
import { InstructorNavigationBlockerProvider } from "@/components/instructor/InstructorNavigationBlocker";
import { InstructorUploadProvider } from "@/components/instructor/InstructorUploadManager";
import { getViewer } from "@/lib/auth/viewer";

/** Keeps the studio navigation mounted during client-side route changes. */
export default async function StudioLayout({ children }: { children: ReactNode }) {
  const viewer = await getViewer();

  return (
    <InstructorUploadProvider>
      <InstructorNavigationBlockerProvider>
        {viewer?.role === "instructor" ? (
          <InstructorShell viewer={viewer}>{children}</InstructorShell>
        ) : children}
      </InstructorNavigationBlockerProvider>
    </InstructorUploadProvider>
  );
}
