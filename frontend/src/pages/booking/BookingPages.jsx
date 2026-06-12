import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import confetti from "canvas-confetti";
import { useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import { z } from "zod";
import { CalendarDays, Check, LockKeyhole, MapPin, ShieldCheck, Ticket } from "lucide-react";
import { selectSlot } from "../../store/store.js";
import { useAuth } from "../../store/authContext.js";
import { Badge } from "../../components/ui/badge.jsx";
import { Button } from "../../components/ui/button.jsx";
import { Card, CardContent } from "../../components/ui/card.jsx";
import { Input } from "../../components/ui/input.jsx";
import { Stepper } from "../../components/shared/Stepper.jsx";
import { addTurfSteps, assetImages, turfs } from "../../data/turfxData.js";
import { currency } from "../../utils/formatters.js";

const checkoutSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  card: z.string().min(12),
  expiry: z.string().min(4),
  cvc: z.string().min(3),
});

function BookingSummary({ totalLabel = "Payment hold" }) {
  const booking = useSelector((state) => state.booking);
  const total = booking.cart.price + booking.cart.serviceFee - booking.cart.discount;

  return (
    <Card className="h-max">
      <CardContent>
        <p className="muted-label text-primary">Booking Summary</p>
        <h2 className="mt-2 text-2xl font-black">{booking.cart.venue}</h2>
        <div className="mt-5 space-y-3 text-sm text-ink-muted">
          <p className="flex items-center gap-2">
            <CalendarDays size={16} />
            {booking.selectedDate} - {booking.selectedSlot}
          </p>
          <p className="flex items-center gap-2">
            <MapPin size={16} />
            Canary Wharf, London
          </p>
        </div>
        <div className="mt-6 space-y-3 border-t border-surface-border pt-5 text-sm">
          <div className="flex justify-between">
            <span>Slot price</span>
            <strong>{currency(booking.cart.price)}</strong>
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
  const [selected, setSelected] = useState("19:00");
  const venue = turfs[0];
  const dates = ["Jun 6", "Jun 7", "Jun 8", "Jun 9"];
  const slots = useMemo(() => ["16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00", "23:00"], []);

  function choose(slot) {
    setSelected(slot);
    dispatch(selectSlot({ date: "2026-06-06", slot }));
  }

  return (
    <main className="page-shell py-10">
      <Stepper current={1} steps={["Venue", "Slot", "Checkout", "Success"]} />
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
        <section className="space-y-6">
          <Card className="overflow-hidden">
            <div className="grid gap-0 md:grid-cols-[320px_1fr]">
              <img alt={venue.name} className="h-full min-h-64 w-full object-cover" src={venue.image} />
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
                {dates.map((date, index) => (
                  <button className={`rounded-xl border p-4 text-left font-black ${index === 0 ? "border-primary bg-primary text-white" : "border-surface-border bg-white"}`} key={date}>
                    <span className="block text-xs uppercase tracking-wider opacity-75">2026</span>
                    {date}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <h2 className="text-2xl font-black">Available slots</h2>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {slots.map((slot) => (
                  <button
                    className={`rounded-xl border px-4 py-4 text-sm font-black transition-all ${
                      selected === slot ? "border-primary bg-primary text-white shadow-lift" : "border-surface-border bg-white hover:border-primary"
                    }`}
                    key={slot}
                    onClick={() => choose(slot)}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
        <aside className="space-y-5 lg:sticky lg:top-24 lg:h-max">
          <BookingSummary />
          <Button as={Link} className="w-full" size="lg" to="/checkout">
            Continue to Checkout
          </Button>
        </aside>
      </div>
    </main>
  );
}

export function CheckoutPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const {
    formState: { errors },
    handleSubmit,
    register,
  } = useForm({
    resolver: zodResolver(checkoutSchema),
    defaultValues: { name: user?.name || "", email: user?.email || "" },
  });

  function onSubmit() {
    setIsProcessing(true);
    window.setTimeout(() => {
      navigate("/success");
    }, 650);
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
              </label>
              <div className="grid gap-5 md:grid-cols-2">
                <label>
                  <span className="text-sm font-bold">Expiry</span>
                  <Input className="mt-2" placeholder="12/29" {...register("expiry")} />
                </label>
                <label>
                  <span className="text-sm font-bold">CVC</span>
                  <Input className="mt-2" placeholder="123" {...register("cvc")} />
                </label>
              </div>
              <div className="rounded-xl bg-surface-low p-4 text-sm text-ink-muted">
                <ShieldCheck className="mb-2 text-accent" />
                No final payment is captured until venue confirmation. Receipts and invoices sync to the wallet.
              </div>
              <Button disabled={isProcessing} size="lg" type="submit">
                {isProcessing ? "Processing Hold..." : "Confirm Hold"}
              </Button>
            </form>
          </CardContent>
        </Card>
        <BookingSummary totalLabel="Due today" />
      </div>
    </main>
  );
}

function SuccessScreen({ booking = true }) {
  useEffect(() => {
    confetti({ particleCount: 120, spread: 70, origin: { y: 0.64 } });
  }, []);

  return (
    <main className="page-shell flex min-h-[72vh] items-center justify-center py-10">
      <Card className="max-w-2xl overflow-hidden text-center">
        <div className="relative h-64">
          <img alt="Success turf" className="h-full w-full object-cover" src={assetImages.stadium} />
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
            The Stadium Turf is locked for Jun 6, 2026 at 19:00. Your check-in QR is ready in My Bookings.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Button as={Link} to="/bookings/BK-2050">
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
