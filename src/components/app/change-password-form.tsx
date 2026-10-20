"use client";

import { useActionState } from "react";
import { changePasswordAction } from "@/app/actions/auth";
import { initialActionState } from "@/lib/action-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/app/field";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(changePasswordAction, initialActionState);

  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle>Ganti Password</CardTitle>
        {/* <CardDescription>Masukkan password lama dan password baru Anda (minimal 6 karakter).</CardDescription> */}
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {state.message ? (
            <Alert variant={state.ok ? "success" : "destructive"}>
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          ) : null}

          <Field label="Password Lama" htmlFor="oldPassword" required>
            <Input id="oldPassword" name="oldPassword" type="password" required autoComplete="current-password" />
          </Field>
          <Field label="Password Baru" htmlFor="newPassword" required hint="Minimal 6 karakter.">
            <Input id="newPassword" name="newPassword" type="password" minLength={6} required autoComplete="new-password" />
          </Field>

          <Button type="submit" disabled={pending}>
            {pending ? "Menyimpan..." : "Simpan Password Baru"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
