import type { Metadata } from "next";
import { RoleGuard } from "@/components/guards/role-guard";
import { SettingsView } from "@/features/settings/settings-view";

export const metadata: Metadata = { title: "Shop Settings" };

export default function SettingsPage() {
  return (
    <RoleGuard roles={["shop_owner"]}>
      <SettingsView />
    </RoleGuard>
  );
}
