import { redirect } from "next/navigation";

import { getRoleHomePath, getViewer } from "@/lib/auth/viewer";

export default async function AccountPage() {
  const viewer = await getViewer();
  redirect(viewer === null ? "/auth/sign-in?next=%2Faccount" : getRoleHomePath(viewer.role));
}
