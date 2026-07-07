import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin } from "lucide-react";

function validCoordinate(latitude, longitude) {
  return Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude));
}

function markerIcon(className = "bg-primary") {
  return L.divIcon({
    className: "",
    html: `<span class="block h-5 w-5 rounded-full border-2 border-white ${className} shadow-lift"></span>`,
    iconAnchor: [10, 10],
    iconSize: [20, 20],
    popupAnchor: [0, -10],
  });
}

function venuePoint(venue) {
  const latitude = Number(venue?.latitude);
  const longitude = Number(venue?.longitude);
  if (!validCoordinate(latitude, longitude)) return null;
  return {
    latitude,
    longitude,
    name: venue.name || "TURFX Venue",
  };
}

export function VenueMap({
  className = "",
  label = "TURFX Venue",
  latitude,
  longitude,
  userLocation,
  venues = [],
  zoom = 13,
}) {
  const nodeRef = useRef(null);
  const mapRef = useRef(null);
  const points = useMemo(() => {
    const venuePoints = venues.map(venuePoint).filter(Boolean);
    if (venuePoints.length) return venuePoints;
    if (validCoordinate(latitude, longitude)) {
      return [{ latitude: Number(latitude), longitude: Number(longitude), name: label }];
    }
    return [];
  }, [label, latitude, longitude, venues]);

  useEffect(() => {
    if (!nodeRef.current || !points.length) return undefined;

    const firstPoint = points[0];
    const map = L.map(nodeRef.current, {
      attributionControl: false,
      scrollWheelZoom: false,
      zoomControl: false,
    }).setView([firstPoint.latitude, firstPoint.longitude], zoom);

    mapRef.current = map;
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
    }).addTo(map);

    const bounds = [];
    points.forEach((point) => {
      bounds.push([point.latitude, point.longitude]);
      L.marker([point.latitude, point.longitude], { icon: markerIcon() })
        .addTo(map)
        .bindPopup(point.name);
    });

    if (validCoordinate(userLocation?.latitude, userLocation?.longitude)) {
      const userPoint = [Number(userLocation.latitude), Number(userLocation.longitude)];
      bounds.push(userPoint);
      L.marker(userPoint, { icon: markerIcon("bg-accent") })
        .addTo(map)
        .bindPopup("Your location");
    }

    if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [28, 28], maxZoom: 14 });
    }

    setTimeout(() => map.invalidateSize(), 0);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [points, userLocation?.latitude, userLocation?.longitude, zoom]);

  if (!points.length) {
    return (
      <div className={`grid place-items-center bg-surface-low text-ink-muted ${className}`}>
        <div className="text-center">
          <MapPin className="mx-auto text-primary" />
          <p className="mt-2 text-sm font-bold">Coordinates pending</p>
        </div>
      </div>
    );
  }

  return <div className={`turfx-map ${className}`} ref={nodeRef} />;
}
