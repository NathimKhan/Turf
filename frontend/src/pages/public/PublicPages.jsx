import { useMemo, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  CalendarDays,
  Check,
  ChevronRight,
  Filter,
  MapPin,
  Search,
  Star,
  Ticket,
  Trophy,
} from "lucide-react";
import { Badge } from "../../components/ui/badge.jsx";
import { Button } from "../../components/ui/button.jsx";
import { Card, CardContent } from "../../components/ui/card.jsx";
import { Drawer } from "../../components/ui/drawer.jsx";
import { Input, Textarea } from "../../components/ui/input.jsx";
import { Modal } from "../../components/ui/modal.jsx";
import { EventCard } from "../../components/shared/EventCard.jsx";
import { Reveal } from "../../components/shared/Motion.jsx";
import { Pagination } from "../../components/shared/Pagination.jsx";
import { SearchFilters } from "../../components/shared/SearchFilters.jsx";
import { TurfCard } from "../../components/shared/TurfCard.jsx";
import { Icon } from "../../components/shared/icons.jsx";
import {
  assetImages,
  membershipTiers,
} from "../../data/turfxData.js";
import { useBookingGuard } from "../../hooks/useBookingGuard.js";
import { useTurf, useTurfAvailability, useTurfMetadata, useTurfs } from "../../hooks/useTurfs.js";
import {
  useEvent,
  useEvents,
  useFavoriteMutation,
  useFavorites,
  useTournament,
  useTournaments,
} from "../../hooks/usePlatform.js";
import { useAuth } from "../../store/authContext.js";
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
  return date.toISOString().slice(0, 10);
}

function availabilityButtonClass(slot, index) {
  if (slot.status === "booked") return "bg-surface-low text-ink-muted";
  if (slot.status === "blocked") return "bg-danger-soft text-danger";
  return index === 1 ? "bg-primary text-white" : "bg-surface-low text-ink-muted";
}

function storedIncludes(key, id) {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]").includes(id);
  } catch {
    return false;
  }
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

  return (
    <div className="glass-panel grid gap-3 rounded-2xl p-3 md:grid-cols-[1fr_1fr_1fr_auto]">
      <label className="relative flex cursor-pointer items-center gap-3 rounded-xl bg-white/65 px-4 py-3 focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2">
        <Icon className="text-primary" name="MapPin" />
        <span className="min-w-0">
          <span className="block text-xs font-bold uppercase tracking-wider text-ink-soft">Select location</span>
          <span className="block truncate text-sm font-bold text-ink">{location || "All locations"}</span>
        </span>
        <select
          aria-label="Select location"
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          onChange={(event) => setLocation(event.target.value)}
          value={location}
        >
          <option value="">All locations</option>
          {locationOptions.map((option) => (
            <option className="bg-white text-ink" key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
      <label className="relative flex cursor-pointer items-center gap-3 rounded-xl bg-white/65 px-4 py-3 focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2">
        <Icon className="text-primary" name="Goal" />
        <span className="min-w-0">
          <span className="block text-xs font-bold uppercase tracking-wider text-ink-soft">Pick a sport</span>
          <span className="block truncate text-sm font-bold text-ink">{sport || "All sports"}</span>
        </span>
        <select
          aria-label="Pick a sport"
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          onChange={(event) => setSport(event.target.value)}
          value={sport}
        >
          <option value="">All sports</option>
          {sportOptions.map((option) => (
            <option className="bg-white text-ink" key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
      <div className="relative flex cursor-pointer items-center gap-3 rounded-xl bg-white/65 px-4 py-3 focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2">
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
        className={compact ? "" : "md:h-full"}
        as={Link}
        to={{ pathname: "/search", search: new URLSearchParams({ location, sport, date }).toString() }}
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
  const { data: tournaments = [] } = useTournaments();
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
  const liveSlots = turfs.slice(0, 4).map((turf) => ({
    id: turf.id,
    sport: turf.sport,
    time: "Check live slots",
    venue: turf.name,
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
              Discover, book, and play at the best sports venues in your city with real-time availability and competitive events.
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
        <div className="grid min-h-[420px] w-full grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          {sports.map((sport, index) => (
            <Reveal
              className={index === 0 ? "xl:col-span-2 xl:row-span-2" : index === sports.length - 1 ? "xl:col-span-2" : ""}
              delay={index * 0.06}
              key={sport.name}
            >
              <Link
                className="group relative block h-full min-h-48 overflow-hidden rounded-2xl"
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

      <section className="bg-primary-soft/55 py-12">
        <div className="page-shell">
          <div className="mb-5 flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-accent" />
            <p className="text-sm font-bold">Live Availability</p>
            <span className="text-xs text-ink-muted">Slots available in the next 60 minutes</span>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            {liveSlots.map((slot) => (
              <Link key={slot.venue} to={`/venue/${slot.id}`}>
                <Card interactive className="h-full">
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <p className="text-sm font-black">{slot.venue}</p>
                      <p className="text-xs text-ink-muted">{slot.time}</p>
                    </div>
                    <Badge variant="secondary">{slot.sport}</Badge>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
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

      <section className="page-shell pb-16">
        <div className="grid overflow-hidden rounded-3xl bg-dark text-white lg:grid-cols-[1.1fr_0.9fr]">
          <div className="p-8 md:p-12">
            <p className="muted-label text-secondary">Competitive Edge</p>
            <h2 className="mt-3 text-4xl font-black">Elite Tournaments</h2>
            <p className="mt-4 max-w-md text-white/70">
              Join prestigious local tournaments. Prove your skills, climb leaderboards, and unlock athlete rewards.
            </p>
            <Button as={Link} className="mt-6" to="/tournaments" variant="secondary">
              View Tournament Schedule
            </Button>
          </div>
          <div className="space-y-3 p-6 md:p-10">
            {tournaments.slice(0, 2).map((tournament) => (
              <Link className="flex items-center justify-between rounded-xl bg-white/10 p-4 transition-colors hover:bg-white/15" key={tournament.id} to={`/tournaments/${tournament.id}`}>
                <div className="flex items-center gap-4">
                  <div className="grid h-14 w-14 place-items-center rounded-lg bg-primary text-center text-xs font-black">
                    {tournament.date}
                  </div>
                  <div>
                    <p className="font-black">{tournament.title}</p>
                    <p className="text-sm text-white/65">{tournament.teams} teams - {tournament.prize}</p>
                  </div>
                </div>
                <ChevronRight size={18} />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="page-shell grid gap-5 pb-16 md:grid-cols-2">
        {[
          ["Pro Coaching", "Learn from certified professionals to elevate your game.", assetImages.training, "/coaching"],
          ["TURFX Gold", "Unlock priority booking, exclusive discounts, and access to premium member lounges.", assetImages.indoor, "/memberships"],
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

export function ExplorePage() {
  const { data: turfResult = { turfs: [] } } = useTurfs({ limit: 100 });
  const { data: metadata = {} } = useTurfMetadata();
  const turfs = turfResult.turfs;
  const sports = (metadata.sports || []).map((name) => ({
    name,
    ...(sportVisuals[name] || { icon: "Goal" }),
  }));

  return (
    <main className="page-shell py-8">
      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.35fr]">
        <section className="min-w-0">
          <p className="muted-label text-primary">TURFX Discovery</p>
          <h1 className="mt-3 text-4xl font-black tracking-normal md:text-5xl">Find your arena</h1>
          <p className="mt-3 text-ink-muted">Search premium venues, compare live slots, and reserve in minutes.</p>
          <div className="mt-6">
            <SearchPanel compact />
          </div>
          <div className="mt-5 flex gap-3 overflow-x-auto pb-2 no-scrollbar">
            {sports.map((sport) => (
              <Button
                as={Link}
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
        <section className="relative min-h-80 min-w-0 overflow-hidden rounded-3xl border border-surface-border">
          <img alt="Map preview" className="h-full min-h-80 w-full object-cover grayscale" src={assetImages.map} />
          <div className="absolute inset-0 bg-primary/10" />
          <div className="absolute bottom-5 left-5 right-5 flex gap-3 overflow-x-auto no-scrollbar">
            {turfs.slice(0, 3).map((turf) => (
              <Card className="min-w-64 bg-white/90 backdrop-blur" key={turf.id}>
                <CardContent className="flex items-center gap-3 p-3">
                  <img alt={turf.name} className="h-12 w-12 rounded-lg object-cover" onError={handleImageError} src={turf.image} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black">{turf.name}</p>
                    <p className="text-xs text-ink-muted">{turf.distance} away</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </div>
      <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {turfs.map((turf) => (
          <TurfCard key={turf.id} turf={turf} />
        ))}
      </div>
    </main>
  );
}

export function SearchResultsPage() {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Number(searchParams.get("page") || 1);
  const locationFilter = searchParams.get("location") || "";
  const sportFilter = searchParams.get("sport") || "";
  const dateFilter = searchParams.get("date") || futureDate();
  const params = {
    city: locationFilter || undefined,
    sport: sportFilter || undefined,
    date: dateFilter,
    page,
  };
  const { data: result = { pagination: {}, turfs: [] }, isError } = useTurfs(params);
  const { data: metadata = {} } = useTurfMetadata();
  const turfs = result.turfs;
  const location = locationFilter || "all locations";
  const sport = sportFilter || "Sports";
  const date = dateFilter;
  const filterValues = { date: dateFilter, location: locationFilter, sport: sportFilter };

  function applyFilters(nextFilters) {
    setSearchParams({ ...nextFilters, page: "1" });
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
            <Card>
              <CardContent className="text-center">
                <Search className="mx-auto text-primary" />
                <h2 className="mt-3 text-xl font-black">{isError ? "Venues could not be loaded" : "No venues match these filters"}</h2>
                <p className="mt-2 text-sm text-ink-muted">
                  {isError ? "Check the API connection and try again." : "Clear a filter or choose another date to continue."}
                </p>
                <Button className="mt-5" onClick={() => applyFilters({ date: futureDate(), location: "", sport: "" })}>
                  Reset Filters
                </Button>
              </CardContent>
            </Card>
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
  const { data: favorites = [] } = useFavorites(Boolean(user));
  const favoriteMutation = useFavoriteMutation();
  const [date, setDate] = useState(futureDate());
  const [mediaMode, setMediaMode] = useState("");
  const { data: turf, isError, isLoading } = useTurf(id);
  const { data: availability = { slots: [], timeline: [] } } = useTurfAvailability(id, date);
  const { data: similarResult = { turfs: [] } } = useTurfs({
    limit: 4,
    sport: turf?.sport,
  });
  const dates = useMemo(
    () => Array.from({ length: 4 }, (_, index) => futureDate(index + 1)),
    [],
  );

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
  const isFavorite = favorites.some((favorite) => favorite.id === turf.id);
  const visibleAvailability = (availability.timeline?.length ? availability.timeline : availability.slots || []).map((slot) => ({
    reason: slot.reason || (slot.status === "available" ? "Available" : slot.status),
    status: slot.status || "available",
    ...slot,
  }));

  return (
    <main className="page-shell py-8">
      <section className="grid gap-4 lg:grid-cols-[1.4fr_0.75fr]">
        <div className="relative min-h-[420px] overflow-hidden rounded-2xl">
          <img alt={turf.name} className="h-full w-full object-cover" onError={handleImageError} src={turf.gallery[0]} />
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
          {turf.gallery.slice(1, 3).map((image) => (
            <img alt={turf.name} className="h-48 w-full rounded-2xl object-cover lg:h-full" key={image} onError={handleImageError} src={image} />
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
                  <span>-</span>
                  <Star className="fill-warning text-warning" size={16} />
                  {turf.rating} ({turf.reviews} reviews)
                </p>
              </div>
              <Button
                aria-label={isFavorite ? "Remove favorite" : "Save favorite"}
                onClick={() => {
                  if (!user) {
                    requireBooking(`/venue/${turf.id}`);
                    return;
                  }
                  favoriteMutation.mutate(
                    { id: turf.id, favorite: !isFavorite },
                    { onSuccess: () => notify(isFavorite ? "Venue removed from favorites." : "Venue saved to favorites.") },
                  );
                }}
                size="icon"
                variant="outline"
              >
                <Icon name="Heart" />
              </Button>
            </div>
          </div>
          <div>
            <h2 className="text-xl font-black">Facilities & Amenities</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {turf.amenities.map((amenity) => (
                <Card key={amenity}>
                  <CardContent className="p-4">
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
              <img alt="Venue map" className="h-full w-full object-cover grayscale" src={assetImages.map} />
              <div className="absolute left-1/2 top-1/2 grid h-12 w-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-primary text-white shadow-lift">
                <MapPin size={22} />
              </div>
            </div>
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
                <Badge variant="secondary">Members save 15%</Badge>
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
          {(mediaMode === "photos" ? turf.gallery : turf.gallery.slice(0, 1)).map((image) => (
            <img alt={turf.name} className="max-h-[60vh] w-full rounded-xl object-cover" key={image} onError={handleImageError} src={image} />
          ))}
        </div>
        {mediaMode === "tour" && <p className="mt-3 text-sm text-ink-muted">Drag-free prototype panorama preview generated from the venue hero media.</p>}
      </Modal>
    </main>
  );
}

export function MembershipsPage() {
  const { user } = useAuth();
  return (
    <main>
      <section className="relative overflow-hidden bg-dark py-20 text-white">
        <img alt="Membership court" className="absolute inset-0 h-full w-full object-cover opacity-45" src={assetImages.indoor} />
        <div className="absolute inset-0 bg-gradient-to-r from-dark via-dark/75 to-dark/20" />
        <div className="page-shell relative">
          <Badge className="bg-accent text-white">TURFX Elite</Badge>
          <h1 className="mt-5 max-w-3xl text-5xl font-black tracking-normal">Memberships built for the way serious athletes repeat.</h1>
          <p className="mt-5 max-w-xl text-white/75">
            Priority access, member savings, recovery benefits, and tournament privileges across the TURFX network.
          </p>
        </div>
      </section>
      <section className="page-shell py-14">
        <div className="grid gap-5 lg:grid-cols-3">
          {membershipTiers.map((tier) => (
            <Card className={tier.featured ? "border-primary bg-primary text-white shadow-lift" : ""} interactive key={tier.name}>
              <CardContent>
                <Badge variant={tier.featured ? "white" : "primary"}>{tier.label}</Badge>
                <h2 className="mt-5 text-3xl font-black">{tier.name}</h2>
                <p className={`mt-2 text-sm ${tier.featured ? "text-white/75" : "text-ink-muted"}`}>
                  {tier.price === 0 ? "Free" : `${currency(tier.price)} / month`}
                </p>
                <div className="mt-6 space-y-3">
                  {tier.perks.map((perk) => (
                    <p className="flex items-center gap-2 text-sm" key={perk}>
                      <Check size={16} />
                      {perk}
                    </p>
                  ))}
                </div>
                <Button
                  as={Link}
                  className="mt-7 w-full"
                  state={!user ? { from: "/membership-center" } : undefined}
                  to={user ? "/membership-center" : "/login"}
                  variant={tier.featured ? "dark" : "primary"}
                >
                  {tier.name === user?.membershipPlan ? "Current Plan" : `Choose ${tier.name}`}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}

export function TournamentsPage() {
  const { data: tournaments = [] } = useTournaments();

  return (
    <main className="page-shell py-10">
      <SectionHeader
        eyebrow="Competitive"
        subtitle="Bracket-ready events with team registration, prize pools, and live leaderboards."
        title="Tournaments"
      />
      <div className="grid gap-5 lg:grid-cols-3">
        {tournaments.map((tournament) => (
          <Card interactive key={tournament.id}>
            <CardContent>
              <Badge variant="primary">{tournament.status}</Badge>
              <h2 className="mt-5 text-2xl font-black">{tournament.title}</h2>
              <div className="mt-5 grid gap-3 text-sm text-ink-muted">
                <p className="flex items-center gap-2">
                  <CalendarDays size={16} />
                  {tournament.date}
                </p>
                <p className="flex items-center gap-2">
                  <Trophy size={16} />
                  {tournament.teams} teams - {tournament.prize}
                </p>
              </div>
              <Button as={Link} className="mt-6 w-full" to={`/tournaments/${tournament.id}`}>
                Open Hub
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
      {!tournaments.length && <Card><CardContent className="text-center text-ink-muted">New tournament fixtures are being prepared. Check back soon.</CardContent></Card>}
    </main>
  );
}

export function TournamentHubPage() {
  const { id } = useParams();
  const { data: tournament, isError, isLoading } = useTournament(id);
  const bracket = tournament?.participants?.map((participant) => participant.name) || [];
  const [registered, setRegistered] = useState(() => storedIncludes("turfx-tournament-registrations", id));

  if (isLoading) {
    return <main className="page-shell py-16 text-center text-ink-muted">Loading tournament...</main>;
  }
  if (isError || !tournament) {
    return <main className="page-shell py-16 text-center"><h1 className="text-3xl font-black">Tournament not found</h1><Button as={Link} className="mt-5" to="/tournaments">View Tournaments</Button></main>;
  }

  return (
    <main className="page-shell py-10">
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card className="overflow-hidden">
          <div className="relative h-72">
            <img alt={tournament.title} className="h-full w-full object-cover" src={assetImages.event} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 to-transparent" />
            <div className="absolute bottom-6 left-6 text-white">
              <Badge className="bg-primary text-white">{tournament.status}</Badge>
              <h1 className="mt-4 text-4xl font-black">{tournament.title}</h1>
              <p className="mt-2 text-white/75">{tournament.teams} teams - Prize {tournament.prize}</p>
            </div>
          </div>
          <CardContent>
            <h2 className="text-xl font-black">Live Bracket</h2>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {bracket.map((team, index) => (
                <div className="rounded-xl border border-surface-border bg-surface-low p-4" key={team}>
                  <p className="text-xs font-bold uppercase tracking-wider text-ink-soft">Round {Math.floor(index / 2) + 1}</p>
                  <p className="mt-2 font-black">{team}</p>
                  <p className="mt-1 text-sm text-ink-muted">Seed #{index + 1}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <h2 className="text-2xl font-black">Register Team</h2>
            <p className="mt-2 text-sm text-ink-muted">Includes bracket entry, referee crew, live scoring, and warmup slot.</p>
            <div className="mt-6 space-y-3">
              {["Team roster", "Captain verification", "Payment hold", "Fixture lock"].map((item) => (
                <p className="flex items-center gap-2 text-sm font-bold" key={item}>
                  <Check className="text-accent" size={16} />
                  {item}
                </p>
              ))}
            </div>
            <Button
              className="mt-7 w-full"
              disabled={registered}
              onClick={() => {
                const registrations = JSON.parse(localStorage.getItem("turfx-tournament-registrations") || "[]");
                if (!registrations.includes(id)) registrations.push(id);
                localStorage.setItem("turfx-tournament-registrations", JSON.stringify(registrations));
                setRegistered(true);
                notify("Tournament registration saved.");
              }}
            >
              {registered ? "Team Registered" : "Register Now"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

export function EventsPage() {
  const { data: events = [] } = useEvents();

  return (
    <main className="page-shell py-10">
      <SectionHeader
        eyebrow="Events"
        subtitle="Discover challenges, academy sessions, and high-energy athletic meetups."
        title="Discover your next challenge"
      />
      <div className="grid gap-5 lg:grid-cols-3">
        {events.map((event) => (
          <EventCard event={event} key={event.id} />
        ))}
      </div>
      {!events.length && <Card><CardContent className="text-center text-ink-muted">New community events are being scheduled.</CardContent></Card>}
    </main>
  );
}

export function EventDetailsPage() {
  const { id } = useParams();
  const { data: event, isError, isLoading } = useEvent(id);
  const [ticketReserved, setTicketReserved] = useState(() => storedIncludes("turfx-event-tickets", id));

  if (isLoading) {
    return <main className="page-shell py-16 text-center text-ink-muted">Loading event...</main>;
  }
  if (isError || !event) {
    return <main className="page-shell py-16 text-center"><h1 className="text-3xl font-black">Event not found</h1><Button as={Link} className="mt-5" to="/events">View Events</Button></main>;
  }

  return (
    <main>
      <section className="relative min-h-[520px] overflow-hidden text-white">
        <img alt={event.title} className="absolute inset-0 h-full w-full object-cover" onError={handleImageError} src={event.image} />
        <div className="absolute inset-0 bg-gradient-to-t from-dark via-dark/55 to-transparent" />
        <div className="page-shell relative flex min-h-[520px] items-end pb-12">
          <div className="max-w-3xl">
            <Badge className="bg-primary text-white">{event.type}</Badge>
            <h1 className="mt-5 text-5xl font-black tracking-normal">{event.title}</h1>
            <p className="mt-4 max-w-2xl text-white/75">{event.description}</p>
          </div>
        </div>
      </section>
      <section className="page-shell grid gap-6 py-10 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card>
            <CardContent>
              <h2 className="text-2xl font-black">Experience Timeline</h2>
              <div className="mt-5 grid gap-4">
                {["Athlete check-in", "Warmup and coaching pods", "Main challenge rounds", "Awards and recovery lounge"].map((item, index) => (
                  <div className="flex gap-4" key={item}>
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary-soft text-primary font-black">{index + 1}</div>
                    <div>
                      <p className="font-black">{item}</p>
                      <p className="text-sm text-ink-muted">{index + 10}:00 session block</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardContent>
            <p className="muted-label text-primary">Secure your ticket</p>
            <h2 className="mt-2 text-3xl font-black">{currency(event.price)}</h2>
            <div className="mt-5 space-y-3 text-sm text-ink-muted">
              <p className="flex items-center gap-2">
                <CalendarDays size={16} />
                {event.date}
              </p>
              <p className="flex items-center gap-2">
                <MapPin size={16} />
                {event.venue}
              </p>
              <p className="flex items-center gap-2">
                <Ticket size={16} />
                {event.capacity}
              </p>
            </div>
            <Button
              className="mt-7 w-full"
              disabled={ticketReserved}
              onClick={() => {
                const tickets = JSON.parse(localStorage.getItem("turfx-event-tickets") || "[]");
                if (!tickets.includes(id)) tickets.push(id);
                localStorage.setItem("turfx-event-tickets", JSON.stringify(tickets));
                setTicketReserved(true);
                notify("Event ticket reserved with mock payment.");
              }}
            >
              {ticketReserved ? "Ticket Reserved" : "Reserve Ticket"}
            </Button>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

export function SupportPage() {
  const [searchParams] = useSearchParams();
  const [supportOpen, setSupportOpen] = useState(false);
  const [supportSearch, setSupportSearch] = useState(searchParams.get("q") || "");
  const [ticket, setTicket] = useState({ bookingReference: "", message: "", name: "" });
  const faqs = [
    ["How do I change a booking?", "Open My Bookings, choose the reservation, and use reschedule if the venue policy allows it."],
    ["Can turf owners add multiple venues?", "Yes. Turf Owner workspaces support multiple venues, pitch types, gallery media, and scheduling rules."],
    ["Is payment required upfront?", "Most venues support a payment hold with final settlement at check-in."],
  ];
  const visibleFaqs = faqs.filter(([question, answer]) => `${question} ${answer}`.toLowerCase().includes(supportSearch.toLowerCase()));

  return (
    <main className="page-shell py-10">
      <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
        <section>
          <Badge variant="primary">Help Center</Badge>
          <h1 className="mt-4 text-5xl font-black tracking-normal">Fast support for athletes and operators.</h1>
          <p className="mt-4 text-ink-muted">Search policies, talk to support, or open a ticket with booking context attached.</p>
          <form
            className="mt-6 flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              notify(visibleFaqs.length ? `${visibleFaqs.length} help article${visibleFaqs.length === 1 ? "" : "s"} found.` : "No matching help articles.");
            }}
          >
            <Input onChange={(event) => setSupportSearch(event.target.value)} placeholder="Search help articles" value={supportSearch} />
            <Button type="submit">
              <Search size={18} />
            </Button>
          </form>
          <Button className="mt-4" onClick={() => setSupportOpen(true)} variant="outline">
            <Icon name="LifeBuoy" />
            Open Priority Ticket
          </Button>
        </section>
        <section className="grid gap-4">
          {[
            ["Bookings", "Calendar changes, cancellations, and venue rules", "CalendarDays"],
            ["Payments", "Wallet, invoices, refunds, and payment holds", "CreditCard"],
            ["Turf Owner Tools", "Venue publishing, availability, analytics, and customer management", "Landmark"],
            ["Live Support", "Priority help for event day questions", "LifeBuoy"],
          ].map(([title, copy, icon]) => (
            <button
              className="text-left"
              key={title}
              onClick={() => {
                setTicket((current) => ({ ...current, message: `I need help with ${title.toLowerCase()}.` }));
                setSupportOpen(true);
              }}
              type="button"
            >
              <Card interactive className="h-full">
                <CardContent className="flex items-center gap-4">
                  <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary-soft text-primary">
                    <Icon name={icon} />
                  </div>
                  <div>
                    <h2 className="text-lg font-black">{title}</h2>
                    <p className="text-sm text-ink-muted">{copy}</p>
                  </div>
                </CardContent>
              </Card>
            </button>
          ))}
        </section>
      </div>
      <section className="mt-12">
        <SectionHeader title="Frequently Asked Questions" />
        <div className="grid gap-4 md:grid-cols-3">
          {visibleFaqs.map(([question, answer]) => (
            <Card key={question}>
              <CardContent>
                <h2 className="text-lg font-black">{question}</h2>
                <p className="mt-3 text-sm leading-6 text-ink-muted">{answer}</p>
              </CardContent>
            </Card>
          ))}
          {!visibleFaqs.length && (
            <Card className="md:col-span-3">
              <CardContent className="text-center">
                <h2 className="text-xl font-black">No matching help article</h2>
                <p className="mt-2 text-sm text-ink-muted">Open a priority ticket and the prototype will save your request locally.</p>
                <Button className="mt-5" onClick={() => setSupportOpen(true)}>Open Support Ticket</Button>
              </CardContent>
            </Card>
          )}
        </div>
      </section>
      <Modal onOpenChange={setSupportOpen} open={supportOpen} title="Priority Support Ticket">
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            const tickets = JSON.parse(localStorage.getItem("turfx-support-tickets") || "[]");
            tickets.push({ ...ticket, createdAt: new Date().toISOString(), reference: `SUP-${Date.now()}` });
            localStorage.setItem("turfx-support-tickets", JSON.stringify(tickets));
            setSupportOpen(false);
            setTicket({ bookingReference: "", message: "", name: "" });
            notify("Support ticket submitted.");
          }}
        >
          <Input aria-label="Name" onChange={(event) => setTicket((current) => ({ ...current, name: event.target.value }))} placeholder="Your name" required value={ticket.name} />
          <Input aria-label="Booking reference" onChange={(event) => setTicket((current) => ({ ...current, bookingReference: event.target.value }))} placeholder="Booking reference" value={ticket.bookingReference} />
          <Textarea aria-label="Support message" onChange={(event) => setTicket((current) => ({ ...current, message: event.target.value }))} placeholder="Tell us what happened..." required value={ticket.message} />
          <div className="flex justify-end gap-3">
            <Button onClick={() => setSupportOpen(false)} variant="outline">
              Cancel
            </Button>
            <Button type="submit">
              Submit Ticket
            </Button>
          </div>
        </form>
      </Modal>
    </main>
  );
}

export function CoachingPage() {
  return (
    <main className="page-shell py-10">
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr] lg:items-center">
        <div>
          <Badge variant="secondary">Performance Academy</Badge>
          <h1 className="mt-4 text-5xl font-black tracking-normal">Certified coaching for measurable athletic progress.</h1>
          <p className="mt-4 text-ink-muted">
            Book private coaches, join elite batches, and connect every session to your TURFX athlete profile.
          </p>
          <Button as={Link} className="mt-7" to="/support">Find a Coach</Button>
        </div>
        <img alt="Performance training" className="min-h-96 rounded-3xl object-cover" src={assetImages.training} />
      </div>
      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {["Technical Skills", "Strength Lab", "Match Intelligence"].map((item) => (
          <Card interactive key={item}>
            <CardContent>
              <Icon className="text-primary" name="Dumbbell" />
              <h2 className="mt-4 text-xl font-black">{item}</h2>
              <p className="mt-2 text-sm text-ink-muted">Structured plans, progress reviews, and coach feedback after every session.</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
