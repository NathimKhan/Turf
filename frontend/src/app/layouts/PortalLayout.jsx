import { useState } from "react";
import { Link, Outlet } from "react-router-dom";
import { Plus } from "lucide-react";
import { athleteNav, publicNav } from "../../constants/routes.js";
import { Button } from "../../components/ui/button.jsx";
import { BrandLogo } from "../../components/shared/BrandLogo.jsx";
import { PageTransition } from "../../components/shared/Motion.jsx";
import { SideNav } from "../../components/shared/SideNav.jsx";
import { UserMenu } from "../../components/shared/UserMenu.jsx";
import { NotificationBell } from "../../components/shared/NotificationBell.jsx";

const SIDEBAR_COLLAPSED_KEY = "turfx-sidebar-collapsed";

function readSidebarCollapsed() {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
  } catch {
    return false;
  }
}

export function PortalLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(readSidebarCollapsed);
  const accountPublicNav = publicNav.slice(0, 4);

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
      <header className="sticky top-0 z-50 border-b border-surface-border bg-white/75 backdrop-blur-xl">
        <div className="page-shell flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-8">
            <BrandLogo />
            <nav className="hidden gap-6 lg:flex">
              {accountPublicNav.map((item) => (
                <Link className="text-sm font-bold text-ink-muted hover:text-primary" key={item.href} to={item.href}>
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <Button as={Link} size="sm" to="/explore">
              <Plus size={16} />
              New Booking
            </Button>
            <NotificationBell className="hidden sm:inline-flex" fallbackHref="/notifications" title="Notifications" />
            <UserMenu />
          </div>
        </div>
      </header>
      <div className="page-shell flex gap-6 py-6">
        <SideNav collapsed={sidebarCollapsed} items={athleteNav} onCollapsedChange={updateSidebarCollapsed} />
        <main className="min-w-0 flex-1">
          <PageTransition>
            <Outlet />
          </PageTransition>
        </main>
      </div>
    </div>
  );
}
