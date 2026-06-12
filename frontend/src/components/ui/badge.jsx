import { cva } from "class-variance-authority";
import { cn } from "../../utils/cn.js";

const badgeVariants = cva("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold", {
  variants: {
    variant: {
      default: "bg-surface-low text-ink-muted",
      primary: "bg-primary-soft text-primary-deep",
      secondary: "bg-secondary-soft text-secondary-deep",
      success: "bg-accent-soft text-accent-deep",
      warning: "bg-warning-soft text-amber-700",
      danger: "bg-danger-soft text-red-700",
      dark: "bg-dark text-white",
      white: "bg-white/90 text-ink",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

export function Badge({ className, variant, ...props }) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
