import type { Metadata } from "next";
import { PolicyContent } from "@/components/legal/PolicyContent";
import { PublicShell } from "@/components/marketing/PublicShell";
import { policyTitle } from "@/lib/policies";

export const metadata: Metadata = {
  title: `${policyTitle} | إلام`,
  description: "سياسات الخصوصية والاستخدام والاسترداد وشروط الشارحين في منصة إلام.",
};

export default function PoliciesPage() {
  return <PublicShell><PolicyContent /></PublicShell>;
}
