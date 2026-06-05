import type { Metadata } from "next";
import { RoleGuard } from "@/components/guards/role-guard";
import { AiWorkspace } from "@/features/ai/ai-workspace";

export const metadata: Metadata = { title: "AI Assistant" };

export default function AiPage() {
  return (
    <RoleGuard roles={["shop_owner", "shop_staff"]}>
      <AiWorkspace />
    </RoleGuard>
  );
}
