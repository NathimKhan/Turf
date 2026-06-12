import { cn } from "../../utils/cn.js";

export function Card({ className, children, interactive = false, ...props }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-surface-border bg-white shadow-soft",
        interactive && "transition-all duration-200 hover:-translate-y-1 hover:border-primary hover:shadow-lift",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, ...props }) {
  return <div className={cn("p-5 pb-0", className)} {...props} />;
}

export function CardContent({ className, ...props }) {
  return <div className={cn("p-5", className)} {...props} />;
}
