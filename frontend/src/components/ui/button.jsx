import { cva } from "class-variance-authority";
import { cn } from "../../utils/cn.js";

const buttonVariants = cva(
  "focus-ring inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-bold transition-all disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-primary text-white shadow-lift hover:-translate-y-0.5 hover:bg-primary-deep",
        secondary: "bg-secondary text-white hover:-translate-y-0.5 hover:bg-secondary-deep",
        accent: "bg-accent text-white hover:-translate-y-0.5 hover:bg-accent-deep",
        outline: "border border-surface-outline bg-white text-ink hover:border-primary hover:text-primary",
        ghost: "bg-transparent text-ink-muted hover:bg-surface-low hover:text-ink",
        dark: "bg-dark text-white hover:-translate-y-0.5 hover:bg-slate-800",
        soft: "bg-primary-soft text-primary-deep hover:bg-blue-200",
        danger: "bg-danger text-white hover:bg-red-600",
      },
      size: {
        sm: "h-9 px-3",
        md: "h-11 px-5",
        lg: "h-12 px-7",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export function Button({ className, variant, size, as: Component = "button", type, ...props }) {
  const buttonType = Component === "button" ? type || "button" : undefined;

  return <Component className={cn(buttonVariants({ variant, size }), className)} type={buttonType} {...props} />;
}
