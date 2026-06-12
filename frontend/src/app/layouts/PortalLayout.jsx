import { Link, Outlet } from "react-router-dom";
import { Bell, Heart, Plus } from "lucide-react";
import { athleteNav, publicNav } from "../../constants/routes.js";
import { Button } from "../../components/ui/button.jsx";
import { BrandLogo } from "../../components/shared/BrandLogo.jsx";
import { PageTransition } from "../../components/shared/Motion.jsx";
import { SideNav } from "../../components/shared/SideNav.jsx";
import { UserMenu } from "../../components/shared/UserMenu.jsx";

export function PortalLayout() {
  return (
    <div className="min-h-screen bg-background text-ink">
      <header className="sticky top-0 z-50 border-b border-surface-border bg-white/75 backdrop-blur-xl">
        <div className="page-shell flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-8">
            <BrandLogo />
            <nav className="hidden gap-6 lg:flex">
              {publicNav.slice(0, 4).map((item) => (
                <Link className="text-sm font-bold text-ink-muted hover:text-primary" key={item.href} to={item.href}>
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <Button as={Link} size="sm" to="/booking/slots">
              <Plus size={16} />
              New Booking
            </Button>
            <Link className="hidden rounded-full p-2 text-ink-muted hover:bg-surface-low sm:inline-flex" title="Notifications" to="/notifications">
              <Bell size={20} />
            </Link>
            <Link className="hidden rounded-full p-2 text-ink-muted hover:bg-surface-low sm:inline-flex" title="Saved venues" to="/favorites">
              <Heart size={20} />
            </Link>
            <UserMenu />
          </div>
        </div>
      </header>
      <div className="page-shell flex gap-6 py-6">
        <SideNav items={athleteNav} />
        <main className="min-w-0 flex-1">
          <PageTransition>
            <Outlet />
          </PageTransition>
        </main>
      </div>
    </div>
  );
}
