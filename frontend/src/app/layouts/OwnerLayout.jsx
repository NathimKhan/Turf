import { useState } from "react";
import { Link, Outlet } from "react-router-dom";
import { adminNav, ownerNav } from "../../constants/routes.js";
import { Button } from "../../components/ui/button.jsx";
import { PageTransition } from "../../components/shared/Motion.jsx";
import { NotificationBell } from "../../components/shared/NotificationBell.jsx";
import { SideNav } from "../../components/shared/SideNav.jsx";
import { UserMenu } from "../../components/shared/UserMenu.jsx";
import { authService } from "../../services/authService.js";
import { useAuth } from "../../store/authContext.js";

const SIDEBAR_COLLAPSED_KEY = "turfx-sidebar-collapsed";

function readSidebarCollapsed() {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
  } catch {
    return false;
  }
}

function approvalStatus(user) {
  const value = user?.approvalStatus || user?.accountStatus || "ACTIVE";
  const upper = String(value).toUpperCase();
  if (upper === "ACTIVE" || upper === "PENDING" || upper === "REJECTED" || upper === "SUSPENDED") return upper;
  if (String(value).toLowerCase() === "active") return "ACTIVE";
  if (String(value).toLowerCase() === "pending") return "PENDING";
  if (String(value).toLowerCase() === "rejected") return "REJECTED";
  if (String(value).toLowerCase() === "suspended") return "SUSPENDED";
  return "ACTIVE";
}

export function OwnerLayout() {
  const { user } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(readSidebarCollapsed);
  const isPlatformOwner = authService.normalizeRole(user?.role) === "admin";
  const ownerPending = !isPlatformOwner && approvalStatus(user) === "PENDING";

  function updateSidebarCollapsed(value) {
    setSidebarCollapsed(value);
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(value));
    } catch {
      // Sidebar preference is optional.
    }
  }

  return (
    <div className="min-h-screen bg-background text-ink">
      <SideNav
        collapsed={sidebarCollapsed}
        items={isPlatformOwner ? adminNav : ownerNav}
        mode={isPlatformOwner ? "platform" : "owner"}
        onCollapsedChange={updateSidebarCollapsed}
      />
      <div className={sidebarCollapsed ? "md:pl-20" : "md:pl-64"}>
        <header className="sticky top-0 z-50 border-b border-surface-border bg-white/75 px-4 backdrop-blur-xl lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            <div>
              <p className="hidden text-sm font-bold text-primary sm:block">{isPlatformOwner ? "TURFX Platform" : "TURFX Turf Owner"}</p>
              <p className="text-xs text-ink-muted">{isPlatformOwner ? "Global platform operations" : "Venue operations workspace"}</p>
            </div>
            <div className="flex items-center gap-2">
              {!isPlatformOwner && (
                ownerPending ? (
                  <Button disabled size="sm">
                    Add Venue
                  </Button>
                ) : (
                  <Button as={Link} size="sm" to="/owner/add-turf">
                    Add Venue
                  </Button>
                )
              )}
              {!isPlatformOwner && (
                <NotificationBell
                  fallbackHref="/owner/bookings"
                  title="Booking notifications"
                />
              )}
              <UserMenu />
            </div>
          </div>
        </header>
        <main className="px-4 py-6 lg:px-8">
          <PageTransition>
            <Outlet />
          </PageTransition>
        </main>
      </div>
    </div>
  );
}
