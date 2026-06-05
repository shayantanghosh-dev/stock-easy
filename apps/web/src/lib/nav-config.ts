import {
  BarChart3,
  Boxes,
  Building2,
  ClipboardCheck,
  CreditCard,
  LayoutDashboard,
  LineChart,
  Pill,
  ReceiptText,
  Settings,
  ShoppingCart,
  Sparkles,
  Truck,
  type LucideIcon,
} from "lucide-react";
import type { UserRole } from "@/types/auth";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  roles: UserRole[];
}

export interface NavGroup {
  label?: string;
  items: NavItem[];
}

const SHOP: UserRole[] = ["shop_owner", "shop_staff"];
const OWNER: UserRole[] = ["shop_owner"];
const ADMIN: UserRole[] = ["central_admin"];

/** Full navigation model. The sidebar filters items by the active role. */
export const NAV_GROUPS: NavGroup[] = [
  {
    items: [{ label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: SHOP }],
  },
  {
    label: "Inventory",
    items: [
      { label: "Medicines", href: "/medicines", icon: Pill, roles: SHOP },
      { label: "Batches", href: "/batches", icon: Boxes, roles: SHOP },
      { label: "Dealers", href: "/dealers", icon: Truck, roles: SHOP },
    ],
  },
  {
    label: "Sales",
    items: [
      { label: "Point of Sale", href: "/pos", icon: ShoppingCart, roles: SHOP },
      { label: "Bills", href: "/bills", icon: ReceiptText, roles: SHOP },
    ],
  },
  {
    label: "Insights",
    items: [
      { label: "Analytics", href: "/analytics", icon: BarChart3, roles: SHOP },
      { label: "AI Assistant", href: "/ai", icon: Sparkles, roles: SHOP },
    ],
  },
  {
    label: "Manage",
    items: [
      { label: "Subscription", href: "/subscription", icon: CreditCard, roles: OWNER },
      { label: "Settings", href: "/settings", icon: Settings, roles: OWNER },
    ],
  },
  {
    label: "Platform",
    items: [
      { label: "Approvals", href: "/admin/approvals", icon: ClipboardCheck, roles: ADMIN },
      { label: "Platform Analytics", href: "/admin/analytics", icon: LineChart, roles: ADMIN },
      { label: "Plans", href: "/admin/plans", icon: CreditCard, roles: ADMIN },
      { label: "Tenants", href: "/admin/tenants", icon: Building2, roles: ADMIN },
    ],
  },
];

/** Returns only the groups/items visible to the given role. */
export function navGroupsForRole(role: UserRole | undefined): NavGroup[] {
  if (!role) return [];
  return NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => item.roles.includes(role)),
  })).filter((group) => group.items.length > 0);
}

/** Human label for a role (badge under the avatar). */
export const ROLE_LABEL: Record<UserRole, string> = {
  central_admin: "Central Admin",
  shop_owner: "Owner",
  shop_staff: "Staff",
};
