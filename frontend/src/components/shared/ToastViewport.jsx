import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Info, X } from "lucide-react";
import { useLocation } from "react-router-dom";

export function ToastViewport() {
  const location = useLocation();
  const [message, setMessage] = useState("");

  useEffect(() => {
    const nextMessage = location.state?.toast;
    if (!nextMessage) return undefined;

    setMessage(nextMessage);
    const timeout = window.setTimeout(() => setMessage(""), 4500);
    return () => window.clearTimeout(timeout);
  }, [location.key, location.state?.toast]);

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="fixed right-4 top-20 z-[100] flex max-w-sm items-start gap-3 rounded-xl border border-primary/20 bg-white px-4 py-3 text-sm font-bold text-ink shadow-lift"
          exit={{ opacity: 0, y: -12 }}
          initial={{ opacity: 0, y: -12 }}
          role="status"
        >
          <Info className="mt-0.5 shrink-0 text-primary" size={18} />
          <span className="flex-1">{message}</span>
          <button
            aria-label="Dismiss notification"
            className="rounded p-0.5 text-ink-soft hover:bg-surface-low hover:text-ink"
            onClick={() => setMessage("")}
            type="button"
          >
            <X size={16} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
