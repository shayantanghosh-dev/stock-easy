"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { LogOut, Menu, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { roleHome } from "@/lib/navigation";
import { Brand } from "./sidebar";
import { NavLinks } from "./nav-links";

interface MobileNavValue {
  open: () => void;
  close: () => void;
}
const MobileNavContext = createContext<MobileNavValue | null>(null);

export function useMobileNav(): MobileNavValue {
  return useContext(MobileNavContext) ?? { open: () => {}, close: () => {} };
}

/** Holds the slide-in drawer state and renders it once for the whole shell. */
export function MobileNavProvider({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const value: MobileNavValue = { open: () => setIsOpen(true), close: () => setIsOpen(false) };

  return (
    <MobileNavContext.Provider value={value}>
      {children}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent
          hideClose
          className="left-0 top-0 h-full max-w-[17.5rem] translate-x-0 translate-y-0 gap-0 rounded-none border-0 border-r border-brand-border bg-brand p-0 shadow-elevated data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left"
        >
          <DialogTitle className="sr-only">Navigation</DialogTitle>
          <DialogDescription className="sr-only">
            Primary navigation links and account actions.
          </DialogDescription>
          <div className="flex h-full flex-col py-5">
            <div className="mb-6 flex h-12 items-center justify-between pr-3">
              <Brand href={roleHome(user?.role)} />
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close navigation"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-brand-muted transition-colors hover:bg-white/5 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto no-scrollbar">
              <NavLinks role={user?.role} onNavigate={() => setIsOpen(false)} />
            </div>
            <div className="border-t border-brand-border/60 p-3">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  void logout();
                }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] font-medium text-brand-muted transition-colors hover:bg-white/5 hover:text-white"
              >
                <LogOut className="h-[18px] w-[18px]" />
                Log out
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </MobileNavContext.Provider>
  );
}

/** Hamburger button (mobile only) that opens the drawer. */
export function MobileMenuButton() {
  const { open } = useMobileNav();
  return (
    <button
      type="button"
      onClick={open}
      aria-label="Open navigation"
      className="-ml-1 flex h-10 w-10 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container-high lg:hidden"
    >
      <Menu className="h-5 w-5" />
    </button>
  );
}
