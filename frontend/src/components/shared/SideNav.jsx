import { NavLink } from "react-router-dom";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "../../utils/cn.js";
import { Button } from "../ui/button.jsx";
import { BrandLogo } from "./BrandLogo.jsx";
import { Icon } from "./icons.jsx";

export function SideNav({ collapsed = false, items, mode = "athlete", onCollapsedChange }) {
  const isWorkspace = mode === "owner" || mode === "platform";
  const isPlatform = mode === "platform";
  const collapseLabel = collapsed ? "Expand sidebar" : "Collapse sidebar";

  function toggleCollapsed() {
    onCollapsedChange?.(!collapsed);
  }

  return (
    <aside
      className={cn(
        "hidden shrink-0 border-surface-border bg-white transition-all duration-200 md:flex md:flex-col",
        isWorkspace
          ? cn("fixed left-0 top-0 h-screen border-r p-4", collapsed ? "w-20" : "w-64")
          : cn("gap-4", collapsed ? "w-20" : "w-64"),
      )}
    >
      {isWorkspace && (
        <div className="mb-5 border-b border-surface-border pb-5">
          <div className={cn("flex items-center gap-2", collapsed ? "flex-col" : "justify-between")}>
            <BrandLogo compact={collapsed} to={isPlatform ? "/admin/dashboard" : "/owner/dashboard"} />
            {onCollapsedChange && (
              <Button aria-label={collapseLabel} onClick={toggleCollapsed} size="icon" title={collapseLabel} variant="ghost">
                {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
              </Button>
            )}
          </div>
          <div
            className={cn("mt-5 flex items-center gap-3 rounded-xl bg-surface-low p-3", collapsed && "justify-center")}
            title={isPlatform ? "TURFX Platform" : "Venue Workspace"}
          >
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary text-white">
              <Icon name={isPlatform ? "ShieldCheck" : "Landmark"} />
            </div>
            <div className={cn(collapsed && "hidden")}>
              <p className="text-sm font-black">{isPlatform ? "TURFX Platform" : "Venue Workspace"}</p>
              <p className="text-xs text-ink-muted">{isPlatform ? "Platform Admin" : "Turf Owner"}</p>
            </div>
          </div>
        </div>
      )}
      {!isWorkspace && onCollapsedChange && (
        <div className={cn("flex", collapsed ? "justify-center" : "justify-end")}>
          <Button aria-label={collapseLabel} onClick={toggleCollapsed} size="icon" title={collapseLabel} variant="ghost">
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </Button>
        </div>
      )}
      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto">
        {items.map((item) => (
          <NavLink
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg py-3 text-sm font-bold transition-all",
                collapsed ? "justify-center px-2" : "px-3",
                isActive ? "bg-primary text-white shadow-lift" : "text-ink-muted hover:bg-surface-low hover:text-ink",
              )
            }
            key={item.href}
            title={collapsed ? item.label : undefined}
            to={item.href}
          >
            <Icon className="shrink-0" name={item.icon} />
            <span className={cn(collapsed && "hidden")}>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
