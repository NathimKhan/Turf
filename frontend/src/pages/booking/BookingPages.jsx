import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import confetti from "canvas-confetti";
import { useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import { z } from "zod";
import { CalendarDays, Check, LockKeyhole, MapPin, ShieldCheck, Ticket } from "lucide-react";
import { selectSlot, selectSport, selectVenue, setBookingId } from "../../store/store.js";
import { useAuth } from "../../store/authContext.js";
import { Badge } from "../../components/ui/badge.jsx";
import { Button } from "../../components/ui/button.jsx";
import { Card, CardContent } from "../../components/ui/card.jsx";
import { Input } from "../../components/ui/input.jsx";
import { Stepper } from "../../components/shared/Stepper.jsx";
import { addTurfSteps, assetImages } from "../../data/turfxData.js";
import { useBooking } from "../../hooks/useBookings.js";
import { useTurf, useTurfAvailability, useTurfs } from "../../hooks/useTurfs.js";
import { bookingsApi } from "../../services/api/bookings.js";
import { responseData } from "../../services/api/client.js";
import { currency } from "../../utils/formatters.js";
import { handleImageError } from "../../utils/media.js";

const checkoutSchema = z.object({
  name: z.string().trim().min(2, "Enter the cardholder name"),
  email: z.string().email("Enter a valid receipt email"),
  card: z.string().regex(/^(?:\d[ -]?){12,19}$/, "Enter a valid card number"),
  expiry: z.string().regex(/^(0[1-9]|1[0-2])\/\d{2}$/, "Use MM/YY"),
  cvc: z.string().regex(/^\d{3,4}$/, "Enter a 3 or 4 digit CVC"),
});

function timeToMinutes(time) {
  const [hours, minutes] = String(time || "00:00").split(":").map(Number);
  return hours * 60 + minutes;
}

function formatTime(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function formatTimeLabel(time) {
  const [hours, minutes = 0] = String(time || "00:00").split(":").map(Number);
  return new Date(2000, 0, 1, hours, minutes).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateLabel(value) {
  if (!value) return "Select a date";
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function durationLabel(hours) {
  const safeHours = Number(hours || 0);
  if (!safeHours) return "Select duration";
  return `${safeHours} Hour${safeHours === 1 ? "" : "s"}`;
}

function parseRanges(ranges = []) {
  return ranges
    .map((range) => {
      const [startTime, endTime] = String(range || "").split("-");
      const start = timeToMinutes(startTime);
      const end = timeToMinutes(endTime);
      if (!startTime || !endTime || Number.isNaN(start) || Number.isNaN(end) || end <= start) return null;
      return { end, endTime, start, startTime };
    })
    .filter(Boolean);
}

function dayKeyForDate(dateValue) {
  const date = new Date(`${dateValue}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return "";
  return ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][date.getUTCDay()];
}

function venueScheduleRanges(venue = {}, dateValue = "") {
  const dayKey = dayKeyForDate(dateValue);
  return venue.schedule?.weeklyAvailability?.[dayKey] || [];
}

function availabilityRanges(availability = {}, venue = {}, dateValue = "") {
  const apiRanges = availability.rules?.ranges;
  const fallbackRanges = venueScheduleRanges(venue, dateValue);

  if (Array.isArray(apiRanges) && apiRanges.length && !availability.isFallback) {
    return parseRanges(apiRanges);
  }

  if (fallbackRanges.length) {
    return parseRanges(fallbackRanges);
  }

  if (Array.isArray(apiRanges)) return parseRanges(apiRanges);

  return [];
}

function uniqueTimeOptions(values) {
  return [...new Set(values)]
    .sort((first, second) => timeToMinutes(first) - timeToMinutes(second))
    .map((value) => ({ label: formatTimeLabel(value), value }));
}

function generateStartOptions(availability = {}, venue = {}, dateValue = "") {
  const minimumBookingMinutes = Number(availability.rules?.minimumBookingMinutes || 60);
  const intervalMinutes = Number(availability.rules?.startIntervalMinutes || 30);
  const values = [];

  availabilityRanges(availability, venue, dateValue).forEach((range) => {
    for (let cursor = range.start; cursor + minimumBookingMinutes <= range.end; cursor += intervalMinutes) {
      values.push(formatTime(cursor));
    }
  });

  return uniqueTimeOptions(values);
}

function generateEndOptions(availability = {}, startTime = "", venue = {}, dateValue = "") {
  if (!startTime) return [];
  const start = timeToMinutes(startTime);
  const minimumBookingMinutes = Number(availability.rules?.minimumBookingMinutes || 60);
  const values = [];

  availabilityRanges(availability, venue, dateValue)
    .filter((range) => start >= range.start && start + minimumBookingMinutes <= range.end)
    .forEach((range) => {
      for (let cursor = start + minimumBookingMinutes; cursor <= range.end; cursor += minimumBookingMinutes) {
        values.push(formatTime(cursor));
      }
    });

  return uniqueTimeOptions(values);
}

function rateForSport(venue = {}, sport = "") {
  return Number(venue.sportRates?.[sport] ?? venue.price ?? 0);
}

function availabilityStatusMessage(request = {}) {
  if (request.available) return "Available";
  if (["booked", "pending"].includes(request.status)) return "Already booked";
  if (request.status === "invalid_duration") return request.message || "Minimum booking duration is 1 hour";
  return "No availability for selected time";
}

function availabilitySlots(availability = {}) {
  const timeline = availability.timeline?.length ? availability.timeline : availability.slots || [];
  return timeline.map((slot) => ({
    reason: slot.reason || (slot.status === "available" ? "Available" : slot.status),
    status: slot.status || "available",
    ...slot,
  }));
}

function slotMatchesTime(slot, startTime, endTime) {
  return slot.startTime === startTime && slot.endTime === endTime;
}

function slotsOverlap(slot, startTime, endTime) {
  return timeToMinutes(slot.startTime) < timeToMinutes(endTime) && timeToMinutes(slot.endTime) > timeToMinutes(startTime);
}

function resolveBookingAvailability({ availability = {}, endTime = "", minimumBookingMinutes = 60, slots = [], startTime = "", venue = {}, date = "" }) {
  if (!venue?.id) {
    return {
      available: false,
      message: "Turf not found",
      source: "venue",
      status: "missing_venue",
    };
  }

  if (!startTime || !endTime) {
    return {
      available: false,
      message: "Choose a start and end time.",
      source: "time",
      status: "missing_time",
    };
  }

  const durationMinutes = timeToMinutes(endTime) - timeToMinutes(startTime);
  if (durationMinutes < minimumBookingMinutes) {
    return {
      available: false,
      message: "Minimum booking duration is 1 hour",
      source: "duration",
      status: "invalid_duration",
    };
  }

  const exactSlot = slots.find((slot) => slotMatchesTime(slot, startTime, endTime));
  if (exactSlot) {
    return {
      available: exactSlot.status === "available",
      message: exactSlot.status === "available" ? "Available" : availabilityStatusMessage(exactSlot),
      reason: exactSlot.reason,
      source: "availability",
      status: exactSlot.status,
    };
  }

  const ranges = availabilityRanges(availability, venue, date);
  const insideOpenHours = ranges.some((range) => (
    timeToMinutes(startTime) >= range.start && timeToMinutes(endTime) <= range.end
  ));

  if (!insideOpenHours) {
    return {
      available: false,
      message: "No availability for selected time",
      source: "schedule",
      status: "closed",
    };
  }

  const blockingSlot = slots.find((slot) => slot.status !== "available" && slotsOverlap(slot, startTime, endTime));
  if (blockingSlot) {
    return {
      available: false,
      message: availabilityStatusMessage(blockingSlot),
      reason: blockingSlot.reason,
      source: "availability",
      status: blockingSlot.status,
    };
  }

  return {
    available: true,
    message: "Available",
    source: "schedule",
    status: "available",
  };
}

function bookingErrorMessage(error, hasVenue = false) {
  const message = error.response?.data?.message || error.message || "";
  if (hasVenue && /turf not found/i.test(message)) return "No availability for selected time";
  if (/overlaps|already booked/i.test(message)) return "Already booked";
  if (/closed|blocked|maintenance|buffer/i.test(message)) return "No availability for selected time";
  return message;
}

function slotDurationHours(slot) {
  if (!slot?.startTime || !slot?.endTime) return 1;
  return Math.max((timeToMinutes(slot.endTime) - timeToMinutes(slot.startTime)) / 60, 0);
}

function BookingSummary({ previewDate = "", previewSlot = null, previewSport = "", totalLabel = "Payment hold" }) {
  const booking = useSelector((state) => state.booking);
  const displaySlot = previewSlot || booking.selectedSlot;
  const displayDate = previewDate || booking.selectedDate;
  const duration = slotDurationHours(displaySlot);
  const hourlyRate = Number(displaySlot?.pricePerHour ?? booking.cart.price ?? 0);
  const slotPrice = Number((hourlyRate * duration).toFixed(2));
  const total = slotPrice + booking.cart.serviceFee - booking.cart.discount;
  const timeLabel = displaySlot?.endTime
    ? `${displaySlot.startTime} - ${displaySlot.endTime}`
    : displaySlot?.startTime || "Select a slot";
  const sportLabel = displaySlot?.sport || previewSport || booking.selectedSport || booking.cart.sport || "Select sport";

  return (
    <Card className="h-max">
      <CardContent>
        <p className="muted-label text-primary">Booking Summary</p>
        <h2 className="mt-2 text-2xl font-black">{booking.cart.venue}</h2>
        <div className="mt-5 space-y-3 text-sm text-ink-muted">
          <p className="flex items-center gap-2">
            <CalendarDays size={16} />
            {formatDateLabel(displayDate)} - {timeLabel}
          </p>
          <p className="flex items-center gap-2">
            <MapPin size={16} />
            {booking.cart.location || "Select a venue"}
          </p>
          <p className="flex items-center gap-2">
            <Ticket size={16} />
            {sportLabel} - {durationLabel(duration)}
          </p>
        </div>
        <div className="mt-6 space-y-3 border-t border-surface-border pt-5 text-sm">
          <div className="flex justify-between">
            <span>Slot price</span>
            <strong>{currency(slotPrice)}</strong>
          </div>
          <div className="flex justify-between">
            <span>Service fee</span>
            <strong>{currency(booking.cart.serviceFee)}</strong>
          </div>
          <div className="flex justify-between text-accent-deep">
            <span>Gold saving</span>
            <strong>-{currency(booking.cart.discount)}</strong>
          </div>
          <div className="flex justify-between border-t border-surface-border pt-4 text-lg font-black">
            <span>{totalLabel}</span>
            <span>{currency(total)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function SlotSelectionPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: turfResult = { turfs: [] } } = useTurfs({ limit: 1 });
  const venueId = searchParams.get("venue") || turfResult.turfs[0]?.id;
  const [date, setDate] = useState(searchParams.get("date") || new Date(Date.now() + 86400000).toISOString().slice(0, 10));
  const [selectedSport, setSelectedSport] = useState(searchParams.get("sport") || "");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [slotMessage, setSlotMessage] = useState("");
  const [checkedSlot, setCheckedSlot] = useState(null);
  const [isChecking, setIsChecking] = useState(false);
  const { data: venue } = useTurf(venueId);
  const { data: availability = { rules: {}, slots: [], timeline: [] } } = useTurfAvailability(venueId, date);
  const minimumBookingMinutes = Number(availability.rules?.minimumBookingMinutes || 60);
  const configuredSports = useMemo(() => venue?.sportsSupported || [], [venue]);
  const selectedRate = rateForSport(venue, selectedSport);
  const startOptions = useMemo(() => generateStartOptions(availability, venue, date), [availability, date, venue]);
  const endOptions = useMemo(() => generateEndOptions(availability, startTime, venue, date), [availability, date, startTime, venue]);
  const previewSlot = useMemo(() => (
    startTime && endTime
      ? {
          endTime,
          pricePerHour: selectedRate,
          sport: selectedSport,
          startTime,
        }
      : null
  ), [endTime, selectedRate, selectedSport, startTime]);
  const availableSlots = useMemo(() => availabilitySlots(availability), [availability]);
  const availabilityResult = useMemo(() => resolveBookingAvailability({
    availability,
    date,
    endTime,
    minimumBookingMinutes,
    slots: availableSlots,
    startTime,
    venue,
  }), [availability, availableSlots, date, endTime, minimumBookingMinutes, startTime, venue]);
  const checkoutEnabled = Boolean(
    venue?.id &&
    date &&
    selectedSport &&
    startTime &&
    endTime &&
    checkedSlot?.startTime === startTime &&
    checkedSlot?.endTime === endTime &&
    checkedSlot?.sport === selectedSport &&
    availabilityResult.available,
  );
  const dates = useMemo(
    () => Array.from({ length: 4 }, (_, index) => new Date(Date.now() + (index + 1) * 86400000).toISOString().slice(0, 10)),
    [],
  );

  useEffect(() => {
    if (venue) dispatch(selectVenue(venue));
  }, [dispatch, venue]);

  useEffect(() => {
    if (!venue) return;
    const nextSport = configuredSports.includes(selectedSport) ? selectedSport : configuredSports[0] || "";
    if (nextSport !== selectedSport) {
      setSelectedSport(nextSport);
      return;
    }
    if (nextSport) {
      dispatch(selectSport({ price: rateForSport(venue, nextSport), sport: nextSport }));
    }
  }, [configuredSports, dispatch, selectedSport, venue]);

  useEffect(() => {
    const nextStart = startOptions.some((option) => option.value === startTime)
      ? startTime
      : startOptions[0]?.value || "";
    if (nextStart !== startTime) setStartTime(nextStart);
  }, [startOptions, startTime]);

  useEffect(() => {
    const nextEnd = endOptions.some((option) => option.value === endTime)
      ? endTime
      : endOptions[0]?.value || "";
    if (nextEnd !== endTime) setEndTime(nextEnd);
  }, [endOptions, endTime]);

  useEffect(() => {
    setCheckedSlot(null);
    setSlotMessage("");
    dispatch(selectSlot({ date, slot: null }));
  }, [date, dispatch, endTime, selectedSport, startTime]);

  useEffect(() => {
    console.info("[turfx booking sync]", {
      "Availability Result": availabilityResult,
      "Checkout Enabled": checkoutEnabled,
      "Selected Date": date,
      "Selected End": endTime,
      "Selected Start": startTime,
      "Selected Venue": venue?.id || venueId,
    });
  }, [availabilityResult, checkoutEnabled, date, endTime, startTime, venue?.id, venueId]);

  function confirmFlexibleSlot() {
    const pricedSlot = {
      endTime,
      pricePerHour: selectedRate,
      reason: "Available",
      sport: selectedSport,
      startTime,
      status: "available",
    };
    setCheckedSlot(pricedSlot);
    dispatch(selectSlot({ date, slot: pricedSlot }));
    return pricedSlot;
  }

  function continueToCheckout() {
    if (!checkoutEnabled) return;
    if (!checkedSlot) confirmFlexibleSlot();
    navigate("/checkout");
  }

  async function previewSelectedSlot() {
    if (!selectedSport) {
      setSlotMessage("Select a sport before checking availability.");
      return;
    }

    if (!startTime || !endTime) {
      setSlotMessage("Choose a start and end time.");
      return;
    }

    if (timeToMinutes(endTime) - timeToMinutes(startTime) < minimumBookingMinutes) {
      setSlotMessage("Minimum booking duration is 1 hour");
      return;
    }

    setIsChecking(true);
    setSlotMessage("");
    try {
      if (!availabilityResult.available) {
        setSlotMessage(availabilityStatusMessage(availabilityResult));
        return;
      }

      confirmFlexibleSlot();
      setSlotMessage("Available");
    } catch (error) {
      setSlotMessage(bookingErrorMessage(error, Boolean(venue)));
    } finally {
      setIsChecking(false);
    }
  }

  if (!venue) {
    return <main className="page-shell py-16 text-center text-ink-muted">Loading available venues...</main>;
  }

  return (
    <main className="page-shell py-10">
      <Stepper current={1} steps={["Venue", "Slot", "Checkout", "Success"]} />
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
        <section className="space-y-6">
          <Card className="overflow-hidden">
            <div className="grid gap-0 md:grid-cols-[320px_1fr]">
              <img alt={venue.name} className="h-full min-h-64 w-full object-cover" onError={handleImageError} src={venue.image} />
              <CardContent>
                <Badge variant="success">Available Now</Badge>
                <h1 className="mt-3 text-4xl font-black">{venue.name}</h1>
                <p className="mt-2 flex items-center gap-2 text-ink-muted">
                  <MapPin size={16} />
                  {venue.location}
                </p>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {venue.amenities.map((amenity) => (
                    <div className="rounded-xl bg-surface-low p-3 text-sm font-bold" key={amenity}>
                      {amenity}
                    </div>
                  ))}
                </div>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <label>
                    <span className="text-sm font-bold">Select Sport</span>
                    <select
                      className="focus-ring mt-2 h-11 w-full rounded-lg border border-surface-outline bg-white px-3 text-sm text-ink"
                      onChange={(event) => {
                        setSelectedSport(event.target.value);
                        dispatch(selectSlot({ date, slot: null }));
                      }}
                      value={selectedSport}
                    >
                      {configuredSports.map((sport) => (
                        <option key={sport} value={sport}>{sport}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span className="text-sm font-bold">Hourly Rate</span>
                    <Input className="mt-2" readOnly value={selectedSport ? `${currency(selectedRate)} / hour` : "Select sport"} />
                  </label>
                </div>
              </CardContent>
            </div>
          </Card>
          <Card>
            <CardContent>
              <h2 className="text-2xl font-black">Select date</h2>
              <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                {dates.map((option) => (
                  <button
                    className={`rounded-xl border p-4 text-left font-black ${date === option ? "border-primary bg-primary text-white" : "border-surface-border bg-white"}`}
                    key={option}
                    onClick={() => {
                      setDate(option);
                      dispatch(selectSlot({ date: option, slot: null }));
                    }}
                  >
                    <span className="block text-xs uppercase tracking-wider opacity-75">{option.slice(0, 4)}</span>
                    {new Date(`${option}T00:00:00Z`).toLocaleDateString("en-US", { day: "numeric", month: "short", timeZone: "UTC" })}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <h2 className="text-2xl font-black">Booking Configuration</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  ["Sport", selectedSport || "Select sport"],
                  ["Date", formatDateLabel(date)],
                  ["Start Time", startTime ? formatTimeLabel(startTime) : "Select start time"],
                  ["End Time", endTime ? formatTimeLabel(endTime) : "Select end time"],
                  ["Duration", previewSlot ? durationLabel(slotDurationHours(previewSlot)) : "Select duration"],
                  ["Availability Status", slotMessage || "Check availability"],
                ].map(([label, value]) => (
                  <div className="rounded-xl bg-surface-low p-3" key={label}>
                    <p className="text-xs font-bold uppercase tracking-wide text-ink-muted">{label}</p>
                    <p className="mt-1 font-black text-ink">{value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 border-t border-surface-border pt-5">
                <h3 className="text-lg font-black">Flexible time</h3>
                <div className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                  <label>
                    <span className="text-sm font-bold">Start Time</span>
                    <select
                      className="focus-ring mt-2 h-11 w-full rounded-lg border border-surface-outline bg-white px-3 text-sm text-ink"
                      onChange={(event) => {
                        setStartTime(event.target.value);
                        dispatch(selectSlot({ date, slot: null }));
                      }}
                      value={startTime}
                    >
                      {startOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span className="text-sm font-bold">End Time</span>
                    <select
                      className="focus-ring mt-2 h-11 w-full rounded-lg border border-surface-outline bg-white px-3 text-sm text-ink"
                      disabled={!startTime}
                      onChange={(event) => {
                        setEndTime(event.target.value);
                        dispatch(selectSlot({ date, slot: null }));
                      }}
                      value={endTime}
                    >
                      {endOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                  <Button className="self-end" disabled={isChecking || !startTime || !endTime} onClick={previewSelectedSlot} variant="outline">
                    {isChecking ? "Checking..." : "Check Availability"}
                  </Button>
                </div>
                {slotMessage && <p className="mt-3 text-sm font-bold text-ink-muted">{slotMessage}</p>}
              </div>
            </CardContent>
          </Card>
        </section>
        <aside className="space-y-5 lg:sticky lg:top-24 lg:h-max">
          <BookingSummary previewDate={date} previewSlot={previewSlot} previewSport={selectedSport} />
          <Button className="w-full" disabled={!checkoutEnabled} onClick={continueToCheckout} size="lg">
            Continue to Checkout
          </Button>
        </aside>
      </div>
    </main>
  );
}

export function CheckoutPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState("");
  const booking = useSelector((state) => state.booking);
  const {
    formState: { errors },
    handleSubmit,
    register,
  } = useForm({
    resolver: zodResolver(checkoutSchema),
    defaultValues: { name: user?.name || "", email: user?.email || "" },
  });

  async function onSubmit() {
    if (!booking.selectedVenue || !booking.selectedDate || !booking.selectedSlot) {
      setMessage("Select a venue, date, and slot before checkout.");
      return;
    }

    setIsProcessing(true);
    setMessage("");
    try {
      let bookingId = booking.bookingId;
      if (!bookingId) {
        const reservation = responseData(await bookingsApi.reserve({
          bookingDate: booking.selectedDate,
          slotEndTime: booking.selectedSlot.endTime,
          slotStartTime: booking.selectedSlot.startTime,
          sport: booking.selectedSlot.sport || booking.selectedSport,
          turfId: booking.selectedVenue,
        })).booking;
        bookingId = reservation._id || reservation.id;
        dispatch(setBookingId(bookingId));
      }

      const checkout = responseData(await bookingsApi.checkout({ bookingId, paymentMethod: "Card" }));
      if (checkout.payment?.paymentStatus && checkout.payment.paymentStatus !== "paid") {
        throw new Error("The payment hold was not confirmed.");
      }
      navigate(`/success?booking=${bookingId}`, { replace: true });
    } catch (error) {
      setMessage(bookingErrorMessage(error, Boolean(booking.selectedVenue)));
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <main className="page-shell py-10">
      <Stepper current={2} steps={["Venue", "Slot", "Checkout", "Success"]} />
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardContent>
            <div className="mb-6 flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary-soft text-primary">
                <LockKeyhole />
              </div>
              <div>
                <h1 className="text-3xl font-black">Secure your slot</h1>
                <p className="text-sm text-ink-muted">Payment hold with JWT-ready checkout integration.</p>
              </div>
            </div>
            <form className="grid gap-5" onSubmit={handleSubmit(onSubmit)}>
              <div className="grid gap-5 md:grid-cols-2">
                <label>
                  <span className="text-sm font-bold">Name</span>
                  <Input className="mt-2" {...register("name")} />
                  {errors.name && <span className="text-xs text-danger">Name is required</span>}
                </label>
                <label>
                  <span className="text-sm font-bold">Email</span>
                  <Input className="mt-2" {...register("email")} />
                  {errors.email && <span className="text-xs text-danger">Valid email is required</span>}
                </label>
              </div>
              <label>
                <span className="text-sm font-bold">Card number</span>
                <Input className="mt-2" placeholder="4242 4242 4242 4242" {...register("card")} />
                {errors.card && <span className="mt-1 block text-xs font-bold text-danger">{errors.card.message}</span>}
              </label>
              <div className="grid gap-5 md:grid-cols-2">
                <label>
                  <span className="text-sm font-bold">Expiry</span>
                  <Input className="mt-2" placeholder="12/29" {...register("expiry")} />
                  {errors.expiry && <span className="mt-1 block text-xs font-bold text-danger">{errors.expiry.message}</span>}
                </label>
                <label>
                  <span className="text-sm font-bold">CVC</span>
                  <Input className="mt-2" placeholder="123" {...register("cvc")} />
                  {errors.cvc && <span className="mt-1 block text-xs font-bold text-danger">{errors.cvc.message}</span>}
                </label>
              </div>
              <div className="rounded-xl bg-surface-low p-4 text-sm text-ink-muted">
                <ShieldCheck className="mb-2 text-accent" />
                No final payment is captured until venue confirmation. Receipts and invoices sync to the wallet.
              </div>
              <Button disabled={isProcessing} size="lg" type="submit">
                {isProcessing ? "Processing Hold..." : "Confirm Hold"}
              </Button>
              {message && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-danger">{message}</p>}
            </form>
          </CardContent>
        </Card>
        <BookingSummary totalLabel="Due today" />
      </div>
    </main>
  );
}

function SuccessScreen({ booking = true }) {
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get("booking");
  const { data: bookingData } = useBooking(bookingId);

  useEffect(() => {
    confetti({ particleCount: 120, spread: 70, origin: { y: 0.64 } });
  }, []);

  return (
    <main className="page-shell flex min-h-[72vh] items-center justify-center py-10">
      <Card className="max-w-2xl overflow-hidden text-center">
        <div className="relative h-64">
          <img alt="Success turf" className="h-full w-full object-cover object-bottom" onError={handleImageError} src={bookingData?.image || assetImages.stadium} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/75" />
          <div className="absolute left-6 right-6 top-6 text-left text-white">
            <p className="text-xs font-bold uppercase tracking-wider text-white/65">{booking ? "Booking confirmed" : "Payment hold"}</p>
            <h2 className="mt-1 truncate text-2xl font-black">{bookingData?.venue || "TURFX Venue"}</h2>
            <p className="mt-1 truncate text-sm font-bold text-white/75">{bookingData ? `${bookingData.sport || "Turf"} - ${bookingData.location || "TURFX venue"}` : "Ready for check-in"}</p>
          </div>
          <div className="absolute inset-0 grid place-items-center">
            <div className="grid h-24 w-24 place-items-center rounded-full bg-accent text-white shadow-lift">
              <Check size={44} />
            </div>
          </div>
        </div>
        <CardContent className="p-8">
          <Badge variant="success">{booking ? "Booking Success" : "Payment Success"}</Badge>
          <h1 className="mt-4 text-4xl font-black">{booking ? "Your turf is secured." : "Payment hold confirmed."}</h1>
          <p className="mt-3 text-ink-muted">
            {bookingData
              ? `${bookingData.venue} is secured for ${bookingData.date} at ${bookingData.time}.`
              : "Your booking is secured and available in My Bookings."}
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Button as={Link} to={bookingId ? `/bookings/${bookingId}` : "/bookings"}>
              View Booking
            </Button>
            <Button as={Link} to="/explore" variant="outline">
              Explore More
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

export function PaymentSuccessPage() {
  return <SuccessScreen booking={false} />;
}

export function BookingSuccessPage() {
  return <SuccessScreen />;
}

export function AddTurfStructurePreview() {
  return (
    <div className="grid gap-3">
      {addTurfSteps.map((step) => (
        <div className="flex items-center gap-3 rounded-xl border border-surface-border bg-white p-3" key={step}>
          <Ticket className="text-primary" size={18} />
          <span className="text-sm font-bold">{step}</span>
        </div>
      ))}
    </div>
  );
}
