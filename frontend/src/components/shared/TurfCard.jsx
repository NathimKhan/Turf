import { Link } from "react-router-dom";
import { MapPin, Star } from "lucide-react";
import { Badge } from "../ui/badge.jsx";
import { Button } from "../ui/button.jsx";
import { Card } from "../ui/card.jsx";
import { currency } from "../../utils/formatters.js";

export function TurfCard({ actionHref = "/booking/slots", actionLabel = "Book Now", compact = false, href, turf }) {
  const detailsHref = href || `/venue/${turf.id}`;

  return (
    <Card interactive className="overflow-hidden">
      <Link to={detailsHref}>
        <div className={compact ? "relative h-40" : "relative h-52"}>
          <img alt={turf.name} className="h-full w-full object-cover transition-transform duration-500 hover:scale-105" src={turf.image} />
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/75 to-transparent p-4 text-white">
            <Badge variant="white">{turf.distance}</Badge>
            <span className="flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-xs font-bold text-ink">
              <Star className="fill-warning text-warning" size={14} />
              {turf.rating}
            </span>
          </div>
        </div>
      </Link>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-xl font-black text-ink">{turf.name}</h3>
            <p className="mt-1 flex items-center gap-1 text-sm text-ink-muted">
              <MapPin size={15} />
              {turf.location}
            </p>
          </div>
          <Badge variant={turf.status.includes("Available") ? "success" : "primary"}>{turf.format}</Badge>
        </div>
        <div className="mt-5 flex items-center justify-between">
          <p className="font-black text-primary">
            {currency(turf.price)}
            <span className="text-xs font-medium text-ink-soft"> / hr</span>
          </p>
          <Button as={Link} size="sm" to={actionHref} variant="outline">
            {actionLabel}
          </Button>
        </div>
      </div>
    </Card>
  );
}
