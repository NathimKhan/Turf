import { Link } from "react-router-dom";
import { MapPin } from "lucide-react";
import { Badge } from "../ui/badge.jsx";
import { Button } from "../ui/button.jsx";
import { Card } from "../ui/card.jsx";
import { currency } from "../../utils/formatters.js";
import { handleImageError } from "../../utils/media.js";

export function TurfCard({ actionHref = "/booking/slots", actionLabel = "Book Now", className, compact = false, href, stretch = true, turf }) {
  const detailsHref = href || `/venue/${turf.id}`;
  const bookingHref = actionHref === "/booking/slots" ? `/booking/slots?venue=${turf.id}` : actionHref;
  const cardImage = turf.thumbnail || turf.heroImage || turf.image;

  return (
    <Card interactive className={`flex flex-col ${stretch ? "h-full" : ""} ${className || ""}`}>
      <Link className="block shrink-0" to={detailsHref}>
        <div className={`relative overflow-hidden rounded-t-2xl ${compact ? "h-36 sm:h-40" : "h-44 sm:h-48 md:h-52"}`}>
          <img
            alt={turf.name}
            className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
            data-fallback-src={turf.heroImage || turf.coverImage}
            loading="lazy"
            onError={handleImageError}
            src={cardImage}
          />
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/75 to-transparent p-3 text-white sm:p-4">
            <Badge className="max-w-[60%] truncate" variant="white">{turf.distance}</Badge>
          </div>
        </div>
      </Link>
      <div className={`flex flex-col p-4 ${stretch ? "flex-1" : ""}`}>
        <div className="grid gap-3">
          <div className="min-w-0">
            <h3 className="text-lg font-black leading-tight text-ink sm:text-xl">{turf.name}</h3>
            <p className="mt-2 flex items-start gap-1 text-sm text-ink-muted">
              <MapPin className="mt-0.5 shrink-0" size={15} />
              <span className="break-words">{turf.location || turf.city || "TURFX venue"}</span>
            </p>
          </div>
          <Badge className="w-fit max-w-full whitespace-normal break-words text-left" variant={String(turf.status).includes("Available") ? "success" : "primary"}>
            {turf.format}
          </Badge>
        </div>
        <div className={`${stretch ? "mt-auto" : "mt-5"} flex items-center justify-between gap-3 pt-5`}>
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
