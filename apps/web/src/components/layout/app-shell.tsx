import type { ReactNode } from "react";
import { ErrorBoundary } from "@/components/error-boundary";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { SubscriptionBanner } from "./subscription-banner";
import { MobileNavProvider } from "./mobile-nav";
import { MobileTabBar } from "./mobile-tab-bar";

/** Authenticated chrome: navy sidebar + sticky topbar + mobile drawer & tab bar. */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <MobileNavProvider>
      <div className="min-h-screen bg-surface">
        <Sidebar />
        <Topbar />
        <main className="min-h-[calc(100vh-4rem)] px-4 py-5 pb-24 sm:px-6 lg:ml-64 lg:px-8 lg:pb-10">
          <div className="mx-auto max-w-content space-y-5 animate-fade-in-up sm:space-y-6">
            <SubscriptionBanner />
            <ErrorBoundary>{children}</ErrorBoundary>
          </div>
        </main>
        <MobileTabBar />
      </div>
    </MobileNavProvider>
  );
}
