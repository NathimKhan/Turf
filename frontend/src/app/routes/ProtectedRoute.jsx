import { Navigate, Outlet, useLocation } from "react-router-dom";
import { authService } from "../../services/authService.js";
import { useAuth } from "../../store/authContext.js";
import { roleHome } from "../../constants/auth.js";
import { Skeleton } from "../../components/ui/skeleton.jsx";

function resolveRoles(role, allowedRoles = []) {
  return role ? [role] : allowedRoles.map((allowedRole) => authService.normalizeRole(allowedRole));
}

function AccessDenied() {
  return (
    <div className="page-shell flex min-h-[55vh] items-center justify-center py-10">
      <div className="w-full max-w-md rounded-xl border border-surface-border bg-white p-5 shadow-soft">
        <p className="muted-label text-primary">Access Denied</p>
        <h1 className="mt-3 text-2xl font-black">Platform owner access required</h1>
        <p className="mt-2 text-sm text-ink-muted">This workspace is only available to the TURFX Platform Owner.</p>
      </div>
    </div>
  );
}

export function ProtectedRoute({ allowedRoles = [], authMessage, children, role, showAccessDenied = false }) {
  const location = useLocation();
  const { hasRole, initialized, isAuthenticated, user } = useAuth();
  const requiredRoles = resolveRoles(role, allowedRoles);

  if (!initialized) {
    return (
      <div className="page-shell flex min-h-[55vh] items-center justify-center py-10">
        <div className="w-full max-w-md rounded-xl border border-surface-border bg-white p-5 shadow-soft">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="mt-4 h-12 w-full" />
          <Skeleton className="mt-3 h-12 w-4/5" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated()) {
    return <Navigate replace state={{ from: location, toast: authMessage }} to="/login" />;
  }

  if (requiredRoles.length && !requiredRoles.some((requiredRole) => hasRole(requiredRole))) {
    if (showAccessDenied) {
      return <AccessDenied />;
    }

    return <Navigate replace to={roleHome[authService.normalizeRole(user?.role)] || "/dashboard"} />;
  }

  return children || <Outlet />;
}
