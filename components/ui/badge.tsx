import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center px-2 py-0.5 text-[8px] font-mono font-semibold tracking-[0.22em] uppercase border transition-colors",
  {
    variants: {
      variant: {
        default: "border-[var(--border-raised)] bg-[var(--surface-raised)] text-[var(--text-muted)]",
        onboarding: "border-[var(--amber)] bg-[var(--amber-dim)]/50 text-[var(--amber)]",
        active: "border-[var(--green)] bg-[var(--green-dim)]/50 text-[var(--green)]",
        coding: "border-[var(--blue)] bg-[var(--blue-dim)]/50 text-[var(--blue-text)]",
        blocked: "border-[var(--accent)] bg-[var(--accent-dim)]/60 text-[var(--accent-bright)]",
        ready: "border-[var(--cyan)] bg-[var(--cyan-dim)]/50 text-[var(--cyan)]",
        merged: "border-[var(--text)] bg-[var(--surface-raised)] text-[var(--text)]",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
