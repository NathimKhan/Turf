import { Link } from "react-router-dom";
import { MapPin, Star } from "lucide-react";
import { Badge } from "../ui/badge.jsx";
import { Button } from "../ui/button.jsx";
import { Card } from "../ui/card.jsx";
import { currency } from "../../utils/formatters.js";
import { handleImageError } from "../../utils/media.js";

export function TurfCard({ actionHref = "/booking/slots", actionLabel = "Book Now", className, compact = false, href, rank, turf }) {
  const detailsHref = href || `/venue/${turf.id}`;
  const bookingHref = actionHref === "/booking/slots" ? `/booking/slots?venue=${turf.id}` : actionHref;

  return (
    <Card interactive className={`flex h-full flex-col ${className || ""}`}>
      <Link className="block shrink-0" to={detailsHref}>
        <div className={`relative overflow-hidden rounded-t-2xl ${compact ? "h-36 sm:h-40" : "h-44 sm:h-48 md:h-52"}`}>
          <img
            alt={turf.name}
            className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
            loading="lazy"
            onError={handleImageError}
            src={turf.image}
          />
          {rank && (
            <span className="absolute left-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-dark text-sm font-black text-white shadow-lift">
              #{rank}
            </span>
          )}
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/75 to-transparent p-3 text-white sm:p-4">
            <Badge className="max-w-[60%] truncate" variant="white">{turf.distance}</Badge>
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-xs font-bold text-ink">
              <Star className="fill-warning text-warning" size={14} />
              {turf.rating}
            </span>
          </div>
        </div>
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-black text-ink sm:text-xl">{turf.name}</h3>
            <p className="mt-1 flex items-center gap-1 truncate text-sm text-ink-muted">
              <MapPin className="shrink-0" size={15} />
              <span className="truncate">{turf.location}</span>
            </p>
          </div>
          <Badge className="shrink-0" variant={String(turf.status).includes("Available") ? "success" : "primary"}>
            {turf.format}
          </Badge>
        </div>
        <div className="mt-auto flex items-center justify-between gap-3 pt-5">
          <p className="font-black text-primary">
            {currency(turf.price)}
            <span className="text-xs font-medium text-ink-soft"> / hr</span>
          </p>
          <Button as={Link} className="shrink-0" size="sm" to={bookingHref} variant="outline">
            {actionLabel}
          </Button>
        </div>
      </div>
    </Card>
  );
}
