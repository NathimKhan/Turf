import { Link } from "react-router-dom";
import { CalendarDays, MapPin } from "lucide-react";
import { Badge } from "../ui/badge.jsx";
import { Button } from "../ui/button.jsx";
import { Card } from "../ui/card.jsx";
import { currency } from "../../utils/formatters.js";

export function EventCard({ event }) {
  return (
    <Card interactive className="overflow-hidden">
      <div className="relative h-56">
        <img alt={event.title} className="h-full w-full object-cover" src={event.image} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />
        <Badge className="absolute left-4 top-4" variant="white">
          {event.type}
        </Badge>
        <div className="absolute bottom-4 left-4 right-4 text-white">
          <h3 className="text-2xl font-black">{event.title}</h3>
          <p className="mt-2 line-clamp-2 text-sm text-white/80">{event.description}</p>
        </div>
      </div>
      <div className="space-y-4 p-5">
        <div className="grid gap-3 text-sm text-ink-muted sm:grid-cols-2">
          <span className="flex items-center gap-2">
            <CalendarDays size={16} />
            {event.date}
          </span>
          <span className="flex items-center gap-2">
            <MapPin size={16} />
            {event.venue}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <p className="font-black text-primary">{currency(event.price)}</p>
          <Button as={Link} size="sm" to={`/events/${event.id}`}>
            View Details
          </Button>
        </div>
      </div>
    </Card>
  );
}
