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
  Trophy,
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
import {
  assetImages,
  membershipTiers,
} from "../../data/turfxData.js";
import {
  useBooking,
  useBookings,
  useCancelBooking,
  useNotifications,
} from "../../hooks/useBookings.js";
import {
  useCreateReview,
  useDeleteReview,
  useDeleteNotification,
  useFavorites,
  useMarkNotificationRead,
  useMyReviews,
  usePayments,
  useUpdateReview,
} from "../../hooks/usePlatform.js";
import { useTurfs } from "../../hooks/useTurfs.js";
import { useAuth } from "../../store/authContext.js";
import { roleLabels } from "../../constants/auth.js";
import { authService } from "../../services/authService.js";
import { authApi } from "../../services/api/auth.js";
import { createBookingQr, downloadBookingPass, downloadPaymentReceipt } from "../../utils/bookingPass.js";
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
            {booking.team.map((member) => (
              <span className="grid h-8 w-8 place-items-center rounded-full border-2 border-white bg-primary-soft text-xs font-black text-primary" key={member}>
                {member}
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
  const upcomingBookings = bookings.filter((booking) => ["pending", "confirmed", "upcoming"].includes(booking.statusValue));
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
            <Button as={Link} className="mt-10 w-full border-white/20 text-white" to="/profile" variant="outline">
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
      "Checked In": ["checked_in"],
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
        <Button as={Link} to="/booking/slots">
          New Booking
        </Button>
      </div>
      <div className="mb-5 flex gap-2 overflow-x-auto pb-2 no-scrollbar">
        {["Upcoming", "Checked In", "Completed", "Cancelled"].map((tab) => (
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
  const createReview = useCreateReview();
  const updateReview = useUpdateReview();
  const deleteReview = useDeleteReview();
  const { data: reviews = [] } = useMyReviews(user?.role === "user");
  const { data: payments = [] } = usePayments();
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [qrFailed, setQrFailed] = useState(false);
  const [review, setReview] = useState({ comment: "", rating: 5 });
  const [reviewEditor, setReviewEditor] = useState({ comment: "", rating: 5 });
  const [editingReview, setEditingReview] = useState(false);
  const existingReview = reviews.find((item) => String(item.turfId?._id || item.turfId) === booking?.venueId);
  const existingReviewId = existingReview?._id || existingReview?.id;
  const payment = payments.find((item) => item.bookingIdValue === booking?.id);

  useEffect(() => {
    if (!booking) return;
    setQrFailed(false);
    createBookingQr(booking, user)
      .then(setQrDataUrl)
      .catch(() => {
        setQrDataUrl("");
        setQrFailed(true);
      });
  }, [booking, user]);

  useEffect(() => {
    if (!existingReview) {
      setEditingReview(false);
      return;
    }

    setReviewEditor({
      comment: existingReview.comment || "",
      rating: existingReview.rating || 5,
    });
  }, [existingReview]);

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
                  ["Amount Paid", payment ? currency(payment.amount) : currency(booking.paid || booking.totalAmount || 0)],
                  ["Transaction ID", payment?.paymentId || "Pending payment"],
                  ["Payment Status", payment?.status || booking.paymentStatus || "pending"],
                  ["Venue Contact", booking.turf?.ownerId?.phone || booking.turf?.phone || "Contact via venue desk"],
                ].map(([label, value]) => (
                  <div className="rounded-xl bg-surface-low p-3" key={label}>
                    <p className="muted-label">{label}</p>
                    <p className="mt-1 font-black">{value}</p>
                  </div>
                ))}
              </div>
              {payment && (
                <Button
                  className="mt-5"
                  onClick={async () => {
                    await downloadPaymentReceipt(payment, user);
                    notify("Receipt downloaded.");
                  }}
                  variant="outline"
                >
                  <Download size={16} />
                  Download Receipt
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
        <Card className="h-max">
          <CardContent className="text-center">
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
            {!["cancelled", "completed", "checked_in"].includes(booking.statusValue) && (
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
      {booking.statusValue === "completed" && (
        <Card className="mt-6">
          <CardContent>
            <h2 className="text-2xl font-black">Review Venue</h2>
            {existingReview ? (
              <div className="mt-4">
                {!editingReview ? (
                  <div className="rounded-xl bg-surface-low p-4">
                    <p className="text-sm font-bold text-ink">You rated this venue {existingReview.rating} / 5</p>
                    <p className="mt-2 text-sm text-ink-muted">{existingReview.comment}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button onClick={() => setEditingReview(true)} size="sm" variant="outline">Edit Review</Button>
                      <Button
                        onClick={() => {
                          if (!window.confirm("Delete this venue review?")) return;
                          deleteReview.mutate(existingReviewId, {
                            onError: (error) => notify(error.response?.data?.message || error.message),
                            onSuccess: () => notify("Review deleted."),
                          });
                        }}
                        size="sm"
                        variant="danger"
                      >
                        Delete Review
                      </Button>
                    </div>
                  </div>
                ) : (
                  <form
                    className="grid gap-4"
                    onSubmit={async (event) => {
                      event.preventDefault();
                      try {
                        await updateReview.mutateAsync({ id: existingReviewId, payload: reviewEditor });
                        setEditingReview(false);
                        notify("Review updated.");
                      } catch (error) {
                        notify(error.response?.data?.message || error.message);
                      }
                    }}
                  >
                    <select
                      aria-label="Edit venue rating"
                      className="focus-ring h-11 rounded-lg border border-surface-outline bg-white px-3 text-sm"
                      onChange={(event) => setReviewEditor((current) => ({ ...current, rating: Number(event.target.value) }))}
                      value={reviewEditor.rating}
                    >
                      {[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating} / 5</option>)}
                    </select>
                    <Textarea
                      aria-label="Edit review comment"
                      onChange={(event) => setReviewEditor((current) => ({ ...current, comment: event.target.value }))}
                      required
                      value={reviewEditor.comment}
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button disabled={updateReview.isPending} type="submit">Save Review</Button>
                      <Button onClick={() => setEditingReview(false)} type="button" variant="outline">Cancel</Button>
                    </div>
                  </form>
                )}
              </div>
            ) : (
              <form
                className="mt-5 grid gap-4"
                onSubmit={async (event) => {
                  event.preventDefault();
                  try {
                    await createReview.mutateAsync({ ...review, turfId: booking.venueId });
                    setReview({ comment: "", rating: 5 });
                    notify("Your venue review was published.");
                  } catch (error) {
                    notify(error.response?.data?.message || error.message);
                  }
                }}
              >
                <select
                  aria-label="Venue rating"
                  className="focus-ring h-11 rounded-lg border border-surface-outline bg-white px-3 text-sm"
                  onChange={(event) => setReview((current) => ({ ...current, rating: Number(event.target.value) }))}
                  value={review.rating}
                >
                  {[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating} / 5</option>)}
                </select>
                <Textarea
                  aria-label="Review comment"
                  onChange={(event) => setReview((current) => ({ ...current, comment: event.target.value }))}
                  placeholder="Share your venue experience"
                  required
                  value={review.comment}
                />
                <Button disabled={createReview.isPending} type="submit">Publish Review</Button>
              </form>
            )}
          </CardContent>
        </Card>
      )}
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
              {["Top up", "Transfer", "Invoices"].map((action) => (
                <Button
                  key={action}
                  onClick={() => action === "Invoices" ? downloadInvoices() : setWalletAction(action.toLowerCase().replace(" ", ""))}
                  variant="outline"
                  className="border-white/25 text-white hover:bg-white/10 hover:text-white"
                >
                  {action}
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
  const { data: notifications = [] } = useNotifications();
  const navigate = useNavigate();
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
      {!notifications.length && <Card><CardContent className="text-center text-ink-muted">You are all caught up. New booking and membership activity will appear here.</CardContent></Card>}
    </div>
  );
}

export function ProfilePage() {
  const { refreshProfile, user } = useAuth();
  const { data: bookings = [] } = useBookings();
  const { data: favorites = [] } = useFavorites();
  const { data: reviews = [] } = useMyReviews(user?.role === "user");
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
  const membership = role === "admin" || role === "owner"
    ? roleLabels[role]
    : user?.membership || user?.membershipPlan || "TURFX Member";
  const completedBookings = bookings.filter((item) => item.statusValue === "completed").length;
  const loyaltyPoints = completedBookings * 250 + bookings.length * 25;

  return (
    <div className="page-shell py-10">
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="space-y-5">
          <Card>
            <CardContent className="text-center">
              <img
                alt={user?.name || "TURFX member"}
                className="mx-auto h-24 w-24 rounded-2xl object-cover"
                onError={handleImageError}
                src={user?.profileImage || assetImages.profile}
              />
              <h2 className="mt-4 text-xl font-black">{user?.name}</h2>
              <Badge className="mt-2" variant="primary">{membership}</Badge>
              <p className="mt-3 break-all text-sm text-ink-muted">{user?.email}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <p className="muted-label text-primary">Booking Summary</p>
              <div className="mt-4 space-y-3 text-sm">
                <p className="flex justify-between"><span>Upcoming</span><strong>{bookings.filter((item) => ["pending", "confirmed", "checked_in", "upcoming"].includes(item.statusValue)).length}</strong></p>
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
                <Button as={Link} to="/booking/slots">New Booking</Button>
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
                alt={user?.name || "TURFX member"}
                className="h-36 w-36 rounded-3xl border-4 border-white object-cover shadow-lift"
                onError={handleImageError}
                src={avatarPreview || user?.profileImage || assetImages.profile}
              />
              <div className="mt-4 flex flex-col justify-between gap-4 md:flex-row md:items-end">
                <div>
                  <Badge variant="primary">{membership}</Badge>
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
              ["Reviews", String(reviews.length), "MessageSquare"],
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
                  <Input readOnly value={`${membership} membership`} />
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}

export function MembershipCenterPage() {
  const { refreshProfile, user } = useAuth();
  const { data: bookings = [] } = useBookings();
  const [selectedTier, setSelectedTier] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const currentPlan = user?.membershipPlan || user?.membership || "Starter";
  const planRank = { Starter: 0, Gold: 1, Elite: 2 };
  return (
    <div>
      <div className="mb-6">
        <p className="muted-label text-primary">Membership Center</p>
        <h1 className="mt-2 text-4xl font-black">TURFX {currentPlan} Benefits</h1>
        <p className="mt-2 text-ink-muted">Review your current access and upgrade instantly through the prototype checkout.</p>
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        {membershipTiers.map((tier) => (
          <Card className={tier.featured ? "border-primary" : ""} interactive key={tier.name}>
            <CardContent>
              <Badge variant={tier.featured ? "primary" : "default"}>{tier.label}</Badge>
              <h2 className="mt-4 text-2xl font-black">{tier.name}</h2>
              <p className="mt-1 text-sm text-ink-muted">{tier.price ? `${currency(tier.price)} / month` : "Free"}</p>
              <div className="mt-5 space-y-3">
                {tier.perks.map((perk) => (
                  <p className="flex items-center gap-2 text-sm" key={perk}>
                    <Check className="text-accent" size={16} />
                    {perk}
                  </p>
                ))}
              </div>
              <Button
                className="mt-6 w-full"
                disabled={planRank[tier.name] <= planRank[currentPlan]}
                onClick={() => setSelectedTier(tier)}
                variant={tier.featured ? "primary" : "outline"}
              >
                {tier.name === currentPlan ? "Current Plan" : planRank[tier.name] < planRank[currentPlan] ? "Included" : `Upgrade to ${tier.name}`}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <Card className="bg-primary text-white">
          <CardContent>
            <Trophy />
            <h2 className="mt-4 text-2xl font-black">{bookings.length} Total Bookings</h2>
            <p className="mt-2 text-white/75">Your activity history grows with every completed venue booking.</p>
          </CardContent>
        </Card>
        <ChartPanel data={bookingSeries(bookings)} dataKey="bookings" title="Booking Activity" type="line" />
      </div>
      <Card className="mt-6">
        <CardContent>
          <h2 className="text-2xl font-black">Membership History</h2>
          <div className="mt-4 space-y-3">
            {(user?.membershipHistory || []).map((entry) => (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-low p-4" key={entry._id || entry.reference}>
                <div>
                  <p className="font-black">{entry.plan}</p>
                  <p className="text-sm text-ink-muted">{entry.reference}</p>
                </div>
                <p className="text-sm font-bold">{currency(entry.amount)} - {new Date(entry.upgradedAt).toLocaleDateString()}</p>
              </div>
            ))}
            {!user?.membershipHistory?.length && <p className="text-sm text-ink-muted">Starter membership activated when your account was created.</p>}
          </div>
        </CardContent>
      </Card>
      <Modal onOpenChange={(open) => !open && setSelectedTier(null)} open={Boolean(selectedTier)} title="Membership Checkout">
        {selectedTier && (
          <div>
            <Badge variant="primary">{selectedTier.name}</Badge>
            <h2 className="mt-4 text-3xl font-black">{currency(selectedTier.price)} / month</h2>
            <p className="mt-3 text-sm text-ink-muted">This prototype uses an instant mock payment. Your profile, dashboard, membership center, and notifications update immediately.</p>
            <div className="mt-5 rounded-xl bg-surface-low p-4">
              <p className="font-black">Confirm upgrade</p>
              <p className="mt-1 text-sm text-ink-muted">{currentPlan} to {selectedTier.name}</p>
            </div>
            <Button
              className="mt-5 w-full"
              disabled={isProcessing}
              onClick={async () => {
                setIsProcessing(true);
                try {
                  await authApi.upgradeMembership(selectedTier.name);
                  await refreshProfile();
                  notify(`Membership upgraded to ${selectedTier.name}.`);
                  setSelectedTier(null);
                } catch (error) {
                  notify(error.response?.data?.message || error.message);
                } finally {
                  setIsProcessing(false);
                }
              }}
            >
              {isProcessing ? "Confirming..." : "Confirm Mock Payment"}
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
