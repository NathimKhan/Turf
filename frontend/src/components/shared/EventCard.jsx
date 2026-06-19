import { Link } from "react-router-dom";
import { CalendarDays, MapPin } from "lucide-react";
import { Badge } from "../ui/badge.jsx";
import { Button } from "../ui/button.jsx";
import { Card } from "../ui/card.jsx";
import { currency } from "../../utils/formatters.js";
import { handleImageError } from "../../utils/media.js";

export function EventCard({ compact = false, event }) {
  return (
    <Card interactive className="flex h-full flex-col">
      <div className={`relative shrink-0 overflow-hidden rounded-t-2xl ${compact ? "h-36 sm:h-40" : "h-48 sm:h-56"}`}>
        <img alt={event.title} className="h-full w-full object-cover" loading="lazy" onError={handleImageError} src={event.image} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />
        <Badge className="absolute left-3 top-3 sm:left-4 sm:top-4" variant="white">
          {event.type}
        </Badge>
        <div className="absolute inset-x-3 bottom-3 text-white sm:inset-x-4 sm:bottom-4">
          <h3 className={`font-black ${compact ? "text-lg" : "text-2xl"}`}>{event.title}</h3>
          {!compact && <p className="mt-2 line-clamp-2 text-sm text-white/80">{event.description}</p>}
        </div>
      </div>
      <div className={`flex flex-1 flex-col gap-3 ${compact ? "p-4" : "p-5"}`}>
        <div className={`grid gap-2 text-sm text-ink-muted ${compact ? "" : "sm:grid-cols-2"}`}>
          <span className="flex items-center gap-2 truncate">
            <CalendarDays className="shrink-0" size={16} />
            <span className="truncate">{event.date}</span>
          </span>
          <span className="flex items-center gap-2 truncate">
            <MapPin className="shrink-0" size={16} />
            <span className="truncate">{event.venue}</span>
          </span>
        </div>
        <div className="mt-auto flex items-center justify-between gap-3 pt-1">
          <p className="font-black text-primary">{currency(event.price)}</p>
          <Button as={Link} className="shrink-0" size="sm" to={`/events/${event.id}`}>
            View Details
          </Button>
        </div>
      </div>
    </Card>
  );
}
