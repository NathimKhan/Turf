import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  CalendarDays,
  Check,
  ChevronRight,
  Filter,
  MapPin,
  Search,
} from "lucide-react";
import { Badge } from "../../components/ui/badge.jsx";
import { Button } from "../../components/ui/button.jsx";
import { Card, CardContent } from "../../components/ui/card.jsx";
import { Drawer } from "../../components/ui/drawer.jsx";
import { Textarea } from "../../components/ui/input.jsx";
import { Modal } from "../../components/ui/modal.jsx";
import { Skeleton } from "../../components/ui/skeleton.jsx";
import { EmptyState } from "../../components/shared/EmptyState.jsx";
import { Reveal } from "../../components/shared/Motion.jsx";
import { Pagination } from "../../components/shared/Pagination.jsx";
import { SearchFilters } from "../../components/shared/SearchFilters.jsx";
import { StatsCard } from "../../components/shared/StatsCard.jsx";
import { TurfCard } from "../../components/shared/TurfCard.jsx";
import { VenueMap } from "../../components/shared/VenueMap.jsx";
import { Icon } from "../../components/shared/icons.jsx";
import { assetImages } from "../../data/turfxData.js";
import { useBookingGuard } from "../../hooks/useBookingGuard.js";
import { useTurf, useTurfAvailability, useTurfMetadata, useTurfs } from "../../hooks/useTurfs.js";
import {
  useCoaches,
  useCreateCoachRequest,
  useFavoriteMutation,
  useFavorites,
  useMyCoachRequests,
} from "../../hooks/usePlatform.js";
import { useAuth } from "../../store/authContext.js";
import { useUserLocation } from "../../store/locationContext.js";
import { currency } from "../../utils/formatters.js";
import { handleImageError } from "../../utils/media.js";
import { notify } from "../../utils/notify.js";

const sportVisuals = {
  Badminton: { icon: "Zap", image: assetImages.indoor },
  Basketball: { icon: "CircleDot", image: assetImages.basketball },
  Cricket: { icon: "Trophy", image: assetImages.cricket },
  Football: { icon: "Goal", image: assetImages.football },
  Tennis: { icon: "CircleDot", image: assetImages.tennis },
  Volleyball: { icon: "CircleDot", image: assetImages.stadium },
};

function futureDate(days = 1) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateLabel(value) {
  if (!value) return "Select date";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00Z`));
}

function userLocationParams(userLocation) {
  if (!userLocation?.latitude || !userLocation?.longitude) return {};
  return {
    latitude: userLocation.latitude,
    longitude: userLocation.longitude,
  };
}

function hasVenueCoordinates(turf = {}) {
  return Number.isFinite(Number(turf.latitude)) && Number.isFinite(Number(turf.longitude));
}

function directionsUrl(turf = {}) {
  if (!hasVenueCoordinates(turf)) return "https://www.google.com/maps";
  return `https://www.google.com/maps?q=${turf.latitude},${turf.longitude}`;
}

function availabilityButtonClass(slot, index) {
  if (slot.status === "booked") return "bg-surface-low text-ink-muted";
  if (slot.status === "blocked") return "bg-danger-soft text-danger";
  return index === 1 ? "bg-primary text-white" : "bg-surface-low text-ink-muted";
}

function SectionHeader({ eyebrow, title, subtitle, action }) {
  return (
    <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        {eyebrow && <p className="muted-label text-primary">{eyebrow}</p>}
        <h2 className="section-title mt-2">{title}</h2>
        {subtitle && <p className="mt-2 max-w-2xl text-sm text-ink-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

function SearchPanel({ compact = false }) {
  const { data: metadata = {} } = useTurfMetadata();
  const { location: userLocation } = useUserLocation();
  const [location, setLocation] = useState("");
  const [sport, setSport] = useState("");
  const [date, setDate] = useState(futureDate());
  const dateInputRef = useRef(null);
  const locationOptions = metadata.cities || metadata.locations || [];
  const sportOptions = metadata.sports || [];
  const formattedDate = new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00Z`));

  function openDatePicker() {
    dateInputRef.current?.showPicker?.();
  }

  const searchParams = new URLSearchParams({
    ...userLocationParams(userLocation),
    date,
    location,
    sport,
  });

  return (
    <div
      className={`glass-panel grid min-w-0 max-w-full gap-3 rounded-2xl p-3 ${
        compact ? "sm:grid-cols-2" : "md:grid-cols-[1fr_1fr_1fr_auto]"
      }`}
    >
      <label className="relative flex min-w-0 cursor-pointer items-center gap-3 rounded-xl bg-white/65 px-4 py-3 focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2">
        <Icon className="text-primary" name="MapPin" />
        <span className="min-w-0">
          <span className="block text-xs font-bold uppercase tracking-wider text-ink-soft">Select location</span>
          <span className="block truncate text-sm font-bold text-ink">{location || "All locations"}</span>
        </span>
        <select
          aria-label="Select location"
          className="absolute inset-0 h-full w-full cursor-pointer text-ink opacity-0"
          onChange={(event) => setLocation(event.target.value)}
          value={location}
        >
          <option className="bg-white text-ink" value="">All locations</option>
          {locationOptions.map((option) => (
            <option className="bg-white text-ink" key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
      <label className="relative flex min-w-0 cursor-pointer items-center gap-3 rounded-xl bg-white/65 px-4 py-3 focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2">
        <Icon className="text-primary" name="Goal" />
        <span className="min-w-0">
          <span className="block text-xs font-bold uppercase tracking-wider text-ink-soft">Pick a sport</span>
          <span className="block truncate text-sm font-bold text-ink">{sport || "All sports"}</span>
        </span>
        <select
          aria-label="Pick a sport"
          className="absolute inset-0 h-full w-full cursor-pointer text-ink opacity-0"
          onChange={(event) => setSport(event.target.value)}
          value={sport}
        >
          <option className="bg-white text-ink" value="">All sports</option>
          {sportOptions.map((option) => (
            <option className="bg-white text-ink" key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
      <div className="relative flex min-w-0 cursor-pointer items-center gap-3 rounded-xl bg-white/65 px-4 py-3 focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2">
        <Icon className="text-primary" name="CalendarDays" />
        <span className="min-w-0">
          <span className="block text-xs font-bold uppercase tracking-wider text-ink-soft">Choose date</span>
          <span className="block truncate text-sm font-bold text-ink">{formattedDate}</span>
        </span>
        <input
          aria-label="Date picker"
          className="pointer-events-none absolute h-px w-px opacity-0"
          onChange={(event) => {
            if (event.target.value) setDate(event.target.value);
          }}
          ref={dateInputRef}
          tabIndex={-1}
          type="date"
          value={date}
        />
        <button
          aria-label="Choose date"
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          onClick={openDatePicker}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              openDatePicker();
            }
          }}
          type="button"
        />
      </div>
      <Button
        className={compact ? "sm:h-full" : "md:h-full"}
        as={Link}
        to={{ pathname: "/search", search: searchParams.toString() }}
      >
        <Search size={18} />
        Search
      </Button>
    </div>
  );
}

export function LandingPage() {
  const { data: turfResult = { turfs: [] } } = useTurfs({ limit: 100 });
  const { data: metadata = {} } = useTurfMetadata();
  const turfs = turfResult.turfs;
  const [featuredStart, setFeaturedStart] = useState(0);
  const featuredTurfs = useMemo(() => {
    if (turfs.length <= 3) return turfs;
    return Array.from({ length: 3 }, (_, index) => turfs[(featuredStart + index) % turfs.length]);
  }, [featuredStart, turfs]);
  const sports = (metadata.sports || []).map((name) => ({
    name,
    venues: turfs.filter((turf) => turf.sportsSupported.includes(name)).length,
    ...(sportVisuals[name] || { icon: "Goal", image: assetImages.stadium }),
  }));

  return (
    <main>
      <section className="relative min-h-[680px] overflow-hidden">
        <img alt="Premium illuminated turf" className="absolute inset-0 h-full w-full object-cover" src={assetImages.hero} />
        <div className="absolute inset-0 bg-gradient-to-b from-dark/45 via-dark/55 to-dark/80" />
        <div className="page-shell relative flex min-h-[680px] flex-col justify-center py-16 text-white">
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl"
            initial={{ opacity: 0, y: 28 }}
            transition={{ duration: 0.6 }}
          >
            <Badge className="bg-primary text-white">Book. Play. Compete. Repeat.</Badge>
            <h1 className="mt-5 max-w-3xl text-5xl font-black tracking-normal sm:text-6xl lg:text-7xl">
              Book Premium Sports Venues Instantly
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-white/80">
              Discover, book, and play at the best sports venues in your city with real-time availability and expert coaching.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button as={Link} size="lg" to="/booking/slots">
                Book Turf
                <ChevronRight size={18} />
              </Button>
              <Button as={Link} size="lg" to="/explore" variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white">
                Explore Venues
              </Button>
            </div>
          </motion.div>
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="mt-12 max-w-5xl"
            initial={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.6, delay: 0.18 }}
          >
            <SearchPanel />
          </motion.div>
        </div>
      </section>

      <section className="page-shell py-16">
        <SectionHeader
          action={
            <Button as={Link} to="/explore" variant="ghost">
              View All <ChevronRight size={16} />
            </Button>
          }
          subtitle="The city's most booked activities this week"
          title="Popular Sports"
        />
        <div className="grid w-full grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {sports.slice(0, 4).map((sport, index) => (
            <Reveal
              className="h-full"
              delay={index * 0.06}
              key={sport.name}
            >
              <Link
                className="group relative block h-64 overflow-hidden rounded-2xl sm:h-72 xl:h-80"
                to={{ pathname: "/search", search: new URLSearchParams({ sport: sport.name, date: futureDate() }).toString() }}
              >
                <img alt={sport.name} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" src={sport.image} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                <div className="absolute bottom-5 left-5 right-5 text-white">
                  <Icon className="mb-3 text-secondary" name={sport.icon} />
                  <h3 className="text-2xl font-black">{sport.name}</h3>
                  <p className="text-sm text-white/70">{sport.venues}+ venues available</p>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="page-shell py-16">
        <SectionHeader
          action={
            <div className="flex gap-2">
              <Button aria-label="Previous featured venues" onClick={() => setFeaturedStart((current) => Math.max(0, current - 1))} size="icon" variant="outline">
                <Icon name="ArrowLeft" />
              </Button>
              <Button aria-label="Next featured venues" onClick={() => setFeaturedStart((current) => turfs.length ? (current + 1) % turfs.length : 0)} size="icon">
                <Icon name="ArrowRight" />
              </Button>
            </div>
          }
          subtitle="Top rated spaces for high-performance play"
          title="Featured Venues"
        />
        <div className="grid gap-5 md:grid-cols-3">
          {featuredTurfs.map((turf) => (
            <TurfCard key={turf.id} turf={turf} />
          ))}
        </div>
      </section>

      <section className="page-shell grid gap-5 pb-16 md:grid-cols-2">
        {[
          ["Pro Coaching", "Learn from certified professionals to elevate your game.", assetImages.training, "/coaching"],
          ["Premium Venues", "Compare top-rated grounds, live slots, and transparent hourly pricing.", assetImages.stadium, "/explore"],
        ].map(([title, copy, image, href]) => (
          <Link className="group relative min-h-72 overflow-hidden rounded-2xl" key={title} to={href}>
            <img alt={title} className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" src={image} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent" />
            <div className="absolute bottom-6 left-6 right-6 text-white">
              <h3 className="text-3xl font-black">{title}</h3>
              <p className="mt-2 max-w-sm text-sm text-white/75">{copy}</p>
            </div>
          </Link>
        ))}
      </section>
    </main>
  );
}

function TurfCardSkeleton({ compact = false }) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-surface-border bg-white shadow-soft">
      <div className={compact ? "h-36 sm:h-40" : "h-44 sm:h-48 md:h-52"}>
        <Skeleton className="h-full w-full rounded-none" />
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="mt-auto flex items-center justify-between pt-5">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>
    </div>
  );
}

function ScrollRow({ children, className = "" }) {
  return (
    <div className={`flex gap-4 overflow-x-auto px-1 pb-4 pt-2 no-scrollbar snap-x snap-mandatory ${className}`}>
      {children}
    </div>
  );
}

function CommunityTile({ sport }) {
  return (
    <Link
      className="group relative h-32 w-48 shrink-0 snap-start overflow-hidden rounded-2xl sm:h-36 sm:w-56"
      to={{ pathname: "/search", search: new URLSearchParams({ sport: sport.name, date: futureDate() }).toString() }}
    >
      <img
        alt={sport.name}
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
        loading="lazy"
        src={sport.image}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-4 text-white">
        <p className="flex items-center gap-1 text-xs font-bold text-white/75">
          <Icon name="UsersRound" size={14} />
          {sport.venues}+ venues
        </p>
        <h3 className="mt-1 text-lg font-black">{sport.name}</h3>
      </div>
    </Link>
  );
}

export function ExplorePage() {
  const { location: userLocation } = useUserLocation();
  const turfParams = useMemo(
    () => ({
      ...userLocationParams(userLocation),
      limit: 100,
      ...(userLocation ? { radiusKm: 25 } : {}),
    }),
    [userLocation],
  );
  const { data: turfResult = { turfs: [] }, isError: turfsError, isLoading: turfsLoading } = useTurfs(turfParams);
  const { data: metadata = {} } = useTurfMetadata();
  const turfs = turfResult.turfs;

  const sports = (metadata.sports || []).map((name) => ({
    name,
    venues: turfs.filter((turf) => turf.sportsSupported?.includes(name)).length,
    ...(sportVisuals[name] || { icon: "Goal", image: assetImages.stadium }),
  }));

  const trending = useMemo(
    () => [...turfs].slice(0, 6),
    [turfs],
  );

  const recommended = useMemo(() => {
    const seenSports = new Set();
    const picks = [];
    for (const turf of turfs) {
      const key = turf.sport || "general";
      if (seenSports.has(key)) continue;
      seenSports.add(key);
      picks.push(turf);
    }
    for (const turf of turfs) {
      if (picks.length >= 6) break;
      if (!picks.includes(turf)) picks.push(turf);
    }
    return picks.slice(0, 6);
  }, [turfs]);

  const nearbyGrounds = useMemo(() => {
    if (userLocation) {
      return {
        city: "",
        grounds: [...turfs]
          .filter((turf) => turf.distanceInKm !== null)
          .sort((first, second) => first.distanceInKm - second.distanceInKm)
          .slice(0, 6),
      };
    }

    const counts = {};
    turfs.forEach((turf) => {
      const city = turf.city || turf.distance;
      if (city) counts[city] = (counts[city] || 0) + 1;
    });
    const topCity = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
    const grouped = topCity ? turfs.filter((turf) => (turf.city || turf.distance) === topCity) : turfs;
    return { city: topCity, grounds: grouped.slice(0, 6) };
  }, [turfs, userLocation]);

  return (
    <main className="page-shell py-8 sm:py-10">
      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.35fr]">
        <section className="min-w-0">
          <p className="muted-label text-primary">TURFX Discovery</p>
          <h1 className="mt-3 text-4xl font-black tracking-normal md:text-5xl">Find your arena</h1>
          <p className="mt-3 text-ink-muted">Search premium venues, compare live slots, and reserve in minutes.</p>
          <div className="mt-6">
            <SearchPanel compact />
          </div>
          <div className="mt-4 grid max-w-[450px] grid-cols-2 gap-3 px-1 pb-3 pt-2">
            {sports.map((sport) => (
              <Button
                as={Link}
                className="w-full"
                key={sport.name}
                to={{ pathname: "/search", search: new URLSearchParams({ sport: sport.name, date: futureDate() }).toString() }}
                variant={sport.name === "Football" ? "primary" : "outline"}
              >
                <Icon name={sport.icon} />
                {sport.name}
              </Button>
            ))}
          </div>
        </section>
        <section className="relative min-h-64 min-w-0 overflow-hidden rounded-3xl border border-surface-border bg-white shadow-soft sm:min-h-80 lg:min-h-[420px]">
          <img
            alt="Premium turf venue"
            className="absolute inset-0 h-full w-full object-cover"
            onError={handleImageError}
            src={assetImages.stadium}
          />
          <div className="absolute inset-0 bg-gradient-to-tr from-dark/60 via-dark/20 to-primary/10" />
          <Badge className="absolute left-4 top-4 sm:left-5 sm:top-5" variant="white">
            Nearby venues
          </Badge>
          <div className="absolute bottom-5 left-5 right-5 max-w-md text-white">
            <p className="text-sm font-bold uppercase tracking-wider text-white/75">Ready to play</p>
            <h2 className="mt-2 text-3xl font-black">Book premium grounds around you</h2>
          </div>
        </section>
      </div>

      {turfsLoading ? (
        <section className="mt-14">
          <Skeleton className="h-7 w-48" />
          <ScrollRow className="mt-5">
            {Array.from({ length: 4 }).map((_, index) => (
              <div className="w-64 shrink-0 sm:w-72" key={index}>
                <TurfCardSkeleton compact />
              </div>
            ))}
          </ScrollRow>
        </section>
      ) : (
        <>
          {Boolean(trending.length) && (
            <section className="mt-14">
              <SectionHeader subtitle="The most booked venues by athletes this week" title="🔥 Trending Now" />
              <ScrollRow>
                {trending.map((turf) => (
                  <div className="w-64 shrink-0 snap-start sm:w-72" key={turf.id}>
                    <TurfCard compact turf={turf} />
                  </div>
                ))}
              </ScrollRow>
            </section>
          )}

          {Boolean(recommended.length) && (
            <section className="mt-14">
              <SectionHeader subtitle="A curated mix of top venues across your favorite sports" title="⭐ Recommended For You" />
              <ScrollRow>
                {recommended.map((turf) => (
                  <div className="w-64 shrink-0 snap-start sm:w-72" key={turf.id}>
                    <TurfCard compact turf={turf} />
                  </div>
                ))}
              </ScrollRow>
            </section>
          )}

          {Boolean(nearbyGrounds.grounds.length) && (
            <section className="mt-14">
              <SectionHeader
                subtitle={userLocation ? "Sorted by distance from your current location" : nearbyGrounds.city ? `Popular venues around ${nearbyGrounds.city}` : "Popular venues close to you"}
                title={userLocation ? "Near Me" : "Nearby Grounds"}
              />
              <ScrollRow>
                {nearbyGrounds.grounds.map((turf) => (
                  <div className="w-64 shrink-0 snap-start sm:w-72" key={turf.id}>
                    <TurfCard compact turf={turf} />
                  </div>
                ))}
              </ScrollRow>
            </section>
          )}
        </>
      )}

      {Boolean(sports.length) && (
        <section className="mt-14">
          <SectionHeader subtitle="Join a community of athletes built around the sport you love" title="Sports Communities" />
          <ScrollRow>
            {sports.map((sport) => (
              <CommunityTile key={sport.name} sport={sport} />
            ))}
          </ScrollRow>
        </section>
      )}

      <section className="mt-14">
        <SectionHeader subtitle="Every approved venue currently listed on TURFX" title="All Venues" />
        {turfsLoading ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <TurfCardSkeleton key={index} />
            ))}
          </div>
        ) : turfs.length ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {turfs.map((turf) => (
              <TurfCard key={turf.id} turf={turf} />
            ))}
          </div>
        ) : (
          <EmptyState
            description={turfsError ? "Check the API connection and try again." : "New venues are verified and added regularly. Please check back soon."}
            icon="Search"
            title={turfsError ? "Venues could not be loaded" : "No venues available yet"}
          />
        )}
      </section>
    </main>
  );
}

export function SearchResultsPage() {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const { location: userLocation } = useUserLocation();
  const page = Number(searchParams.get("page") || 1);
  const locationFilter = searchParams.get("location") || "";
  const sportFilter = searchParams.get("sport") || "";
  const dateFilter = searchParams.get("date") || futureDate();
  const radiusFilter = searchParams.get("radiusKm") || "";
  const latitudeFilter = searchParams.get("latitude") || searchParams.get("lat") || userLocation?.latitude;
  const longitudeFilter = searchParams.get("longitude") || searchParams.get("lng") || userLocation?.longitude;
  const hasSearchCoordinates = latitudeFilter && longitudeFilter;
  const params = {
    city: locationFilter || undefined,
    latitude: hasSearchCoordinates ? latitudeFilter : undefined,
    longitude: hasSearchCoordinates ? longitudeFilter : undefined,
    radiusKm: radiusFilter || undefined,
    sport: sportFilter || undefined,
    date: dateFilter,
    page,
  };
  const { data: result = { pagination: {}, turfs: [] }, isError } = useTurfs(params);
  const { data: metadata = {} } = useTurfMetadata();
  const turfs = result.turfs;
  const location = locationFilter || (hasSearchCoordinates ? "your location" : "all locations");
  const sport = sportFilter || "Sports";
  const date = dateFilter;
  const filterValues = { date: dateFilter, location: locationFilter, radiusKm: radiusFilter, sport: sportFilter };

  function applyFilters(nextFilters) {
    const nextParams = {
      ...nextFilters,
      ...userLocationParams(userLocation),
      page: "1",
    };
    setSearchParams(Object.fromEntries(Object.entries(nextParams).filter(([, value]) => value !== undefined && value !== "")));
    setFiltersOpen(false);
  }

  return (
    <main className="page-shell py-8">
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <p className="muted-label text-primary">Search Results</p>
          <h1 className="mt-2 text-4xl font-black">{sport} venues near {location}</h1>
          <p className="mt-2 text-sm text-ink-muted">{result.pagination?.total || turfs.length} matching venues found for {date}</p>
        </div>
        <Button onClick={() => setFiltersOpen(true)} variant="outline">
          <Filter size={18} />
          Filters
        </Button>
      </div>
      <Drawer onOpenChange={setFiltersOpen} open={filtersOpen} title="Search Filters">
        <SearchFilters compact initialFilters={filterValues} metadata={metadata} onApply={applyFilters} />
      </Drawer>
      <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
        <div className="hidden lg:block">
          <SearchFilters initialFilters={filterValues} metadata={metadata} onApply={applyFilters} />
        </div>
        <div>
          <div className="grid gap-5 md:grid-cols-2">
            {turfs.map((turf) => (
              <TurfCard key={turf.id} turf={turf} />
            ))}
          </div>
          {!turfs.length && (
            <EmptyState
              actionLabel="Reset Filters"
              description={isError ? "Check the API connection and try again." : "Clear a filter or choose another date to continue."}
              icon="Search"
              onAction={() => applyFilters({ date: futureDate(), location: "", sport: "" })}
              title={isError ? "Venues could not be loaded" : "No venues match these filters"}
            />
          )}
          <div className="mt-8">
            <Pagination
              onPageChange={(nextPage) => {
                searchParams.set("page", String(nextPage));
                setSearchParams(searchParams);
              }}
              page={page}
              totalPages={result.pagination?.pages || 1}
            />
          </div>
        </div>
      </div>
    </main>
  );
}

export function VenueDetailsPage() {
  const { id } = useParams();
  const requireBooking = useBookingGuard();
  const { user } = useAuth();
  const { location: userLocation } = useUserLocation();
  const { data: favorites = [] } = useFavorites(Boolean(user));
  const favoriteMutation = useFavoriteMutation();
  const [date, setDate] = useState(futureDate());
  const [favoriteOverride, setFavoriteOverride] = useState(null);
  const [mediaMode, setMediaMode] = useState("");
  const detailParams = useMemo(() => userLocationParams(userLocation), [userLocation]);
  const { data: turf, isError, isLoading } = useTurf(id, detailParams);
  const { data: availability = { slots: [], timeline: [] } } = useTurfAvailability(id, date);
  const { data: similarResult = { turfs: [] } } = useTurfs({
    limit: 4,
    sport: turf?.sport,
  });
  const dates = useMemo(
    () => Array.from({ length: 4 }, (_, index) => futureDate(index + 1)),
    [],
  );
  const serverFavorite = turf ? favorites.some((favorite) => favorite.id === turf.id) : false;
  const isFavorite = favoriteOverride ?? serverFavorite;

  useEffect(() => {
    setFavoriteOverride(null);
  }, [id, serverFavorite]);

  if (isLoading) {
    return <main className="page-shell py-16 text-center text-ink-muted">Loading venue...</main>;
  }
  if (isError || !turf) {
    return (
      <main className="page-shell py-16 text-center">
        <h1 className="text-3xl font-black">Venue not found</h1>
        <p className="mt-3 text-ink-muted">This venue may be unavailable or awaiting approval.</p>
        <Button as={Link} className="mt-5" to="/explore">Explore Venues</Button>
      </main>
    );
  }
  const visibleAvailability = (availability.timeline?.length ? availability.timeline : availability.slots || []).map((slot) => ({
    reason: slot.reason || (slot.status === "available" ? "Available" : slot.status),
    status: slot.status || "available",
    ...slot,
  }));
  const heroImage = turf.heroImage || turf.gallery[0];
  const venueMedia = Array.from(new Set([
    heroImage,
    turf.coverImage,
    turf.profileImage,
    turf.videoThumbnail,
    ...(turf.gallery || []),
    ...(turf.groundImages || []),
    ...(turf.amenityImages || []),
    ...(turf.locationImages || []),
    ...(turf.sportsImages || []),
  ].filter(Boolean)));
  const sideImages = venueMedia.filter((image) => image !== heroImage).slice(0, 2);

  return (
    <main className="page-shell py-8">
      <section className="grid gap-4 lg:grid-cols-[1.4fr_0.75fr]">
        <div className="relative min-h-[420px] overflow-hidden rounded-2xl">
          <img alt={turf.name} className="h-full w-full object-cover" data-fallback-src={turf.coverImage} onError={handleImageError} src={heroImage} />
          <div className="absolute bottom-5 left-5 flex gap-2">
            <Button onClick={() => setMediaMode("tour")} variant="dark">
              <Icon name="CircleGauge" />
              View 360 Tour
            </Button>
            <Button onClick={() => setMediaMode("photos")} variant="outline" className="bg-white/90">
              <Icon name="Image" />
              View all photos
            </Button>
          </div>
        </div>
        <div className="grid gap-4">
          {sideImages.map((image) => (
            <img alt={turf.name} className="h-48 w-full rounded-2xl object-cover lg:h-full" data-fallback-src={heroImage} key={image} loading="lazy" onError={handleImageError} src={image} />
          ))}
        </div>
      </section>
      <section className="mt-10 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-8">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-4xl font-black tracking-normal">{turf.name}</h1>
                <p className="mt-2 flex items-center gap-2 text-sm text-ink-muted">
                  <MapPin size={16} />
                  {turf.location}
                </p>
              </div>
              <Button
                aria-label={isFavorite ? "Remove favorite" : "Save favorite"}
                aria-pressed={isFavorite}
                className={
                  isFavorite
                    ? "border-danger/30 bg-danger-soft text-danger hover:border-danger hover:bg-red-50 hover:text-danger"
                    : "text-ink-muted"
                }
                disabled={favoriteMutation.isPending}
                onClick={() => {
                  if (!user) {
                    requireBooking(`/venue/${turf.id}`);
                    return;
                  }
                  const nextFavorite = !isFavorite;
                  setFavoriteOverride(nextFavorite);
                  favoriteMutation.mutate(
                    { id: turf.id, favorite: nextFavorite },
                    {
                      onError: (error) => {
                        setFavoriteOverride(serverFavorite);
                        notify(error.response?.data?.message || error.message);
                      },
                      onSuccess: () => notify(nextFavorite ? "Venue saved to favorites." : "Venue removed from favorites."),
                    },
                  );
                }}
                size="icon"
                variant="outline"
              >
                <Icon className={isFavorite ? "fill-current" : ""} name="Heart" />
              </Button>
            </div>
          </div>
          <div>
            <h2 className="text-xl font-black">Facilities & Amenities</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {turf.amenities.map((amenity, index) => (
                <Card key={amenity}>
                  <CardContent className="p-4">
                    <img
                      alt={`${amenity} at ${turf.name}`}
                      className="mb-3 h-20 w-full rounded-lg object-cover"
                      data-fallback-src={heroImage}
                      loading="lazy"
                      onError={handleImageError}
                      src={turf.amenityImages[index % turf.amenityImages.length] || heroImage}
                    />
                    <Icon className="text-primary" name="ShieldCheck" />
                    <p className="mt-3 text-sm font-bold">{amenity}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
          <div>
            <h2 className="text-xl font-black">The Arena Experience</h2>
            <p className="mt-3 max-w-3xl leading-7 text-ink-muted">
              Experience world-class play on premium synthetic surfaces, broadcast-grade lights, climate controlled support spaces,
              and fast digital check-in built for repeated weekly play.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {turf.groundImages.slice(0, 4).map((image, index) => (
                <img
                  alt={`${turf.name} ground view ${index + 1}`}
                  className="h-32 w-full rounded-xl object-cover"
                  data-fallback-src={heroImage}
                  key={image}
                  loading="lazy"
                  onError={handleImageError}
                  src={image}
                />
              ))}
            </div>
          </div>
          <Card className="bg-primary-soft/50">
            <CardContent>
              <p className="muted-label text-primary">Ground Rules</p>
              <div className="mt-4 space-y-2 text-sm text-ink-muted">
                {["No metal studs allowed on the surface.", "Arrive 15 minutes before your slot.", "Bibs and professional balls provided."].map((rule) => (
                  <p className="flex items-center gap-2" key={rule}>
                    <Check className="text-accent" size={16} />
                    {rule}
                  </p>
                ))}
              </div>
            </CardContent>
          </Card>
          <div>
            <h2 className="text-xl font-black">Location & Access</h2>
            <div className="relative mt-4 h-72 overflow-hidden rounded-2xl">
              <VenueMap className="h-full w-full" label={turf.name} latitude={turf.latitude} longitude={turf.longitude} userLocation={userLocation} />
            </div>
            <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <p className="rounded-xl bg-surface-low p-3"><span className="block text-xs font-bold uppercase tracking-wider text-ink-soft">Address</span>{turf.address || turf.location}</p>
              <p className="rounded-xl bg-surface-low p-3"><span className="block text-xs font-bold uppercase tracking-wider text-ink-soft">Distance From User</span>{turf.distanceInKm ? `${turf.distanceInKm} km` : "Enable location"}</p>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              {turf.locationImages.slice(0, 4).map((image, index) => (
                <img
                  alt={`${turf.name} access view ${index + 1}`}
                  className="h-28 w-full rounded-xl object-cover"
                  data-fallback-src={heroImage}
                  key={image}
                  loading="lazy"
                  onError={handleImageError}
                  src={image}
                />
              ))}
            </div>
            <Button as="a" className="mt-4" href={directionsUrl(turf)} rel="noreferrer" target="_blank" variant="outline">
              <MapPin size={16} />
              Get Directions
            </Button>
          </div>
        </div>
        <aside className="lg:sticky lg:top-24 lg:h-max">
          <Card>
            <CardContent>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-3xl font-black">{currency(turf.price)}</p>
                  <p className="text-sm text-ink-muted">per hour</p>
                </div>
                <Badge variant="secondary">Live Slots</Badge>
              </div>
              <p className="muted-label mt-6">Select Date</p>
              <div className="mt-3 grid grid-cols-4 gap-2">
                {dates.map((option) => (
                  <button
                    className={`rounded-lg border p-3 text-xs font-black ${date === option ? "border-primary bg-primary text-white" : "border-surface-border bg-white"}`}
                    key={option}
                    onClick={() => setDate(option)}
                  >
                    {new Date(`${option}T00:00:00Z`).toLocaleDateString("en-US", { day: "numeric", month: "short", timeZone: "UTC" })}
                  </button>
                ))}
              </div>
              <p className="muted-label mt-6">Available Slots</p>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {visibleAvailability.map((slot, index) => (
                  <button
                    className={`rounded-lg px-3 py-2 text-left text-xs font-bold ${availabilityButtonClass(slot, index)}`}
                    disabled={slot.status !== "available"}
                    key={`${slot.startTime}-${slot.endTime}`}
                    onClick={() => requireBooking(`/booking/slots?venue=${turf.id}&date=${date}`)}
                    type="button"
                  >
                    {slot.startTime}-{slot.endTime}
                    <span className="mt-1 block opacity-70">{slot.reason || "Available"}</span>
                  </button>
                ))}
              </div>
              {!visibleAvailability.length && <p className="mt-3 text-sm text-ink-muted">No slots are available for this date.</p>}
              <Button as={Link} className="mt-6 w-full" to={`/booking/slots?venue=${turf.id}&date=${date}`}>
                Reserve Now
                <ChevronRight size={17} />
              </Button>
              <p className="mt-3 text-center text-xs text-ink-soft">No payment required until arrival</p>
            </CardContent>
          </Card>
        </aside>
      </section>
      <section className="mt-14">
        <SectionHeader title="Similar High-Performance Venues" />
        <div className="grid gap-5 md:grid-cols-3">
          {similarResult.turfs.filter((item) => item.id !== turf.id).slice(0, 3).map((item) => (
            <TurfCard compact key={item.id} turf={item} />
          ))}
        </div>
      </section>
      <Modal onOpenChange={(open) => !open && setMediaMode("")} open={Boolean(mediaMode)} title={mediaMode === "tour" ? `${turf.name} 360 Tour` : `${turf.name} Gallery`}>
        <div className={mediaMode === "photos" ? "grid gap-3 sm:grid-cols-2" : ""}>
          {(mediaMode === "photos" ? venueMedia : [turf.videoThumbnail || heroImage]).map((image) => (
            <img alt={turf.name} className="max-h-[60vh] w-full rounded-xl object-cover" data-fallback-src={heroImage} key={image} onError={handleImageError} src={image} />
          ))}
        </div>
        {mediaMode === "tour" && <p className="mt-3 text-sm text-ink-muted">Drag-free prototype panorama preview generated from the venue hero media.</p>}
      </Modal>
    </main>
  );
}

export function CoachingPage() {
  const coachListRef = useRef(null);
  const coachStartDateInputRef = useRef(null);
  const { user } = useAuth();
  const { data: coaches = [], isLoading } = useCoaches();
  const canRequestCoach = ["user", "admin"].includes(user?.role);
  const { data: myCoachRequests = [] } = useMyCoachRequests(Boolean(canRequestCoach));
  const createCoachRequest = useCreateCoachRequest();
  const [selectedSport, setSelectedSport] = useState("All");
  const [selectedCoach, setSelectedCoach] = useState(null);
  const [requestForm, setRequestForm] = useState({
    notes: "",
    paymentMethod: "UPI",
    preferredStartDate: futureDate(3),
    timing: "",
  });
  const sports = ["All", ...new Set(coaches.map((coach) => coach.sport).filter(Boolean))];
  const visibleCoaches = selectedSport === "All" ? coaches : coaches.filter((coach) => coach.sport === selectedSport);
  const requestByCoach = new Map(myCoachRequests.map((request) => [request.coachId, request]));
  const paidRequests = myCoachRequests.filter((request) => request.paymentStatus === "paid");
  const pendingRequests = paidRequests.filter((request) => request.approvalStatus === "pending");
  const approvedRequests = paidRequests.filter((request) => request.approvalStatus === "approved");

  function openCoachRequest(coach) {
    setSelectedCoach(coach);
    setRequestForm({
      notes: "",
      paymentMethod: "UPI",
      preferredStartDate: futureDate(3),
      timing: coach.timings[0] || "",
    });
  }

  function openCoachStartDatePicker() {
    const input = coachStartDateInputRef.current;
    if (!input) return;
    if (input.showPicker) {
      input.showPicker();
      return;
    }
    input.click();
  }

  async function submitCoachRequest(event) {
    event.preventDefault();
    if (!selectedCoach) return;

    try {
      await createCoachRequest.mutateAsync({
        coachId: selectedCoach.coachId,
        ...requestForm,
      });
      setSelectedCoach(null);
      notify("Coach payment successful. Waiting for turf owner approval.");
    } catch (error) {
      notify(error.response?.data?.message || error.message);
    }
  }

  return (
    <main className="page-shell py-10">
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr] lg:items-center">
        <div>
          <Badge variant="secondary">Performance Academy</Badge>
          <h1 className="mt-4 text-5xl font-black tracking-normal">Certified coaching for measurable athletic progress.</h1>
          <p className="mt-4 text-ink-muted">
            Book private coaches attached to real TURFX venues. Pay the monthly fee, then the turf owner approves your coaching slot.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button onClick={() => coachListRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}>
              Find a Coach
            </Button>
            {canRequestCoach && (
              <Button as={Link} to="/coaching/my" variant="outline">
                My Coaching
              </Button>
            )}
          </div>
        </div>
        <img alt="Performance training" className="min-h-96 rounded-3xl object-cover" src={assetImages.training} />
      </div>

      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {["Technical Skills", "Strength Lab", "Match Intelligence"].map((item) => (
          <Card interactive key={item}>
            <CardContent>
              <Icon className="text-primary" name="Dumbbell" />
              <h2 className="mt-4 text-xl font-black">{item}</h2>
              <p className="mt-2 text-sm text-ink-muted">Structured plans, progress check-ins, and coach feedback after every session.</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <section className="mt-12 grid gap-5 md:grid-cols-3">
        <StatsCard icon="Dumbbell" label="Available Coaches" value={String(coaches.length)} />
        <StatsCard icon="Clock" label="Pending Approvals" tone="warning" value={String(pendingRequests.length)} />
        <StatsCard icon="BadgeCheck" label="Approved Plans" tone="secondary" value={String(approvedRequests.length)} />
      </section>

      {canRequestCoach && Boolean(myCoachRequests.length) && (
        <section className="mt-12">
          <SectionHeader
            action={<Button as={Link} to="/coaching/my" variant="ghost">View All <ChevronRight size={16} /></Button>}
            subtitle="Paid coaching plans stay pending until the venue owner approves the coach timing."
            title="My Coaching Status"
          />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {myCoachRequests.slice(0, 3).map((request) => (
              <Card key={request.id}>
                <CardContent>
                  <Badge variant={request.approvalStatus === "approved" ? "success" : request.approvalStatus === "rejected" ? "danger" : "warning"}>
                    {request.status}
                  </Badge>
                  <h2 className="mt-4 text-xl font-black">{request.coachName}</h2>
                  <p className="mt-2 text-sm text-ink-muted">{request.venue}</p>
                  <div className="mt-5 grid gap-2 text-sm">
                    <p className="flex justify-between gap-4"><span>Timing</span><strong className="text-right">{request.timing}</strong></p>
                    <p className="flex justify-between gap-4"><span>Monthly fee</span><strong>{currency(request.monthlyFee)}</strong></p>
                    <p className="flex justify-between gap-4"><span>Payment</span><strong>{request.paymentStatus}</strong></p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section className="mt-12 scroll-mt-24" ref={coachListRef}>
        <SectionHeader
          subtitle="Coaches are generated from approved turf venues, with dummy monthly plans and real owner approval flow."
          title="Available Turf Coaches"
        />
        <div className="mb-5 flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {sports.map((sport) => (
            <Button
              key={sport}
              onClick={() => setSelectedSport(sport)}
              variant={selectedSport === sport ? "primary" : "outline"}
            >
              {sport}
            </Button>
          ))}
        </div>
        {isLoading ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <Card key={item}>
                <CardContent>
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="mt-4 h-28 w-full" />
                  <Skeleton className="mt-4 h-10 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : visibleCoaches.length ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {visibleCoaches.map((coach) => {
              const existingRequest = requestByCoach.get(coach.coachId);
              return (
                <Card interactive className="h-full" key={coach.coachId}>
                  <CardContent className="flex h-full flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <Badge variant="primary">{coach.sport}</Badge>
                        <h2 className="mt-4 text-2xl font-black">{coach.coachName}</h2>
                      </div>
                      <div className="grid h-12 w-12 place-items-center rounded-xl bg-secondary-soft text-secondary-deep">
                        <Icon name="Dumbbell" />
                      </div>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-ink-muted">{coach.specialty}</p>
                    <div className="mt-5 rounded-xl bg-surface-low p-4">
                      <p className="text-sm font-black">{coach.venue}</p>
                      <p className="mt-1 text-xs text-ink-muted">{coach.turf.location || coach.turf.city}</p>
                    </div>
                    <div className="mt-5 grid gap-3 text-sm">
                      <p className="flex justify-between gap-4"><span className="text-ink-muted">Monthly fee</span><strong>{currency(coach.monthlyFee)}</strong></p>
                      <p className="flex justify-between gap-4"><span className="text-ink-muted">Sessions</span><strong>{coach.sessionsPerMonth} / month</strong></p>
                      <p className="flex justify-between gap-4"><span className="text-ink-muted">Experience</span><strong>{coach.experience}</strong></p>
                    </div>
                    <div className="mt-5 space-y-2">
                      {coach.timings.map((timing) => (
                        <p className="rounded-lg border border-surface-border px-3 py-2 text-xs font-bold text-ink-muted" key={timing}>
                          {timing}
                        </p>
                      ))}
                    </div>
                    <div className="mt-auto pt-6">
                      {existingRequest ? (
                        <Button as={Link} className="w-full" to="/coaching/my" variant="outline">
                          {existingRequest.approvalStatus === "approved" ? "Successful Plan" : "View Pending Plan"}
                        </Button>
                      ) : user ? (
                        <Button
                          className="w-full"
                          disabled={!canRequestCoach}
                          onClick={() => openCoachRequest(coach)}
                        >
                          Pay Monthly Fee
                        </Button>
                      ) : (
                        <Button as={Link} className="w-full" to="/login">
                          Login to Book Coach
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <EmptyState
            description="Approved turf venues will automatically show coach plans here."
            icon="Dumbbell"
            title="No coaches available yet"
          />
        )}
      </section>

      <Modal onOpenChange={(open) => !open && setSelectedCoach(null)} open={Boolean(selectedCoach)} title="Confirm Monthly Coaching">
        {selectedCoach && (
          <form className="grid gap-4" onSubmit={submitCoachRequest}>
            <div className="rounded-xl bg-surface-low p-4">
              <h2 className="text-xl font-black">{selectedCoach.coachName}</h2>
              <p className="mt-1 text-sm text-ink-muted">{selectedCoach.venue} - {selectedCoach.sport}</p>
              <p className="mt-3 text-2xl font-black text-primary">{currency(selectedCoach.monthlyFee)} / month</p>
              <p className="mt-1 text-xs text-ink-muted">Payment succeeds now. Turf owner approval is required before sessions become active.</p>
            </div>
            <label className="text-sm font-bold">
              Timing
              <select
                className="focus-ring mt-2 h-11 w-full rounded-lg border border-surface-outline bg-white px-3 text-sm"
                onChange={(event) => setRequestForm((current) => ({ ...current, timing: event.target.value }))}
                value={requestForm.timing}
              >
                {selectedCoach.timings.map((timing) => <option key={timing} value={timing}>{timing}</option>)}
              </select>
            </label>
            <div>
              <label className="text-sm font-bold" htmlFor="coach-start-date">
                Preferred start date
              </label>
              <div className="relative mt-2">
                <button
                  aria-label="Choose preferred start date"
                  className="focus-ring flex h-11 w-full items-center justify-between gap-3 rounded-lg border border-surface-outline bg-white px-3 text-left text-sm font-bold text-ink"
                  onClick={openCoachStartDatePicker}
                  type="button"
                >
                  <span>{formatDateLabel(requestForm.preferredStartDate)}</span>
                  <CalendarDays aria-hidden="true" className="shrink-0 text-ink-soft" size={18} />
                </button>
                <input
                  aria-label="Preferred start date"
                  className="pointer-events-none absolute h-px w-px opacity-0"
                  id="coach-start-date"
                  min={futureDate(1)}
                  onChange={(event) => setRequestForm((current) => ({ ...current, preferredStartDate: event.target.value }))}
                  ref={coachStartDateInputRef}
                  tabIndex={-1}
                  type="date"
                  value={requestForm.preferredStartDate}
                />
              </div>
            </div>
            <label className="text-sm font-bold">
              Payment method
              <select
                className="focus-ring mt-2 h-11 w-full rounded-lg border border-surface-outline bg-white px-3 text-sm"
                onChange={(event) => setRequestForm((current) => ({ ...current, paymentMethod: event.target.value }))}
                value={requestForm.paymentMethod}
              >
                {["UPI", "Card", "Mock Payment"].map((method) => <option key={method} value={method}>{method}</option>)}
              </select>
            </label>
            <Textarea
              maxLength={500}
              onChange={(event) => setRequestForm((current) => ({ ...current, notes: event.target.value }))}
              placeholder="Any training goal or note for the coach"
              value={requestForm.notes}
            />
            <Button disabled={createCoachRequest.isPending} type="submit">
              Pay & Request Owner Approval
            </Button>
          </form>
        )}
      </Modal>
    </main>
  );
}
