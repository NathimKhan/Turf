import { Check } from "lucide-react";
import { cn } from "../../utils/cn.js";

export function Stepper({ steps, current = 0 }) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {steps.map((step, index) => {
        const complete = index < current;
        const active = index === current;
        return (
          <div
            className={cn(
              "flex min-w-max items-center gap-2 rounded-full border px-3 py-2 text-xs font-bold",
              complete && "border-accent bg-accent-soft text-accent-deep",
              active && "border-primary bg-primary-soft text-primary-deep",
              !complete && !active && "border-surface-border bg-white text-ink-muted",
            )}
            key={step}
          >
            <span
              className={cn(
                "grid h-5 w-5 place-items-center rounded-full text-[11px]",
                complete ? "bg-accent text-white" : active ? "bg-primary text-white" : "bg-surface-high text-ink-muted",
              )}
            >
              {complete ? <Check size={13} /> : index + 1}
            </span>
            {step}
          </div>
        );
      })}
    </div>
  );
}
