"use client";

import { PageHeader } from "@/components/shared/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { AiAssistant } from "./ai-assistant";
import { AiLogs } from "./ai-logs";

export function AiWorkspace() {
  const { hasRole } = useAuth();
  const isOwner = hasRole("shop_owner");

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Assistant"
        description="Your pharmacy copilot — ask questions about inventory and sales in plain English."
      />
      {isOwner ? (
        <Tabs defaultValue="assistant">
          <TabsList>
            <TabsTrigger value="assistant">Assistant</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>
          <TabsContent value="assistant">
            <AiAssistant />
          </TabsContent>
          <TabsContent value="history">
            <AiLogs />
          </TabsContent>
        </Tabs>
      ) : (
        <AiAssistant />
      )}
    </div>
  );
}
