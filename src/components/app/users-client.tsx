"use client";

import * as React from "react";
import { KeyRound, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, SelectInput } from "@/components/app/field";
import { FormDialog, ConfirmDialog } from "@/components/app/form-dialog";
import { DataTable } from "@/components/app/data-table";
import { StatusPill } from "@/components/app/ui-helpers";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableHead, TableRow } from "@/components/ui/table";
import { deleteUserAction, resetUserPasswordAction, saveUserAction } from "@/app/actions/users";
import { DEFAULT_RESET_PASSWORD } from "@/lib/constants";
import { ROLE_LABEL } from "@/lib/domain/permissions";
import type { UserDTO } from "@/lib/services/users";
import type { InvestorDTO } from "@/lib/services/investors";
import type { ThirdPartyDTO } from "@/lib/services/third-parties";

const ROLE_OPTIONS = [
  { value: "admin", label: "Admin (akses penuh + kelola pengguna)" },
  { value: "operator", label: "Operator (input data)" },
  { value: "investor", label: "Investor (hanya data sendiri)" },
  { value: "client", label: "Client (Pihak Ketiga)" },
];

const STATUS_OPTIONS = [
  { value: "Aktif", label: "Aktif" },
  { value: "Nonaktif", label: "Nonaktif" },
];

export function UsersClient({
  users,
  investors,
  thirdParties,
  currentUserId,
}: {
  users: UserDTO[];
  investors: InvestorDTO[];
  thirdParties: ThirdPartyDTO[];
  currentUserId: string;
}) {
  const investorName = (id: string) => investors.find((i) => i.id === id)?.nama ?? "";
  const tpName = (id: string) => thirdParties.find((t) => t.id === id)?.nama ?? "";

  return (
    <DataTable
      toolbar={
        <FormDialog
          trigger={
            <Button>
              <Plus className="h-4 w-4" /> Pengguna Baru
            </Button>
          }
          title="Tambah Pengguna"
          action={saveUserAction}
        >
          <UserFields investors={investors} thirdParties={thirdParties} />
        </FormDialog>
      }
      searchPlaceholder="Cari pengguna…"
      emptyMessage="Belum ada pengguna."
      head={
        <TableRow>
          <TableHead>Username</TableHead>
          <TableHead>Nama</TableHead>
          <TableHead>Peran</TableHead>
          <TableHead>Tautan</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Login Terakhir</TableHead>
          <TableHead className="text-right">Aksi</TableHead>
        </TableRow>
      }
      searchText={users.map((u) =>
        [
          u.username,
          u.nama,
          ROLE_LABEL[u.role] ?? u.role,
          u.role === "investor" ? investorName(u.investorId) : u.role === "client" ? tpName(u.thirdPartyId) : "",
          u.status,
        ].join(" "),
      )}
      rows={users.map((u) => (
        <TableRow key={u.id}>
          <TableCell className="font-mono text-xs">{u.username}</TableCell>
          <TableCell className="font-medium">{u.nama}</TableCell>
          <TableCell>
            <Badge variant="secondary">{ROLE_LABEL[u.role] ?? u.role}</Badge>
          </TableCell>
          <TableCell className="text-muted-foreground">
            {u.role === "investor" ? investorName(u.investorId) || "-" : null}
            {u.role === "client" ? tpName(u.thirdPartyId) || "-" : null}
            {u.role !== "investor" && u.role !== "client" ? "-" : null}
          </TableCell>
          <TableCell>
            <StatusPill status={u.status} />
          </TableCell>
          <TableCell className="text-xs text-muted-foreground">{u.lastLogin || "-"}</TableCell>
          <TableCell>
            <div className="flex justify-end gap-1">
              <FormDialog
                trigger={
                  <Button variant="ghost" size="icon" aria-label="Ubah">
                    <Pencil className="h-4 w-4" />
                  </Button>
                }
                title="Ubah Pengguna"
                action={saveUserAction}
              >
                <UserFields user={u} investors={investors} thirdParties={thirdParties} />
              </FormDialog>
              <ConfirmDialog
                trigger={
                  <Button variant="ghost" size="icon" aria-label="Reset password">
                    <KeyRound className="h-4 w-4" />
                  </Button>
                }
                title={`Reset Password — ${u.username}`}
                description={`Reset password ${u.username} ke "${DEFAULT_RESET_PASSWORD}"? Pengguna dapat menggantinya nanti lewat menu Ganti Password.`}
                action={resetUserPasswordAction}
                confirmLabel="Reset Password"
                hidden={{ id: u.id }}
              />
              {u.id !== currentUserId ? (
                <ConfirmDialog
                  trigger={
                    <Button variant="ghost" size="icon" aria-label="Hapus" className="text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  }
                  title="Hapus Pengguna"
                  description={`Hapus pengguna ${u.username}?`}
                  action={deleteUserAction}
                  hidden={{ id: u.id }}
                />
              ) : (
                <span className="grid h-9 w-9 place-items-center text-xs text-muted-foreground">•</span>
              )}
            </div>
          </TableCell>
        </TableRow>
      ))}
    />
  );
}

function UserFields({
  user,
  investors,
  thirdParties,
}: {
  user?: UserDTO;
  investors: InvestorDTO[];
  thirdParties: ThirdPartyDTO[];
}) {
  const [role, setRole] = React.useState<string>(user?.role ?? "investor");

  return (
    <>
      {user ? <input type="hidden" name="id" value={user.id} /> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Username" htmlFor="u-username" required hint="Huruf kecil, angka, . _ - (min. 3).">
          <Input id="u-username" name="username" defaultValue={user?.username ?? ""} required minLength={3} />
        </Field>
        <Field label="Nama" htmlFor="u-nama">
          <Input id="u-nama" name="nama" defaultValue={user?.nama ?? ""} />
        </Field>
      </div>

      <Field
        label={user ? "Password (kosongkan bila tidak diubah)" : "Password"}
        htmlFor="u-password"
        required={!user}
        hint="Minimal 6 karakter."
      >
        <Input
          id="u-password"
          name="password"
          type="password"
          minLength={user ? 0 : 6}
          required={!user}
          placeholder={user ? "•••••• (tidak diubah)" : ""}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Peran" htmlFor="u-role" required>
          <SelectInput
            id="u-role"
            name="role"
            options={ROLE_OPTIONS}
            value={role}
            onChange={(e) => setRole(e.target.value)}
          />
        </Field>
        <Field label="Status" htmlFor="u-status">
          <SelectInput id="u-status" name="status" options={STATUS_OPTIONS} defaultValue={user?.status ?? "Aktif"} />
        </Field>
      </div>

      {role === "investor" ? (
        <Field label="Tautkan ke Investor" htmlFor="u-investor" required>
          <SelectInput
            id="u-investor"
            name="investorId"
            required
            placeholder="— pilih investor —"
            defaultValue={user?.investorId ?? ""}
            options={investors.map((i) => ({ value: i.id, label: `${i.nama} (${i.id})` }))}
          />
        </Field>
      ) : null}

      {role === "client" ? (
        <Field label="Tautkan ke Pihak Ketiga" htmlFor="u-tp" required>
          <SelectInput
            id="u-tp"
            name="thirdPartyId"
            required
            placeholder="— pilih pihak ketiga —"
            defaultValue={user?.thirdPartyId ?? ""}
            options={thirdParties.map((t) => ({ value: t.id, label: `${t.nama} (${t.id})` }))}
          />
        </Field>
      ) : null}

      <Field label="Catatan" htmlFor="u-catatan">
        <Textarea id="u-catatan" name="catatan" defaultValue={user?.catatan ?? ""} />
      </Field>
    </>
  );
}
