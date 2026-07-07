import { useCallback, useEffect, useMemo, useState } from "react";
import { LocationContext } from "./locationContext.js";

const STORAGE_KEY = "turfx-user-location";
const SESSION_REQUEST_KEY = "turfx-location-requested";

function readStoredLocation() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (!stored) return null;
    const latitude = Number(stored.latitude);
    const longitude = Number(stored.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
    return { latitude, longitude };
  } catch {
    return null;
  }
}

function saveLocation(location) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(location));
  } catch {
    // Storage is optional; the current session can still use the coordinates.
  }
}

export function LocationProvider({ children }) {
  const [location, setLocation] = useState(readStoredLocation);
  const [status, setStatus] = useState(location ? "ready" : "idle");
  const [error, setError] = useState("");

  const requestLocation = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setStatus("unavailable");
      setError("Geolocation is not available in this browser.");
      return;
    }

    setStatus("requesting");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextLocation = {
          latitude: Number(position.coords.latitude.toFixed(6)),
          longitude: Number(position.coords.longitude.toFixed(6)),
        };
        saveLocation(nextLocation);
        setLocation(nextLocation);
        setStatus("ready");
        setError("");
      },
      (geolocationError) => {
        setStatus("denied");
        setError(geolocationError.message || "Location permission was not granted.");
      },
      {
        enableHighAccuracy: true,
        maximumAge: 1000 * 60 * 5,
        timeout: 10000,
      },
    );
  }, []);

  useEffect(() => {
    if (location || sessionStorage.getItem(SESSION_REQUEST_KEY) === "true") return;
    sessionStorage.setItem(SESSION_REQUEST_KEY, "true");
    requestLocation();
  }, [location, requestLocation]);

  const value = useMemo(
    () => ({
      error,
      location,
      requestLocation,
      status,
    }),
    [error, location, requestLocation, status],
  );

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}
