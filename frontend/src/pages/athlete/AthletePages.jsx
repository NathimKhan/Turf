import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  Bell,
  CalendarDays,
  Check,
  CreditCard,
  Download,
  MapPin,
  Trash2,
  WalletCards,
} from "lucide-react";
import { Badge } from "../../components/ui/badge.jsx";
import { Button } from "../../components/ui/button.jsx";
import { Card, CardContent } from "../../components/ui/card.jsx";
import { Input } from "../../components/ui/input.jsx";
import { Textarea } from "../../components/ui/input.jsx";
import { Modal } from "../../components/ui/modal.jsx";
import { ChartPanel } from "../../components/shared/ChartPanel.jsx";
import { DataTable } from "../../components/shared/DataTable.jsx";
import { StatsCard } from "../../components/shared/StatsCard.jsx";
import { TurfCard } from "../../components/shared/TurfCard.jsx";
import { Icon } from "../../components/shared/icons.jsx";
import { assetImages } from "../../data/turfxData.js";
import {
  useBooking,
  useBookings,
  useCancelBooking,
  useNotifications,
} from "../../hooks/useBookings.js";
import {
  useDeleteNotification,
  useFavorites,
  useMarkNotificationRead,
  useMyCoachRequests,
  usePayments,
} from "../../hooks/usePlatform.js";
import { useTurfs } from "../../hooks/useTurfs.js";
import { useAuth } from "../../store/authContext.js";
import { roleLabels } from "../../constants/auth.js";
import { authService } from "../../services/authService.js";
import { authApi } from "../../services/api/auth.js";
import {
  createBookingQr,
  downloadBookingInvoice,
  downloadBookingPass,
  downloadPaymentReceipt,
  isBookingQrExpired,
} from "../../utils/bookingPass.js";
import { currency, number } from "../../utils/formatters.js";
import { handleImageError } from "../../utils/media.js";
import { notify } from "../../utils/notify.js";

function bookingSeries(bookings) {
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    return {
      date: date.toISOString().slice(0, 10),
      name: date.toLocaleDateString("en-US", { weekday: "short" }),
    };
  });

  return days.map((day) => ({
    name: day.name,
    bookings: bookings.filter((booking) => String(booking.dateValue || "").slice(0, 10) === day.date).length,
  }));
}

function BookingCard({ booking }) {
  return (
    <Card interactive className="overflow-hidden">
      <div className="relative h-48">
        <img alt={booking.venue} className="h-full w-full object-cover" onError={handleImageError} src={booking.image} />
        <Badge className="absolute left-4 top-4" variant="white">
          <CalendarDays size={13} />
          {booking.date}, {booking.time}
        </Badge>
      </div>
      <CardContent>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-2xl font-black">{booking.venue}</h3>
            <p className="mt-2 flex items-center gap-2 text-sm text-ink-muted">
              <MapPin size={16} />
              {booking.location}
            </p>
          </div>
          <Badge variant="success">{booking.format}</Badge>
        </div>
        <div className="mt-6 flex items-center justify-between border-t border-surface-border pt-4">
          <div className="flex -space-x-2">
            {booking.team.map((initial) => (
              <span className="grid h-8 w-8 place-items-center rounded-full border-2 border-white bg-primary-soft text-xs font-black text-primary" key={initial}>
                {initial}
              </span>
            ))}
          </div>
          <Button as={Link} size="sm" to={`/bookings/${booking.id}`} variant="outline">
            Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  const { data: bookings = [] } = useBookings();
  const { data: turfResult = { turfs: [] } } = useTurfs({ limit: 6 });
  const upcomingBookings = bookings.filter((booking) => ["pending", "confirmed", "upcoming", "ongoing"].includes(booking.statusValue));
  const [recommendationStart, setRecommendationStart] = useState(0);
  const recommendations = useMemo(() => {
    const turfs = turfResult.turfs;
    if (turfs.length <= 3) return turfs;
    return Array.from({ length: 3 }, (_, index) => turfs[(recommendationStart + index) % turfs.length]);
  }, [recommendationStart, turfResult.turfs]);
  return (
    <div>
      <div className="mb-8 grid gap-5 lg:grid-cols-[1fr_440px]">
        <div>
          <h1 className="text-4xl font-black tracking-normal md:text-5xl">Welcome back, {user?.name?.split(" ")[0] || "Alex"}</h1>
          <p className="mt-2 text-lg text-ink-muted">Manage your bookings, saved venues, notifications, and player profile.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <StatsCard icon="WalletCards" label="Wallet Balance" value={currency(user?.walletBalance || 0)} />
          <StatsCard icon="CalendarDays" label="Bookings" tone="secondary" value={number(bookings.length)} />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_310px]">
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-black">Upcoming Bookings</h2>
            <Button as={Link} to="/bookings" variant="ghost">
              View All
            </Button>
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            {upcomingBookings.slice(0, 2).map((booking) => (
              <BookingCard booking={booking} key={booking.id} />
            ))}
            {!upcomingBookings.length && (
              <Card>
                <CardContent className="text-center">
                  <CalendarDays className="mx-auto text-primary" />
                  <h3 className="mt-3 text-xl font-black">No upcoming bookings</h3>
                  <p className="mt-2 text-sm text-ink-muted">Choose a live venue slot to start your next game.</p>
                  <Button as={Link} className="mt-5" to="/explore">Explore Venues</Button>
                </CardContent>
              </Card>
            )}
          </div>
        </section>
        <Card className="bg-dark text-white">
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary">
                <Icon name="Zap" />
              </div>
              <div>
                <p className="text-sm text-white/70">Current Streak</p>
                <p className="text-3xl font-black">{bookings.filter((booking) => booking.statusValue === "completed").length} Games</p>
              </div>
            </div>
            <div className="mt-8 flex items-center justify-between text-sm font-bold">
              <span>Booking activity</span>
              <span>{bookings.length} total</span>
            </div>
            <div className="mt-3 h-2 rounded-full bg-white/10">
              <div className="h-full rounded-full bg-secondary" style={{ width: `${Math.min(bookings.length * 10, 100)}%` }} />
            </div>
            <div className="mt-8 rounded-2xl bg-white/10 p-4">
              <p className="muted-label text-secondary-soft">Achievement unlocked</p>
              <p className="mt-2 text-lg font-black">Keep playing</p>
              <p className="mt-1 text-sm text-white/70">Completed bookings build your TURFX history.</p>
            </div>
            <Button
              as={Link}
              className="mt-10 w-full border border-white/15 bg-white/10 text-white hover:bg-white/15 hover:text-white"
              to="/profile"
              variant="ghost"
            >
              View All Badges
            </Button>
          </CardContent>
        </Card>
      </div>

      <section className="mt-12">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-black">Recommended for You</h2>
          <div className="flex gap-2">
            <Button
              aria-label="Previous recommendations"
              onClick={() => setRecommendationStart((current) => Math.max(0, current - 1))}
              size="icon"
              variant="outline"
            >
              <Icon name="ArrowLeft" />
            </Button>
            <Button
              aria-label="Next recommendations"
              onClick={() => setRecommendationStart((current) => {
                const length = turfResult.turfs.length;
                return length ? (current + 1) % length : 0;
              })}
              size="icon"
              variant="outline"
            >
              <Icon name="ArrowRight" />
            </Button>
          </div>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {recommendations.map((turf) => (
            <TurfCard key={turf.id} turf={turf} />
          ))}
        </div>
      </section>
    </div>
  );
}

export function MyBookingsPage() {
  const { data: bookings = [] } = useBookings();
  const [activeTab, setActiveTab] = useState("Upcoming");
  const filteredBookings = bookings.filter((booking) => {
    const groups = {
      Upcoming: ["pending", "confirmed", "upcoming"],
      Ongoing: ["ongoing", "checked_in"],
      Completed: ["completed"],
      Cancelled: ["cancelled"],
    };
    return groups[activeTab].includes(booking.statusValue);
  });
  return (
    <div>
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <p className="muted-label text-primary">User Workspace</p>
          <h1 className="mt-2 text-4xl font-black">My Bookings</h1>
        </div>
        <Button as={Link} to="/explore">
          New Booking
        </Button>
      </div>
      <div className="mb-5 flex gap-2 overflow-x-auto pb-2 no-scrollbar">
        {["Upcoming", "Ongoing", "Completed", "Cancelled"].map((tab) => (
          <Button key={tab} onClick={() => setActiveTab(tab)} variant={activeTab === tab ? "primary" : "outline"}>
            {tab}
          </Button>
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        {filteredBookings.map((booking) => (
          <BookingCard booking={booking} key={booking.id} />
        ))}
      </div>
      {!filteredBookings.length && (
        <Card>
          <CardContent className="text-center">
            <CalendarDays className="mx-auto text-primary" />
            <h2 className="mt-3 text-xl font-black">No {activeTab.toLowerCase()} bookings</h2>
            <p className="mt-2 text-sm text-ink-muted">Your booking activity will appear here as its status changes.</p>
            <Button as={Link} className="mt-5" to="/explore">Explore Venues</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export function MyCoachingPage() {
  const { data: coachRequests = [] } = useMyCoachRequests();
  const paidRequests = coachRequests.filter((request) => request.paymentStatus === "paid");
  const pending = paidRequests.filter((request) => request.approvalStatus === "pending").length;
  const approved = paidRequests.filter((request) => request.approvalStatus === "approved").length;
  const totalMonthlyFee = paidRequests.reduce((sum, request) => sum + Number(request.monthlyFee || 0), 0);

  return (
    <div>
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <p className="muted-label text-primary">Performance Academy</p>
          <h1 className="mt-2 text-4xl font-black">My Coaching</h1>
          <p className="mt-2 text-ink-muted">Track monthly coach payments, timing, and turf owner approval status.</p>
        </div>
        <Button as={Link} to="/coaching">
          Find a Coach
        </Button>
      </div>
      <div className="mb-6 grid gap-5 md:grid-cols-3">
        <StatsCard icon="Clock" label="Pending Approval" tone="warning" value={String(pending)} />
        <StatsCard icon="BadgeCheck" label="Successful Plans" tone="secondary" value={String(approved)} />
        <StatsCard icon="WalletCards" label="Monthly Fees Paid" value={currency(totalMonthlyFee)} />
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        {coachRequests.map((request) => (
          <Card key={request.id}>
            <CardContent>
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div>
                  <Badge variant={request.approvalStatus === "approved" ? "success" : request.approvalStatus === "rejected" ? "danger" : "warning"}>
                    {request.status}
                  </Badge>
                  <h2 className="mt-4 text-2xl font-black">{request.coachName}</h2>
                  <p className="mt-2 text-sm text-ink-muted">{request.venue} - {request.sport}</p>
                </div>
                <div className="rounded-xl bg-primary-soft px-4 py-3 text-right">
                  <p className="text-xs font-bold uppercase text-primary">Monthly Fee</p>
                  <p className="text-xl font-black text-primary">{currency(request.monthlyFee)}</p>
                </div>
              </div>
              <div className="mt-6 grid gap-3 text-sm md:grid-cols-2">
                <p className="rounded-xl bg-surface-low p-3"><span className="block text-ink-muted">Timing</span><strong>{request.timing}</strong></p>
                <p className="rounded-xl bg-surface-low p-3"><span className="block text-ink-muted">Start Date</span><strong>{request.date}</strong></p>
                <p className="rounded-xl bg-surface-low p-3"><span className="block text-ink-muted">Sessions</span><strong>{request.sessionsPerMonth} per month</strong></p>
                <p className="rounded-xl bg-surface-low p-3"><span className="block text-ink-muted">Payment</span><strong>{request.paymentStatus}</strong></p>
                <p className="rounded-xl bg-surface-low p-3 md:col-span-2"><span className="block text-ink-muted">Transaction</span><strong>{request.transactionId}</strong></p>
              </div>
              {request.approvalStatus === "pending" && (
                <p className="mt-5 rounded-xl border border-warning/30 bg-warning-soft p-3 text-sm font-bold text-amber-800">
                  Payment is successful. Your coach timing is waiting for turf owner approval.
                </p>
              )}
              {request.approvalStatus === "approved" && (
                <p className="mt-5 rounded-xl border border-accent/30 bg-accent-soft p-3 text-sm font-bold text-accent-deep">
                  Successful. Attend your coaching session at the selected turf timing.
                </p>
              )}
              {request.approvalStatus === "rejected" && (
                <p className="mt-5 rounded-xl border border-danger/30 bg-danger-soft p-3 text-sm font-bold text-danger">
                  Rejected by turf owner. Choose another coach timing if one is available.
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      {!coachRequests.length && (
        <Card>
          <CardContent className="text-center">
            <Icon className="mx-auto text-primary" name="Dumbbell" size={34} />
            <h2 className="mt-3 text-xl font-black">No coaching plans yet</h2>
            <p className="mt-2 text-sm text-ink-muted">Choose a coach from approved TURFX venues and pay the monthly fee to start.</p>
            <Button as={Link} className="mt-5" to="/coaching">Find a Coach</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export function FavoritesPage() {
  const { data: turfs = [] } = useFavorites();
  return (
    <div>
      <div className="mb-6">
        <p className="muted-label text-primary">Saved Venues</p>
        <h1 className="mt-2 text-4xl font-black">Favorites</h1>
        <p className="mt-2 text-ink-muted">Quick access to the venues you want to book again.</p>
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        {turfs.map((turf) => (
          <TurfCard key={turf.id} turf={turf} />
        ))}
      </div>
      {!turfs.length && (
        <Card>
          <CardContent className="text-center">
            <h2 className="text-xl font-black">No saved venues yet</h2>
            <p className="mt-2 text-sm text-ink-muted">Use the heart control on a venue to keep it close.</p>
            <Button as={Link} className="mt-5" to="/explore">Explore Venues</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export function BookingDetailsPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { data: booking, isError, isLoading } = useBooking(id);
  const cancelBooking = useCancelBooking();
  const { data: payments = [] } = usePayments();
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [qrFailed, setQrFailed] = useState(false);
  const payment = payments.find((item) => item.bookingIdValue === booking?.id);
  const effectivePayment = booking?.payment || payment || null;
  const effectivePaymentStatus = effectivePayment?.status || booking?.paymentStatus || "pending";
  const isPaid = ["paid", "partially_refunded"].includes(String(effectivePaymentStatus).toLowerCase());
  const invoiceReady = isPaid && booking?.statusValue === "completed" && ["ready", "paid"].includes(String(booking?.invoiceStatus || effectivePayment?.invoiceStatus || "").toLowerCase());
  const qrExpired = booking ? isBookingQrExpired(booking) : false;
  const bookAgainHref = booking?.venueId ? `/booking/slots?venue=${booking.venueId}` : "/explore";

  useEffect(() => {
    if (!booking) return;
    if (isBookingQrExpired(booking)) {
      setQrDataUrl("");
      setQrFailed(false);
      return;
    }
    setQrFailed(false);
    createBookingQr(booking, user)
      .then(setQrDataUrl)
      .catch(() => {
        setQrDataUrl("");
        setQrFailed(true);
      });
  }, [booking, user]);

  if (isLoading) {
    return <div className="py-16 text-center text-ink-muted">Loading booking...</div>;
  }
  if (isError || !booking) {
    return (
      <Card>
        <CardContent className="text-center">
          <h1 className="text-2xl font-black">Booking not found</h1>
          <p className="mt-2 text-sm text-ink-muted">The reservation may have been removed or belongs to another account.</p>
          <Button as={Link} className="mt-5" to="/bookings">Back to My Bookings</Button>
        </CardContent>
      </Card>
    );
  }
  return (
    <div>
      <div className="mb-6">
        <Badge variant="success">{booking.status}</Badge>
        <h1 className="mt-3 text-4xl font-black">{booking.venue}</h1>
        <p className="mt-2 text-ink-muted">Booking {booking.id} - {booking.date} - {booking.time}</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Card className="overflow-hidden">
            <img alt={booking.venue} className="h-72 w-full object-cover" onError={handleImageError} src={booking.image} />
            <CardContent className="grid gap-5 md:grid-cols-3">
              {[
                ["Date", booking.date, "CalendarDays"],
                ["Time", `${booking.slotStartTime} - ${booking.slotEndTime}`, "Clock"],
                ["Location", booking.location, "MapPin"],
              ].map(([label, value, icon]) => (
                <div key={label}>
                  <Icon className="text-primary" name={icon} />
                  <p className="muted-label mt-3">{label}</p>
                  <p className="font-black">{value}</p>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <h2 className="text-2xl font-black">Check-in Timeline</h2>
              <div className="mt-5 space-y-4">
                {["Payment hold captured", "Team invite sent", "Venue entry opens", "Post-match rewards"].map((item, index) => (
                  <div className="flex gap-4" key={item}>
                    <div className="grid h-9 w-9 place-items-center rounded-full bg-accent-soft text-accent-deep">
                      <Check size={16} />
                    </div>
                    <div>
                      <p className="font-black">{item}</p>
                      <p className="text-sm text-ink-muted">{index === 2 ? "15 minutes before slot" : "Completed"}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <h2 className="text-2xl font-black">Payment Details</h2>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {[
                  [isPaid ? "Amount Paid" : "Amount Due", isPaid ? currency(effectivePayment?.amount || booking.paid || booking.totalAmount || 0) : currency(booking.paid || booking.totalAmount || 0)],
                  ["Transaction ID", effectivePayment?.paymentId || (isPaid ? "Demo transaction syncing" : "Pending payment")],
                  ["Payment Status", effectivePaymentStatus],
                  ["Invoice", invoiceReady ? "Ready" : booking.invoiceStatus || "Pending"],
                  ["Venue Contact", booking.turf?.ownerId?.phone || booking.turf?.phone || "Contact via venue desk"],
                ].map(([label, value]) => (
                  <div className="rounded-xl bg-surface-low p-3" key={label}>
                    <p className="muted-label">{label}</p>
                    <p className="mt-1 font-black">{value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                {effectivePayment && (
                  <Button
                    onClick={async () => {
                      await downloadPaymentReceipt(effectivePayment, user);
                      notify("Receipt downloaded.");
                    }}
                    variant="outline"
                  >
                    <Download size={16} />
                    Download Receipt
                  </Button>
                )}
                {invoiceReady && (
                  <Button
                    onClick={async () => {
                      await downloadBookingInvoice(booking, effectivePayment, user);
                      notify("Invoice downloaded.");
                    }}
                    variant="outline"
                  >
                    <Download size={16} />
                    Download Invoice
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
        <Card className="h-max">
          <CardContent className="text-center">
            {qrExpired ? (
              <div className="mx-auto grid h-44 w-44 place-items-center rounded-2xl border border-surface-border bg-surface-low p-4">
                <div>
                  <Badge variant="default">QR Expired</Badge>
                  <p className="mt-3 text-sm text-ink-muted">This entry pass closed when the booking ended.</p>
                </div>
              </div>
            ) : (
              <>
                <div className="mx-auto grid h-44 w-44 place-items-center rounded-2xl border border-surface-border bg-white p-3">
                  {qrDataUrl ? (
                    <img alt={`Gate QR for booking ${booking.id}`} className="h-full w-full" src={qrDataUrl} />
                  ) : (
                    <span className="text-sm text-ink-muted">{qrFailed ? "QR unavailable. Use the downloaded pass." : "Generating QR..."}</span>
                  )}
                </div>
                <h2 className="mt-5 text-2xl font-black">Gate QR</h2>
                <p className="mt-2 text-sm text-ink-muted">Scan at the venue desk to check in and unlock your locker.</p>
                <Button
                  className="mt-6 w-full"
                  onClick={async () => {
                    try {
                      await downloadBookingPass(booking, user);
                      notify("TURFX pass downloaded.");
                    } catch {
                      notify("The pass could not be generated. Please try again.");
                    }
                  }}
                  variant="outline"
                >
                  <Download size={16} />
                  Download Pass
                </Button>
              </>
            )}
            {booking.statusValue === "completed" && (
              <div className="mt-5 grid gap-3 text-left">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="success">Completed</Badge>
                  <Badge variant={isPaid ? "success" : "warning"}>{isPaid ? "Payment Paid" : "Payment Pending"}</Badge>
                  <Badge variant={invoiceReady ? "success" : "warning"}>{invoiceReady ? "Invoice Ready" : "Invoice Pending"}</Badge>
                </div>
                <Button as={Link} className="w-full" to={bookAgainHref} variant="outline">
                  Book Again
                </Button>
              </div>
            )}
            {!["cancelled", "completed", "checked_in", "ongoing"].includes(booking.statusValue) && (
              <Button
                className="mt-3 w-full"
                disabled={cancelBooking.isPending}
                onClick={() => {
                  if (!window.confirm("Cancel this booking and release the slot?")) return;
                  cancelBooking.mutate(booking.id, {
                    onError: (error) => notify(error.response?.data?.message || error.message),
                    onSuccess: () => notify("Booking cancelled and slot released."),
                  });
                }}
                variant="danger"
              >
                Cancel Booking
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function WalletPage() {
  const { refreshProfile, user } = useAuth();
  const { data: payments = [] } = usePayments();
  const [searchParams] = useSearchParams();
  const [walletAction, setWalletAction] = useState("");
  const [amount, setAmount] = useState("100");
  const [cardLast4, setCardLast4] = useState(() => localStorage.getItem("turfx-card-last4") || "");
  const [selectedPayment, setSelectedPayment] = useState(null);
  const rows = payments.map((payment) => [
    payment.paymentId,
    payment.bookingReference || "Pending booking",
    payment.venue,
    payment.ownerName,
    payment.date,
    payment.time || "-",
    currency(payment.amount),
    payment.paymentMethod,
    payment.status,
    <div className="flex flex-wrap gap-2" key={`${payment.id}-actions`}>
      <Button onClick={() => setSelectedPayment(payment)} size="sm" variant="outline">Details</Button>
      {payment.bookingIdValue && <Button as={Link} size="sm" to={`/bookings/${payment.bookingIdValue}`} variant="ghost">Booking</Button>}
      <Button
        onClick={async () => {
          await downloadPaymentReceipt(payment, user);
          notify("Receipt downloaded.");
        }}
        size="sm"
        variant="outline"
      >
        Receipt
      </Button>
    </div>,
  ]);

  useEffect(() => {
    const requestedPayment = searchParams.get("payment");
    if (!requestedPayment || selectedPayment) return;
    const match = payments.find((payment) => payment.id === requestedPayment || payment.paymentId === requestedPayment);
    if (match) setSelectedPayment(match);
  }, [payments, searchParams, selectedPayment]);

  function downloadInvoices() {
    const csv = [
      ["Payment ID", "Booking ID", "Venue", "Owner", "Date", "Time", "Amount", "Method", "Status"],
      ...payments.map((payment) => [
        payment.paymentId,
        payment.bookingReference || "",
        payment.venue,
        payment.ownerName,
        payment.date,
        payment.time,
        currency(payment.amount),
        payment.paymentMethod,
        payment.status,
      ]),
    ].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "TURFX-invoices.csv";
    anchor.click();
    URL.revokeObjectURL(url);
    notify("Invoice history downloaded.");
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="muted-label text-primary">Wallet</p>
        <h1 className="mt-2 text-4xl font-black">My Payments</h1>
      </div>
      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <Card className="overflow-hidden bg-dark text-white">
          <CardContent>
            <p className="text-white/65">Available balance</p>
            <p className="mt-3 text-5xl font-black">{currency(user?.walletBalance || 0)}</p>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                ["Top up", "Add balance"],
                ["Transfer", "Move funds"],
                ["Invoices", "Download CSV"],
              ].map(([action, helper]) => (
                <Button
                  key={action}
                  onClick={() => action === "Invoices" ? downloadInvoices() : setWalletAction(action.toLowerCase().replace(" ", ""))}
                  variant="ghost"
                  className="h-auto flex-col items-start rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-left text-white hover:bg-white/15 hover:text-white"
                >
                  <span>{action}</span>
                  <span className="text-xs font-semibold text-white/60">{helper}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <WalletCards className="text-primary" />
            <h2 className="mt-4 text-2xl font-black">Saved Payment</h2>
            <p className="mt-2 text-sm text-ink-muted">Payment methods are handled by the configured secure provider.</p>
            <Button className="mt-6 w-full" onClick={() => setWalletAction("card")} variant="outline">
              <CreditCard size={16} />
              Manage Cards
            </Button>
          </CardContent>
        </Card>
      </div>
      <DataTable
        columns={["Payment ID", "Booking ID", "Venue", "Owner", "Date", "Time", "Amount", "Method", "Status", "Actions"]}
        emptyMessage="No payments yet. Completed booking payments will appear here."
        rows={rows}
      />
      <Modal onOpenChange={(open) => !open && setWalletAction("")} open={Boolean(walletAction)} title={walletAction === "card" ? "Manage Saved Card" : walletAction === "transfer" ? "Transfer Wallet Funds" : "Top Up Wallet"}>
        {walletAction === "card" ? (
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              localStorage.setItem("turfx-card-last4", cardLast4);
              setWalletAction("");
              notify("Saved payment preference updated.");
            }}
          >
            <Input maxLength={4} onChange={(event) => setCardLast4(event.target.value.replace(/\D/g, ""))} placeholder="Card last 4 digits" required value={cardLast4} />
            <Button type="submit">Save Card Preference</Button>
          </form>
        ) : (
          <form
            className="grid gap-4"
            onSubmit={async (event) => {
              event.preventDefault();
              try {
                await authApi.updateWallet({ action: walletAction, amount: Number(amount) });
                await refreshProfile();
                setWalletAction("");
                notify(walletAction === "topup" ? "Wallet topped up." : "Wallet transfer completed.");
              } catch (error) {
                notify(error.response?.data?.message || error.message);
              }
            }}
          >
            <Input min="1" onChange={(event) => setAmount(event.target.value)} type="number" value={amount} />
            <Button type="submit">{walletAction === "topup" ? "Confirm Top Up" : "Confirm Transfer"}</Button>
          </form>
        )}
      </Modal>
      <Modal onOpenChange={(open) => !open && setSelectedPayment(null)} open={Boolean(selectedPayment)} title="Transaction Details">
        {selectedPayment && (
          <div className="grid gap-4 text-sm">
            {[
              ["Payment ID", selectedPayment.paymentId],
              ["Booking ID", selectedPayment.bookingReference],
              ["Venue", selectedPayment.venue],
              ["Turf Owner", selectedPayment.ownerName],
              ["Date", selectedPayment.date],
              ["Time", selectedPayment.time || "-"],
              ["Amount Paid", currency(selectedPayment.amount)],
              ["Payment Method", selectedPayment.paymentMethod],
              ["Payment Status", selectedPayment.status],
            ].map(([label, value]) => (
              <p className="flex justify-between gap-4" key={label}>
                <span className="text-ink-muted">{label}</span>
                <strong className="text-right text-ink">{value || "-"}</strong>
              </p>
            ))}
            <div className="mt-2 flex flex-wrap gap-2">
              {selectedPayment.bookingIdValue && <Button as={Link} to={`/bookings/${selectedPayment.bookingIdValue}`}>Open Booking</Button>}
              <Button
                onClick={async () => {
                  await downloadPaymentReceipt(selectedPayment, user);
                  notify("Receipt downloaded.");
                }}
                variant="outline"
              >
                Download Receipt
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export function NotificationsPage() {
  const navigate = useNavigate();
  const { data: notifications = [] } = useNotifications();
  const markRead = useMarkNotificationRead();
  const deleteNotification = useDeleteNotification();
  const unread = notifications.filter((item) => !item.isRead);
  return (
    <div>
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <p className="muted-label text-primary">Activity Center</p>
          <h1 className="mt-2 text-4xl font-black">Notifications</h1>
        </div>
        <Button
          disabled={!unread.length}
          onClick={() => unread.forEach((item) => markRead.mutate(item.id))}
          variant="outline"
        >
          <Bell size={16} />
          Mark All Read
        </Button>
      </div>
      <div className="grid gap-4">
        {notifications.map((notification) => (
          <Card
            interactive
            key={notification.id}
            onClick={() => {
              if (!notification.isRead) markRead.mutate(notification.id);
              if (notification.targetUrl) navigate(notification.targetUrl);
            }}
          >
            <CardContent className="flex gap-4">
              <div className={`grid h-12 w-12 place-items-center rounded-xl ${notification.status === "warning" ? "bg-warning-soft text-amber-700" : "bg-primary-soft text-primary"}`}>
                <Bell size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="font-black">{notification.title}</h2>
                  <span className="text-xs text-ink-soft">{notification.time}</span>
                </div>
                <p className="mt-1 text-sm text-ink-muted">{notification.body}</p>
              </div>
              <Button
                aria-label={`Delete ${notification.title}`}
                onClick={(event) => {
                  event.stopPropagation();
                  deleteNotification.mutate(notification.id);
                }}
                size="icon"
                variant="ghost"
              >
                <Trash2 size={16} />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
      {!notifications.length && <Card><CardContent className="text-center text-ink-muted">You are all caught up. New booking activity will appear here.</CardContent></Card>}
    </div>
  );
}

export function ProfilePage() {
  const { refreshProfile, user } = useAuth();
  const { data: bookings = [] } = useBookings();
  const { data: favorites = [] } = useFavorites();
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState("");
  const [avatarPreview, setAvatarPreview] = useState("");
  const [form, setForm] = useState({
    bio: user?.bio || "",
    name: user?.name || "",
    phone: user?.phone || "",
    profileImage: null,
  });
  useEffect(() => {
    setForm({
      bio: user?.bio || "",
      name: user?.name || "",
      phone: user?.phone || "",
      profileImage: null,
    });
  }, [user?.bio, user?.name, user?.phone]);
  const role = authService.normalizeRole(user?.role);
  const accountLabel = roleLabels[role] || "Athlete";
  const completedBookings = bookings.filter((item) => item.statusValue === "completed").length;
  const loyaltyPoints = completedBookings * 250 + bookings.length * 25;

  return (
    <div className="page-shell py-10">
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="space-y-5">
          <Card>
            <CardContent className="text-center">
              <img
                alt={user?.name || "TURFX player"}
                className="mx-auto h-24 w-24 rounded-2xl object-cover"
                onError={handleImageError}
                src={user?.profileImage || assetImages.profile}
              />
              <h2 className="mt-4 text-xl font-black">{user?.name}</h2>
              <Badge className="mt-2" variant="primary">{accountLabel}</Badge>
              <p className="mt-3 break-all text-sm text-ink-muted">{user?.email}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <p className="muted-label text-primary">Booking Summary</p>
              <div className="mt-4 space-y-3 text-sm">
                <p className="flex justify-between"><span>Upcoming</span><strong>{bookings.filter((item) => ["pending", "confirmed", "checked_in", "upcoming", "ongoing"].includes(item.statusValue)).length}</strong></p>
                <p className="flex justify-between"><span>Completed</span><strong>{completedBookings}</strong></p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <p className="muted-label text-primary">Rewards & Favorites</p>
              <p className="mt-3 text-2xl font-black">{number(loyaltyPoints)} points</p>
              <p className="mt-2 text-sm text-ink-muted">{favorites.length} saved venues</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <p className="muted-label text-primary">Quick Actions</p>
              <div className="mt-4 grid gap-2">
                <Button as={Link} to="/explore">New Booking</Button>
                <Button as={Link} to="/explore" variant="outline">Explore Venues</Button>
              </div>
            </CardContent>
          </Card>
        </aside>
        <main>
          <Card className="overflow-hidden">
            <div className="relative h-64">
              <img alt="User profile cover" className="h-full w-full object-cover" src={assetImages.training} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
            </div>
            <CardContent className="-mt-20 relative">
              <img
                alt={user?.name || "TURFX player"}
                className="h-36 w-36 rounded-3xl border-4 border-white object-cover shadow-lift"
                onError={handleImageError}
                src={avatarPreview || user?.profileImage || assetImages.profile}
              />
              <div className="mt-4 flex flex-col justify-between gap-4 md:flex-row md:items-end">
                <div>
                  <Badge variant="primary">{accountLabel}</Badge>
                  <h1 className="mt-3 text-4xl font-black">{user?.name}</h1>
                  <p className="mt-2 text-ink-muted">{user?.bio || "Add a short player bio to complete your profile."}</p>
                </div>
                <Button onClick={() => setEditing((current) => !current)}>{editing ? "Close Editor" : "Edit Profile"}</Button>
              </div>
              {editing && (
                <form
                  className="mt-6 grid gap-4 rounded-xl bg-surface-low p-4 md:grid-cols-2"
                  onSubmit={async (event) => {
                    event.preventDefault();
                    setMessage("");
                    try {
                      const payload = new FormData();
                      payload.append("name", form.name);
                      payload.append("phone", form.phone);
                      payload.append("bio", form.bio);
                      if (form.profileImage) payload.append("profileImage", form.profileImage);
                      await authApi.updateProfile(payload);
                      await refreshProfile();
                      setEditing(false);
                      setAvatarPreview("");
                      notify("Profile updated.");
                    } catch (error) {
                      setMessage(error.response?.data?.message || error.message);
                    }
                  }}
                >
                  <Input onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Name" required value={form.name} />
                  <Input onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} placeholder="Phone" value={form.phone} />
                  <Textarea className="md:col-span-2" maxLength={300} onChange={(event) => setForm((current) => ({ ...current, bio: event.target.value }))} placeholder="Bio" value={form.bio} />
                  <Input
                    accept="image/*"
                    onChange={(event) => {
                      const file = event.target.files?.[0] || null;
                      setForm((current) => ({ ...current, profileImage: file }));
                      setAvatarPreview(file ? URL.createObjectURL(file) : "");
                    }}
                    type="file"
                  />
                  <Button type="submit">Save Profile</Button>
                  {message && <p className="text-sm font-bold text-danger md:col-span-2">{message}</p>}
                </form>
              )}
            </CardContent>
          </Card>
          <div className="mt-6 grid gap-5 md:grid-cols-4">
            {[
              ["Bookings", String(bookings.length), "CalendarDays"],
              ["Favorites", String(favorites.length), "Star"],
              ["Joined", user?.createdAt ? new Date(user.createdAt).getFullYear() : "2026", "BadgeCheck"],
            ].map(([label, value, icon]) => (
              <StatsCard icon={icon} key={label} label={label} value={value} />
            ))}
          </div>
          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
            <ChartPanel data={bookingSeries(bookings)} dataKey="bookings" title="Booking Rhythm" type="bar" />
            <Card>
              <CardContent>
                <h2 className="text-2xl font-black">Account Details</h2>
                <div className="mt-5 grid gap-4">
                  <Input readOnly value={user?.email || ""} />
                  <Input readOnly value={user?.phone || "No phone added"} />
                  <Input readOnly value={`${accountLabel} account`} />
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
