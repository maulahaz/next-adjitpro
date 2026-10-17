"use client";

import { useActionState } from "react";
import { KeyRound, User } from "lucide-react";
import { loginAction } from "@/app/actions/auth";
import { initialActionState } from "@/lib/action-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/app/field";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialActionState);

  return (
    <form action={formAction} className="space-y-4 rounded-xl border bg-card p-6 shadow-xl">
      <div>
        <h2 className="text-lg font-semibold">Masuk</h2>
        <p className="text-sm text-muted-foreground">Gunakan username dan password Anda.</p>
      </div>

      {!state.ok && state.message ? (
        <Alert variant="destructive">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      <Field label="Username" htmlFor="username" required>
        <div className="relative">
          <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="username"
            name="username"
            autoComplete="username"
            required
            className="pl-9"
            placeholder="mis. admin"
          />
        </div>
      </Field>

      <Field label="Password" htmlFor="password" required>
        <div className="relative">
          <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="pl-9"
            placeholder="••••••"
          />
        </div>
      </Field>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Memproses..." : "Masuk"}
      </Button>
    </form>
  );
}
