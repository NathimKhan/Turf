import { Link, NavLink } from "react-router-dom";
import { cn } from "../../utils/cn.js";
import { Button } from "../ui/button.jsx";
import { BrandLogo } from "./BrandLogo.jsx";
import { Icon } from "./icons.jsx";

export function SideNav({ items, mode = "athlete" }) {
  const isWorkspace = mode === "owner" || mode === "platform";
  const isPlatform = mode === "platform";

  return (
    <aside
      className={cn(
        "hidden shrink-0 border-surface-border bg-white md:flex md:flex-col",
        isWorkspace ? "fixed left-0 top-0 h-screen w-64 border-r p-4" : "w-64 gap-4",
      )}
    >
      {isWorkspace && (
        <div className="mb-5 border-b border-surface-border pb-5">
          <BrandLogo />
          <div className="mt-5 flex items-center gap-3 rounded-xl bg-surface-low p-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary text-white">
              <Icon name={isPlatform ? "ShieldCheck" : "Landmark"} />
            </div>
            <div>
              <p className="text-sm font-black">{isPlatform ? "TURFX Platform" : "Venue Workspace"}</p>
              <p className="text-xs text-ink-muted">{isPlatform ? "Platform Owner" : "Turf Owner"}</p>
            </div>
          </div>
        </div>
      )}
      <nav className="flex-1 space-y-1">
        {items.map((item) => (
          <NavLink
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-bold transition-all",
                isActive ? "bg-primary text-white shadow-lift" : "text-ink-muted hover:bg-surface-low hover:text-ink",
              )
            }
            key={item.href}
            to={item.href}
          >
            <Icon name={item.icon} />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto rounded-2xl border border-accent/20 bg-accent-soft p-4">
        <p className="muted-label text-accent-deep">{isPlatform ? "System Health" : mode === "owner" ? "Venue Portfolio" : "Pro Plan"}</p>
        <p className="mt-1 text-sm font-black">{isPlatform ? "All services operational" : mode === "owner" ? "Manage your locations" : "Elevate your game"}</p>
        <Button
          as={Link}
          className="mt-4 w-full"
          size="sm"
          to={isPlatform ? "/admin/settings" : mode === "owner" ? "/owner/turfs" : "/membership-center"}
          variant={isWorkspace ? "outline" : "accent"}
        >
          {isPlatform ? "View Settings" : mode === "owner" ? "View Venues" : "Upgrade Now"}
        </Button>
      </div>
    </aside>
  );
}
