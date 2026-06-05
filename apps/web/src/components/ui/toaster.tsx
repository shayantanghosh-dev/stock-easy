"use client";

import { Toaster as SonnerToaster } from "sonner";

/**
 * App-wide toast surface. Styled to the Stock Easy tokens via richColors-off +
 * explicit classNames so success/error chips match the clinical palette.
 */
export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      toastOptions={{
        classNames: {
          toast:
            "group rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface shadow-card-hover font-body-sm",
          title: "font-label-md text-label-md text-on-surface",
          description: "font-body-sm text-body-sm text-on-surface-variant",
          actionButton: "bg-primary text-on-primary rounded-md",
          cancelButton: "bg-surface-container text-on-surface-variant rounded-md",
          error: "border-error-container",
          success: "border-secondary-container",
        },
      }}
    />
  );
}

export { toast } from "sonner";
