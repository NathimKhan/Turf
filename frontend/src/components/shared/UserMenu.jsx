import { useEffect, useRef, useState } from "react";
import { ChevronDown, LogOut } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { roleLabels } from "../../constants/auth.js";
import { authService } from "../../services/authService.js";
import { useAuth } from "../../store/authContext.js";
import { handleImageError } from "../../utils/media.js";

const menuItems = {
  admin: [
    { label: "Global Dashboard", href: "/admin/dashboard" },
    { label: "Users", href: "/admin/users" },
    { label: "Turf Owners", href: "/admin/owners" },
    { label: "Venues", href: "/admin/turfs" },
    { label: "Bookings", href: "/admin/bookings" },
  ],
  owner: [
    { label: "Dashboard", href: "/owner/dashboard" },
    { label: "My Venues", href: "/owner/turfs" },
    { label: "Availability", href: "/owner/slots" },
    { label: "Calendar", href: "/owner/calendar" },
    { label: "Bookings", href: "/owner/bookings" },
    { label: "Earnings", href: "/owner/revenue" },
    { label: "Analytics", href: "/owner/analytics" },
    { label: "Athletes", href: "/owner/crm" },
  ],
  user: [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Explore", href: "/explore" },
    { label: "My Bookings", href: "/bookings" },
    { label: "Favorites", href: "/favorites" },
    { label: "Notifications", href: "/notifications" },
    { label: "Profile", href: "/profile" },
  ],
};

export function UserMenu() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const role = authService.normalizeRole(user?.role) || "user";
  const initial = user?.name?.trim()?.charAt(0)?.toUpperCase() || "U";

  useEffect(() => {
    function closeMenu(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    }

    function closeOnEscape(event) {
      if (event.key === "Escape") setMenuOpen(false);
    }

    document.addEventListener("mousedown", closeMenu);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeMenu);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  async function handleLogout() {
    setMenuOpen(false);
    await logout();
    navigate("/", { replace: true });
  }

  if (!user) return null;

  return (
    <div className="relative" ref={menuRef}>
      <button
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        className="focus-ring flex items-center gap-2 rounded-full border border-surface-outline bg-white py-1.5 pl-1.5 pr-3 text-sm font-bold hover:border-primary"
        onClick={() => setMenuOpen((open) => !open)}
        type="button"
      >
        {user.profileImage ? (
          <img alt="" className="h-8 w-8 rounded-full object-cover" onError={handleImageError} src={user.profileImage} />
        ) : (
          <span className="grid h-8 w-8 place-items-center rounded-full bg-primary text-white">{initial}</span>
        )}
        <span className="hidden max-w-36 truncate sm:inline">{user.name}</span>
        <ChevronDown className={`transition-transform ${menuOpen ? "rotate-180" : ""}`} size={16} />
      </button>
      {menuOpen && (
        <div
          className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-surface-border bg-white p-2 shadow-lift"
          role="menu"
        >
          <div className="border-b border-surface-border px-3 py-2">
            <p className="truncate text-sm font-black">{user.name}</p>
            <p className="truncate text-xs text-ink-muted">{user.email}</p>
            <p className="mt-1 text-xs font-bold text-primary">{roleLabels[role]}</p>
          </div>
          <div className="py-1">
            {(menuItems[role] || menuItems.user).map((item) => (
              <Link
                className="block rounded-lg px-3 py-2 text-sm font-bold text-ink-muted hover:bg-surface-low hover:text-primary"
                key={item.href}
                onClick={() => setMenuOpen(false)}
                role="menuitem"
                to={item.href}
              >
                {item.label}
              </Link>
            ))}
          </div>
          <button
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-bold text-danger hover:bg-red-50"
            onClick={handleLogout}
            role="menuitem"
            type="button"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
