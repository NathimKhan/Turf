import { Link, Outlet } from "react-router-dom";
import { Bell, Search, Settings } from "lucide-react";
import { adminNav, ownerNav } from "../../constants/routes.js";
import { Button } from "../../components/ui/button.jsx";
import { Input } from "../../components/ui/input.jsx";
import { PageTransition } from "../../components/shared/Motion.jsx";
import { SideNav } from "../../components/shared/SideNav.jsx";
import { UserMenu } from "../../components/shared/UserMenu.jsx";
import { authService } from "../../services/authService.js";
import { useAuth } from "../../store/authContext.js";

export function OwnerLayout() {
  const { user } = useAuth();
  const isPlatformOwner = authService.normalizeRole(user?.role) === "admin";

  return (
    <div className="min-h-screen bg-background text-ink">
      <SideNav items={isPlatformOwner ? adminNav : ownerNav} mode={isPlatformOwner ? "platform" : "owner"} />
      <div className="md:pl-64">
        <header className="sticky top-0 z-50 border-b border-surface-border bg-white/75 px-4 backdrop-blur-xl lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            <div>
              <p className="hidden text-sm font-bold text-primary sm:block">{isPlatformOwner ? "TURFX Platform Owner" : "TURFX Turf Owner"}</p>
              <p className="text-xs text-ink-muted">{isPlatformOwner ? "Global platform operations" : "Venue operations workspace"}</p>
            </div>
            <div className="hidden max-w-md flex-1 md:block">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" size={18} />
                <Input
                  className="h-10 rounded-full bg-surface-low pl-10"
                  placeholder={isPlatformOwner ? "Search platform records..." : "Search your venues..."}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!isPlatformOwner && (
                <Button as={Link} size="sm" to="/owner/add-turf">
                  Add Venue
                </Button>
              )}
              <Link
                className="rounded-full p-2 text-ink-muted hover:bg-surface-low"
                title={isPlatformOwner ? "Platform notifications" : "Booking notifications"}
                to={isPlatformOwner ? "/admin/notifications" : "/owner/bookings"}
              >
                <Bell size={20} />
              </Link>
              <Link
                className="rounded-full p-2 text-ink-muted hover:bg-surface-low"
                title={isPlatformOwner ? "System settings" : "Availability settings"}
                to={isPlatformOwner ? "/admin/settings" : "/owner/slots"}
              >
                <Settings size={20} />
              </Link>
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
