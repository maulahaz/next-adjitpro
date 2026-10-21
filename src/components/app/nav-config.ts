import {
  ArrowLeftRight,
  Building2,
  Coins,
  CreditCard,
  FileBarChart,
  FolderKanban,
  KeyRound,
  LayoutDashboard,
  LifeBuoy,
  PieChart,
  ShieldCheck,
  Users,
  Briefcase,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  roles: string[];
  icon: LucideIcon;
}

/** Menu identik dengan `NAV_ITEMS` di aplikasi lama (+ Ganti Password). */
export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", roles: ["admin", "operator", "investor"], icon: LayoutDashboard },
  // { href: "/my-card", label: "Kartu Saya", roles: ["investor"], icon: CreditCard },
  { href: "/my-card", label: "Overview", roles: ["investor"], icon: CreditCard },
  { href: "/my-projects", label: "Proyek Saya", roles: ["client"], icon: FolderKanban },
  { href: "/investors", label: "Investor", roles: ["admin", "operator"], icon: Users },
  { href: "/fundings", label: "Funding", roles: ["admin", "operator"], icon: Coins },
  { href: "/projects", label: "Proyek", roles: ["admin", "operator"], icon: Briefcase },
  { href: "/capital", label: "Mutasi Modal", roles: ["admin", "operator"], icon: ArrowLeftRight },
  { href: "/distributions", label: "Bagi Hasil", roles: ["admin", "operator"], icon: PieChart },
  { href: "/reports", label: "Laporan", roles: ["admin", "operator", "investor"], icon: FileBarChart },
  { href: "/third-parties", label: "Mitra", roles: ["admin", "operator"], icon: Building2 },
  { href: "/users", label: "Pengguna", roles: ["admin"], icon: ShieldCheck },
  { href: "/bantuan", label: "Bantuan", roles: ["admin", "operator", "investor", "client"], icon: LifeBuoy },
  { href: "/password", label: "Ganti Password", roles: ["admin", "operator", "investor", "client"], icon: KeyRound },
];

export function navForRole(role: string): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}

export const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  operator: "Operator",
  investor: "Investor",
  client: "Client",
};
