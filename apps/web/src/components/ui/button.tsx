import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-lg font-label-md text-label-md font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-[18px] [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-primary text-on-primary shadow-sm hover:shadow-card-hover hover:brightness-110 active:scale-[0.98] active:brightness-95",
        success: "bg-secondary text-on-secondary shadow-sm hover:shadow-card-hover hover:brightness-110 active:scale-[0.98]",
        secondary:
          "border border-outline-variant bg-surface-container-lowest text-on-surface shadow-xs hover:border-outline/50 hover:bg-surface-container-low active:scale-[0.98]",
        ghost: "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface",
        destructive: "bg-error text-on-error shadow-sm hover:shadow-card-hover hover:brightness-110 active:scale-[0.98]",
        outline: "border border-outline-variant bg-transparent text-on-surface hover:bg-surface-container-low active:scale-[0.98]",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-8 gap-1.5 px-3 text-[13px]",
        default: "h-10 px-4 py-2",
        lg: "h-11 px-6 text-[15px]",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    if (asChild) {
      return (
        <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props}>
          {children}
        </Comp>
      );
    }
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? <Loader2 className="animate-spin" /> : null}
        {children}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
