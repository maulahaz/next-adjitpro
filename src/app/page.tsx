import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { homePathForRole } from "@/lib/auth/guard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getSessionUser();
  redirect(user ? homePathForRole(user.role) : "/login");
}
