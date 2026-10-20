"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, X, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { navForRole, ROLE_LABELS } from "./nav-config";
import { logoutAction } from "@/app/actions/auth";

export interface ShellUser {
  nama: string;
  username: string;
  role: string;
}

export function AppShell({ user, children }: { user: ShellUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const items = navForRole(user.role);

  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[16rem_1fr]">
      {/* Sidebar (desktop) */}
      <aside className="hidden border-r bg-sidebar text-sidebar-foreground lg:flex lg:flex-col">
        <SidebarContent items={items} pathname={pathname} />
      </aside>

      {/* Sidebar (mobile, overlay) */}
      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-72 max-w-[85%] border-r bg-sidebar text-sidebar-foreground shadow-xl">
            <div className="flex items-center justify-between px-4 py-3">
              <Brand />
              <Button variant="ghost" size="icon" className="text-sidebar-foreground" onClick={() => setOpen(false)} aria-label="Tutup menu">
                <X className="h-5 w-5" />
              </Button>
            </div>
            <SidebarContent items={items} pathname={pathname} />
          </aside>
        </div>
      ) : null}

      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur lg:px-6">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setOpen(true)}
              aria-label="Buka menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="lg:hidden">
              <Brand compact />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <div className="text-sm font-semibold leading-tight">{user.nama || user.username}</div>
              <div className="text-xs text-muted-foreground">
                {ROLE_LABELS[user.role] ?? user.role} · @{user.username}
              </div>
            </div>
            <div className="grid h-9 w-9 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
              {(user.nama || user.username).slice(0, 1).toUpperCase()}
            </div>
            <form action={logoutAction}>
              <Button type="submit" variant="outline" size="sm">
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Keluar</span>
              </Button>
            </form>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6">{children}</main>

        <footer className="border-t px-4 py-3 text-center text-xs text-muted-foreground lg:px-6">
          AdjitPro — Aplikasi Pencatatan Investasi
        </footer>
      </div>
    </div>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className="grid h-9 w-9 place-items-center rounded-lg bg-sidebar-accent text-sidebar-accent-foreground">
        <Wallet className="h-5 w-5" />
      </div>
      {!compact ? (
        <div className="leading-tight">
          <div className="text-sm font-bold">AdjitPro</div>
          <div className="text-[11px] text-sidebar-foreground/60">Pencatatan Investasi</div>
        </div>
      ) : null}
    </div>
  );
}

function SidebarContent({
  items,
  pathname,
}: {
  items: ReturnType<typeof navForRole>;
  pathname: string;
}) {
  return (
    <>
      <div className="hidden px-4 py-5 lg:block">
        <Brand />
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-3">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/75 hover:bg-white/5 hover:text-sidebar-foreground",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
