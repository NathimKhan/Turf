import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import confetti from "canvas-confetti";
import { useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import { z } from "zod";
import { CalendarDays, Check, LockKeyhole, MapPin, ShieldCheck, Ticket } from "lucide-react";
import { selectSlot, selectVenue, setBookingId } from "../../store/store.js";
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
import { turfsApi } from "../../services/api/turfs.js";
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

function slotDurationHours(slot) {
  if (!slot?.startTime || !slot?.endTime) return 1;
  return Math.max((timeToMinutes(slot.endTime) - timeToMinutes(slot.startTime)) / 60, 0);
}

function slotStatusClass(slot, selected) {
  if (selected?.startTime === slot.startTime && selected?.endTime === slot.endTime) {
    return "border-primary bg-primary text-white shadow-lift";
  }
  if (slot.status === "booked") return "border-surface-border bg-surface-low text-ink-muted";
  if (slot.status === "blocked") return "border-danger bg-danger-soft text-danger";
  return "border-surface-border bg-white hover:border-primary";
}

function BookingSummary({ totalLabel = "Payment hold" }) {
  const booking = useSelector((state) => state.booking);
  const slotPrice = Number((booking.cart.price * slotDurationHours(booking.selectedSlot)).toFixed(2));
  const total = slotPrice + booking.cart.serviceFee - booking.cart.discount;
  const timeLabel = booking.selectedSlot?.endTime
    ? `${booking.selectedSlot.startTime} - ${booking.selectedSlot.endTime}`
    : booking.selectedSlot?.startTime || "Select a slot";

  return (
    <Card className="h-max">
      <CardContent>
        <p className="muted-label text-primary">Booking Summary</p>
        <h2 className="mt-2 text-2xl font-black">{booking.cart.venue}</h2>
        <div className="mt-5 space-y-3 text-sm text-ink-muted">
          <p className="flex items-center gap-2">
            <CalendarDays size={16} />
            {booking.selectedDate} - {timeLabel}
          </p>
          <p className="flex items-center gap-2">
            <MapPin size={16} />
            {booking.cart.location || "Select a venue"}
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
  const [selected, setSelected] = useState(null);
  const [customStart, setCustomStart] = useState("18:00");
  const [customDuration, setCustomDuration] = useState(60);
  const [slotMessage, setSlotMessage] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const { data: venue } = useTurf(venueId);
  const { data: availability = { rules: {}, slots: [], timeline: [] } } = useTurfAvailability(venueId, date);
  const slotMinutes = Number(availability.rules?.slotMinutes || availability.slotMinutes || 60);
  const customEndMinutes = timeToMinutes(customStart) + Number(customDuration || slotMinutes);
  const customEnd = customEndMinutes < 24 * 60 ? formatTime(customEndMinutes) : "";
  const visibleSlots = useMemo(() => {
    const timeline = availability.timeline?.length ? availability.timeline : availability.slots || [];
    return timeline.map((slot) => ({
      reason: slot.reason || (slot.status === "available" ? "Available" : slot.status),
      status: slot.status || "available",
      ...slot,
    }));
  }, [availability.slots, availability.timeline]);
  const dates = useMemo(
    () => Array.from({ length: 4 }, (_, index) => new Date(Date.now() + (index + 1) * 86400000).toISOString().slice(0, 10)),
    [],
  );

  useEffect(() => {
    setCustomDuration(slotMinutes);
  }, [slotMinutes]);

  useEffect(() => {
    if (venue) dispatch(selectVenue(venue));
  }, [dispatch, venue]);

  function choose(slot) {
    if (slot.status && slot.status !== "available") return;
    setSlotMessage("");
    setSelected(slot);
    dispatch(selectSlot({ date, slot }));
  }

  async function previewCustomSlot() {
    if (!customStart || !customEnd) {
      setSlotMessage("Choose a start time that ends before midnight.");
      return;
    }

    setIsChecking(true);
    setSlotMessage("");
    try {
      const data = responseData(await turfsApi.availability(venueId, date, {
        endTime: customEnd,
        startTime: customStart,
      }));

      if (!data.request?.available) {
        setSlotMessage(data.request?.message || "This slot is unavailable.");
        return;
      }

      choose({
        custom: true,
        endTime: customEnd,
        reason: "Available",
        startTime: customStart,
        status: "available",
      });
      setSlotMessage("Custom time is available.");
    } catch (error) {
      setSlotMessage(error.response?.data?.message || error.message);
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
                      setSelected(null);
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
              <h2 className="text-2xl font-black">Live availability</h2>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {visibleSlots.map((slot) => (
                  <button
                    className={`rounded-xl border px-4 py-4 text-left text-sm font-black transition-all ${slotStatusClass(slot, selected)}`}
                    disabled={slot.status !== "available"}
                    key={`${slot.startTime}-${slot.endTime}`}
                    onClick={() => choose(slot)}
                  >
                    {slot.startTime} - {slot.endTime}
                    <span className="mt-1 block text-xs font-medium opacity-70">{slot.reason || "Available"}</span>
                  </button>
                ))}
              </div>
              {!visibleSlots.length && (
                <p className="mt-4 text-sm text-ink-muted">
                  {availability.isBlackoutDate ? "This date is blocked by the venue." : "No available slots for this date."}
                </p>
              )}
              <div className="mt-6 border-t border-surface-border pt-5">
                <h3 className="text-lg font-black">Custom time</h3>
                <div className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                  <label>
                    <span className="text-sm font-bold">Start time</span>
                    <Input className="mt-2" onChange={(event) => setCustomStart(event.target.value)} step="900" type="time" value={customStart} />
                  </label>
                  <label>
                    <span className="text-sm font-bold">Duration</span>
                    <select
                      className="focus-ring mt-2 h-11 w-full rounded-lg border border-surface-outline bg-white px-3 text-sm text-ink"
                      onChange={(event) => setCustomDuration(Number(event.target.value))}
                      value={customDuration}
                    >
                      <option value={slotMinutes}>{slotMinutes} minutes</option>
                    </select>
                  </label>
                  <Button className="self-end" disabled={isChecking} onClick={previewCustomSlot} variant="outline">
                    {isChecking ? "Checking..." : `Preview ${customEnd || "--:--"}`}
                  </Button>
                </div>
                {slotMessage && <p className="mt-3 text-sm font-bold text-ink-muted">{slotMessage}</p>}
              </div>
            </CardContent>
          </Card>
        </section>
        <aside className="space-y-5 lg:sticky lg:top-24 lg:h-max">
          <BookingSummary />
          <Button className="w-full" disabled={!selected} onClick={() => navigate("/checkout")} size="lg">
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
        const availability = responseData(await turfsApi.availability(booking.selectedVenue, booking.selectedDate, {
          endTime: booking.selectedSlot.endTime,
          startTime: booking.selectedSlot.startTime,
        }));
        if (!availability.request?.available) {
          setMessage(availability.request?.message || "This slot is unavailable.");
          return;
        }

        const reservation = responseData(await bookingsApi.reserve({
          bookingDate: booking.selectedDate,
          slotEndTime: booking.selectedSlot.endTime,
          slotStartTime: booking.selectedSlot.startTime,
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
      setMessage(error.response?.data?.message || error.message);
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
          <img alt="Success turf" className="h-full w-full object-cover" onError={handleImageError} src={bookingData?.image || assetImages.stadium} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
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
