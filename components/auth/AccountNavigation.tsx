import Link from "next/link";

import { getRoleHomePath, type Viewer } from "@/lib/auth/viewer";

import { SignOutButton } from "./SignOutButton";

const roleLabel = {
  learner: "لوحة التعلّم",
  instructor: "استوديو المدرّس",
  admin: "الإدارة",
};

export function AccountNavigation({ viewer }: { viewer: Viewer | null }) {
  if (viewer === null) return null;

  return <div className="accountNavigation"><Link href={getRoleHomePath(viewer.role)}>{roleLabel[viewer.role]}</Link><SignOutButton /></div>;
}
