import { Link } from "react-router-dom";
import { cn } from "../../utils/cn.js";

export function BrandLogo({ className, compact = false, to = "/" }) {
  return (
    <Link className={cn("inline-flex items-center gap-2 font-black tracking-normal text-primary", className)} to={to}>
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-sm text-white shadow-lift">TX</span>
      {!compact && <span className="text-2xl">TURFX</span>}
    </Link>
  );
}
