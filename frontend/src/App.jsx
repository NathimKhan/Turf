import { AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";
import { ErrorBoundary } from "./components/shared/ErrorBoundary.jsx";
import { ToastViewport } from "./components/shared/ToastViewport.jsx";
import { AppRoutes } from "./app/routes/AppRoutes.jsx";

export default function App() {
  const location = useLocation();

  return (
    <ErrorBoundary>
      <ToastViewport />
      <AnimatePresence mode="wait">
        <AppRoutes key={location.pathname} />
      </AnimatePresence>
    </ErrorBoundary>
  );
}
