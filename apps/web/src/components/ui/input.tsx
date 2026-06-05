import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      ref={ref}
      className={cn(
        "flex h-10 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 font-body-sm text-body-sm text-on-surface",
        "placeholder:text-on-surface-variant/60",
        "focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "file:border-0 file:bg-transparent file:text-sm file:font-medium",
        "aria-[invalid=true]:border-error aria-[invalid=true]:ring-error/30",
        className,
      )}
      {...props}
    />
  );
});
Input.displayName = "Input";

export { Input };
