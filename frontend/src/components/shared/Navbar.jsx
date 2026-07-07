import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { publicNav } from "../../constants/routes.js";
import { authService } from "../../services/authService.js";
import { useAuth } from "../../store/authContext.js";
import { Button } from "../ui/button.jsx";
import { BrandLogo } from "./BrandLogo.jsx";
import { NotificationBell } from "./NotificationBell.jsx";
import { UserMenu } from "./UserMenu.jsx";

export function Navbar() {
  const { initialized, user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const role = authService.normalizeRole(user?.role);
  const notificationsHref = role === "owner" ? "/owner/bookings" : role === "admin" ? "/admin/notifications" : user ? "/notifications" : "/login";

  return (
    <header className="sticky top-0 z-50 border-b border-surface-border bg-white/75 backdrop-blur-xl">
      <div className="page-shell flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-10">
          <BrandLogo />
          <nav className="hidden items-center gap-7 lg:flex">
            {publicNav.map((item) => (
              <NavLink
                className={({ isActive }) =>
                  `text-sm font-bold transition-colors ${
                    isActive ? "text-primary underline decoration-2 underline-offset-8" : "text-ink-muted hover:text-primary"
                  }`
                }
                key={item.href}
                to={item.href}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          {user && <NotificationBell className="focus-ring hidden sm:inline-flex" fallbackHref={notificationsHref} title="Notifications" />}
          {!initialized ? (
            <div className="hidden h-9 w-32 animate-pulse rounded-full bg-surface-low sm:block" />
          ) : !user ? (
            <>
              <Button as={Link} className="hidden sm:inline-flex" size="sm" to="/login">
                Sign In
              </Button>
            </>
          ) : (
            <UserMenu />
          )}
          <Button
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            onClick={() => setMenuOpen((open) => !open)}
            size="icon"
            variant="ghost"
            className="lg:hidden"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </Button>
        </div>
      </div>
      {menuOpen && (
        <nav className="border-t border-surface-border bg-white px-4 py-3 lg:hidden">
          <div className="page-shell grid gap-1 px-0">
            {[...publicNav, { label: "Search", href: "/search" }].map((item) => (
              <NavLink
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 text-sm font-bold ${isActive ? "bg-primary text-white" : "text-ink-muted hover:bg-surface-low hover:text-primary"}`
                }
                key={item.href}
                onClick={() => setMenuOpen(false)}
                to={item.href}
              >
                {item.label}
              </NavLink>
            ))}
            {user && (
              <Link
                className="rounded-lg px-3 py-2 text-sm font-bold text-ink-muted hover:bg-surface-low hover:text-primary"
                onClick={() => setMenuOpen(false)}
                to={role === "owner" ? "/owner/dashboard" : role === "admin" ? "/admin/dashboard" : "/dashboard"}
              >
                Open Dashboard
              </Link>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
