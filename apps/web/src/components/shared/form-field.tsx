import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FormFieldProps {
  label?: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}

/**
 * Label + control + inline validation wrapper for React Hook Form fields.
 * Labels sit above the control (per the design system).
 */
export function FormField({ label, htmlFor, error, hint, required, className, children }: FormFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label ? (
        <Label htmlFor={htmlFor}>
          {label}
          {required ? <span className="ml-0.5 text-error">*</span> : null}
        </Label>
      ) : null}
      {children}
      {error ? (
        <p className="font-label-sm text-label-sm font-medium text-error">{error}</p>
      ) : hint ? (
        <p className="font-label-sm text-label-sm text-on-surface-variant">{hint}</p>
      ) : null}
    </div>
  );
}
