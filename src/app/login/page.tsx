import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { homePathForRole } from "@/lib/auth/guard";
import { APP_NAME } from "@/lib/constants";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) redirect(homePathForRole(user.role));

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center text-white">
          <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-blue-600 text-2xl font-black shadow-lg">
            A
          </div>
          <h1 className="text-2xl font-bold tracking-tight">AdjitPro</h1>
          {/* <p className="mt-1 text-sm text-blue-100/80">{APP_NAME}</p> */}
        </div>
        <LoginForm />
        {/* <p className="mt-4 text-center text-xs text-blue-100/60">
          Login default pertama kali: <span className="font-mono">admin / admin123</span> — segera
          ganti password Anda.
        </p> */}
      </div>
    </div>
  );
}
