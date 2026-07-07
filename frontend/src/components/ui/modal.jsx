import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "../../utils/cn.js";
import { Button } from "./button.jsx";

export function Modal({ children, className, open, onOpenChange, title }) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[90] grid place-items-center overflow-y-auto p-4">
          <motion.button
            aria-label="Close modal"
            className="absolute inset-0 bg-dark/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onOpenChange(false)}
          />
          <motion.section
            aria-modal="true"
            role="dialog"
            className={cn("relative flex max-h-[calc(100vh-2rem)] w-full max-w-xl flex-col overflow-hidden rounded-xl bg-white shadow-lift", className)}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-surface-border p-5">
              <h2 className="text-xl font-black">{title}</h2>
              <Button aria-label="Close modal" onClick={() => onOpenChange(false)} size="icon" variant="ghost">
                <X size={18} />
              </Button>
            </div>
            <div className="overflow-y-auto p-5">{children}</div>
          </motion.section>
        </div>
      )}
    </AnimatePresence>
  );
}
