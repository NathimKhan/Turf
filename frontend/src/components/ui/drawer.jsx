import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "../../utils/cn.js";
import { Button } from "./button.jsx";

export function Drawer({ children, className, open, onOpenChange, title }) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80]">
          <motion.button
            aria-label="Close drawer"
            className="absolute inset-0 bg-dark/45"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onOpenChange(false)}
          />
          <motion.aside
            aria-modal="true"
            className={cn("absolute bottom-0 right-0 top-0 flex w-full max-w-md flex-col bg-white shadow-lift", className)}
            exit={{ x: "100%" }}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            <div className="flex items-center justify-between border-b border-surface-border p-5">
              <h2 className="text-xl font-black">{title}</h2>
              <Button aria-label="Close drawer" onClick={() => onOpenChange(false)} size="icon" variant="ghost">
                <X size={18} />
              </Button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
