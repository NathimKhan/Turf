import { useState } from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { Search, Settings } from "lucide-react";
import { adminNav, ownerNav } from "../../constants/routes.js";
import { Button } from "../../components/ui/button.jsx";
import { Input } from "../../components/ui/input.jsx";
import { PageTransition } from "../../components/shared/Motion.jsx";
import { NotificationBell } from "../../components/shared/NotificationBell.jsx";
import { SideNav } from "../../components/shared/SideNav.jsx";
import { UserMenu } from "../../components/shared/UserMenu.jsx";
import { authService } from "../../services/authService.js";
import { useAuth } from "../../store/authContext.js";

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
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const isPlatformOwner = authService.normalizeRole(user?.role) === "admin";
  const ownerPending = !isPlatformOwner && approvalStatus(user) === "PENDING";

  function submitSearch(event) {
    event.preventDefault();
    const query = search.trim();
    navigate({
      pathname: isPlatformOwner ? "/admin/users" : "/owner/turfs",
      search: query ? `?search=${encodeURIComponent(query)}` : "",
    });
  }

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
            <form className="hidden max-w-md flex-1 md:block" onSubmit={submitSearch}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" size={18} />
                <Input
                  className="h-10 rounded-full bg-surface-low pl-10"
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={isPlatformOwner ? "Search platform records..." : "Search your venues..."}
                  value={search}
                />
              </div>
            </form>
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
              <NotificationBell
                fallbackHref={isPlatformOwner ? "/admin/notifications" : "/owner/bookings"}
                title={isPlatformOwner ? "Platform notifications" : "Booking notifications"}
              />
              {ownerPending ? (
                <button
                  className="rounded-full p-2 text-ink-muted opacity-50"
                  disabled
                  title="Availability disabled until approval"
                  type="button"
                >
                  <Settings size={20} />
                </button>
              ) : (
                <Link
                  className="rounded-full p-2 text-ink-muted hover:bg-surface-low"
                  title={isPlatformOwner ? "System settings" : "Availability settings"}
                  to={isPlatformOwner ? "/admin/settings" : "/owner/slots"}
                >
                  <Settings size={20} />
                </Link>
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
