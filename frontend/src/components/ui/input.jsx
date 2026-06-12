import { cn } from "../../utils/cn.js";

export function Input({ className, ...props }) {
  return (
    <input
      className={cn(
        "focus-ring h-11 w-full rounded-lg border border-surface-outline bg-white px-3 text-sm text-ink placeholder:text-ink-soft/70",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }) {
  return (
    <textarea
      className={cn(
        "focus-ring min-h-28 w-full rounded-lg border border-surface-outline bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-soft/70",
        className,
      )}
      {...props}
    />
  );
}
