import { Link, NavLink } from "react-router-dom";
import { Bell, Heart, Menu, Search } from "lucide-react";
import { publicNav } from "../../constants/routes.js";
import { useAuth } from "../../store/authContext.js";
import { Button } from "../ui/button.jsx";
import { BrandLogo } from "./BrandLogo.jsx";
import { UserMenu } from "./UserMenu.jsx";

export function Navbar() {
  const { initialized, user } = useAuth();

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
          <button className="focus-ring hidden rounded-full p-2 text-ink-muted hover:bg-surface-low sm:inline-flex" title="Search">
            <Search size={20} />
          </button>
          <button className="focus-ring hidden rounded-full p-2 text-ink-muted hover:bg-surface-low sm:inline-flex" title="Saved venues">
            <Heart size={20} />
          </button>
          <button className="focus-ring relative hidden rounded-full p-2 text-ink-muted hover:bg-surface-low sm:inline-flex" title="Notifications">
            <Bell size={20} />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-danger" />
          </button>
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
          <Button as={Link} size="icon" to="/explore" variant="ghost" className="lg:hidden">
            <Menu size={22} />
          </Button>
        </div>
      </div>
    </header>
  );
}
