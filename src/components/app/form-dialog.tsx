"use client";

import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { initialActionState, type ActionState } from "@/lib/action-types";

export type FormAction = (state: ActionState, formData: FormData) => Promise<ActionState>;

/**
 * Dialog + form generik untuk Server Action.
 * - Menampilkan error dari server (pesan Bahasa Indonesia asli aplikasi lama).
 * - Toast sukses + tutup dialog + reset form.
 * - Sesi berakhir -> arahkan ke /login.
 */
export function FormDialog({
  trigger,
  title,
  description,
  action,
  children,
  submitLabel = "Simpan",
  submitVariant = "default",
  pendingLabel = "Menyimpan...",
  onSuccess,
}: {
  trigger: React.ReactNode;
  title: string;
  description?: string;
  action: FormAction;
  children?: React.ReactNode;
  submitLabel?: string;
  submitVariant?: "default" | "destructive";
  pendingLabel?: string;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [formKey, setFormKey] = React.useState(0);
  const [state, formAction, pending] = useActionState(action, initialActionState);
  const lastHandled = React.useRef<ActionState | null>(null);

  React.useEffect(() => {
    if (!state.message || lastHandled.current === state) return;
    lastHandled.current = state;

    if (state.sessionExpired) {
      toast.error(state.message);
      router.replace("/login");
      return;
    }
    if (state.ok) {
      toast.success(state.message);
      setOpen(false);
      setFormKey((k) => k + 1);
      onSuccess?.();
      router.refresh();
    }
  }, [state, router, onSuccess]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>

        <form key={formKey} action={formAction} className="space-y-4">
          {children}

          {!state.ok && state.message ? (
            <Alert variant="destructive">
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button type="submit" variant={submitVariant} disabled={pending}>
              {pending ? pendingLabel : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Tombol konfirmasi (untuk aksi hapus). */
export function ConfirmDialog({
  trigger,
  title,
  description,
  action,
  hidden,
  confirmLabel = "Hapus",
  onSuccess,
}: {
  trigger: React.ReactNode;
  title: string;
  description?: string;
  action: FormAction;
  hidden: Record<string, string>;
  confirmLabel?: string;
  onSuccess?: () => void;
}) {
  return (
    <FormDialog
      trigger={trigger}
      title={title}
      description={description}
      action={action}
      submitLabel={confirmLabel}
      submitVariant="destructive"
      pendingLabel="Memproses..."
      onSuccess={onSuccess}
    >
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
    </FormDialog>
  );
}
