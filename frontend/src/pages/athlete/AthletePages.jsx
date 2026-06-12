import { Link, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  Bell,
  CalendarDays,
  Check,
  CreditCard,
  Download,
  MapPin,
  QrCode,
  Trophy,
  WalletCards,
} from "lucide-react";
import { Badge } from "../../components/ui/badge.jsx";
import { Button } from "../../components/ui/button.jsx";
import { Card, CardContent } from "../../components/ui/card.jsx";
import { Input } from "../../components/ui/input.jsx";
import { ChartPanel } from "../../components/shared/ChartPanel.jsx";
import { DataTable } from "../../components/shared/DataTable.jsx";
import { StatsCard } from "../../components/shared/StatsCard.jsx";
import { TurfCard } from "../../components/shared/TurfCard.jsx";
import { Icon } from "../../components/shared/icons.jsx";
import {
  analyticsSeries,
  assetImages,
  bookings,
  membershipTiers,
  notifications,
  turfs,
} from "../../data/turfxData.js";
import { useAuth } from "../../store/authContext.js";
import { roleLabels } from "../../constants/auth.js";
import { authService } from "../../services/authService.js";
import { currency, number } from "../../utils/formatters.js";

function BookingCard({ booking }) {
  return (
    <Card interactive className="overflow-hidden">
      <div className="relative h-48">
        <img alt={booking.venue} className="h-full w-full object-cover" src={booking.image} />
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
  const user = useSelector((state) => state.auth.user);
  return (
    <div>
      <div className="mb-8 grid gap-5 lg:grid-cols-[1fr_440px]">
        <div>
          <h1 className="text-4xl font-black tracking-normal md:text-5xl">Welcome back, {user?.name?.split(" ")[0] || "Alex"}</h1>
          <p className="mt-2 text-lg text-ink-muted">Manage your bookings, saved venues, notifications, and player profile.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <StatsCard icon="WalletCards" label="Wallet Balance" value="$420.00" />
          <StatsCard icon="Star" label="Turf Points" tone="secondary" value={number(user?.points || 12060)} />
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
            {bookings.slice(0, 2).map((booking) => (
              <BookingCard booking={booking} key={booking.id} />
            ))}
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
                <p className="text-3xl font-black">12 Games</p>
              </div>
            </div>
            <div className="mt-8 flex items-center justify-between text-sm font-bold">
              <span>Level 8</span>
              <span>2,450 / 3,000 XP</span>
            </div>
            <div className="mt-3 h-2 rounded-full bg-white/10">
              <div className="h-full w-4/5 rounded-full bg-secondary" />
            </div>
            <div className="mt-8 rounded-2xl bg-white/10 p-4">
              <p className="muted-label text-secondary-soft">Achievement unlocked</p>
              <p className="mt-2 text-lg font-black">Early Bird Finisher</p>
              <p className="mt-1 text-sm text-white/70">Completed 5 games before 8 AM.</p>
            </div>
            <Button className="mt-10 w-full border-white/20 text-white" variant="outline">
              View All Badges
            </Button>
          </CardContent>
        </Card>
      </div>

      <section className="mt-12">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-black">Recommended for You</h2>
          <div className="flex gap-2">
            <Button size="icon" variant="outline">
              <Icon name="ArrowLeft" />
            </Button>
            <Button size="icon" variant="outline">
              <Icon name="ArrowRight" />
            </Button>
          </div>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {turfs.slice(3, 6).map((turf) => (
            <TurfCard key={turf.id} turf={turf} />
          ))}
        </div>
      </section>
    </div>
  );
}

export function MyBookingsPage() {
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
        {["Upcoming", "Checked In", "Completed", "Cancelled"].map((tab, index) => (
          <Button key={tab} variant={index === 0 ? "primary" : "outline"}>
            {tab}
          </Button>
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        {bookings.map((booking) => (
          <BookingCard booking={booking} key={booking.id} />
        ))}
      </div>
    </div>
  );
}

export function FavoritesPage() {
  return (
    <div>
      <div className="mb-6">
        <p className="muted-label text-primary">Saved Venues</p>
        <h1 className="mt-2 text-4xl font-black">Favorites</h1>
        <p className="mt-2 text-ink-muted">Quick access to the venues you want to book again.</p>
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        {turfs.slice(0, 3).map((turf) => (
          <TurfCard key={turf.id} turf={turf} />
        ))}
      </div>
    </div>
  );
}

export function BookingDetailsPage() {
  const { id } = useParams();
  const booking = bookings.find((item) => item.id === id) || bookings[2];
  return (
    <div>
      <div className="mb-6">
        <Badge variant="success">{booking.status}</Badge>
        <h1 className="mt-3 text-4xl font-black">{booking.venue}</h1>
        <p className="mt-2 text-ink-muted">Booking {booking.id} - Jun 6, 2026 - {booking.time}</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Card className="overflow-hidden">
            <img alt={booking.venue} className="h-72 w-full object-cover" src={booking.image} />
            <CardContent className="grid gap-5 md:grid-cols-3">
              {[
                ["Date", "Jun 6, 2026", "CalendarDays"],
                ["Time", "19:00 - 20:00", "Clock"],
                ["Location", "Canary Wharf", "MapPin"],
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
        </div>
        <Card className="h-max">
          <CardContent className="text-center">
            <div className="mx-auto grid h-44 w-44 place-items-center rounded-2xl border border-surface-border bg-white">
              <QrCode size={132} />
            </div>
            <h2 className="mt-5 text-2xl font-black">Gate QR</h2>
            <p className="mt-2 text-sm text-ink-muted">Scan at the venue desk to check in and unlock your locker.</p>
            <Button className="mt-6 w-full" variant="outline">
              <Download size={16} />
              Download Pass
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function WalletPage() {
  const rows = [
    ["Jun 2", "Gold booking cashback", "+$25.00", "Completed"],
    ["May 29", "The Glass Court", "-$45.00", "Completed"],
    ["May 21", "Wallet top-up", "+$100.00", "Completed"],
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="muted-label text-primary">Wallet</p>
        <h1 className="mt-2 text-4xl font-black">Payments and rewards</h1>
      </div>
      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <Card className="overflow-hidden bg-dark text-white">
          <CardContent>
            <p className="text-white/65">Available balance</p>
            <p className="mt-3 text-5xl font-black">$420.00</p>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {["Top up", "Transfer", "Invoices"].map((action) => (
                <Button key={action} variant="outline" className="border-white/25 text-white hover:bg-white/10 hover:text-white">
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
            <p className="mt-2 text-sm text-ink-muted">Visa ending 4242, verified for payment holds.</p>
            <Button className="mt-6 w-full" variant="outline">
              <CreditCard size={16} />
              Manage Cards
            </Button>
          </CardContent>
        </Card>
      </div>
      <DataTable columns={["Date", "Description", "Amount", "Status"]} rows={rows} />
    </div>
  );
}

export function NotificationsPage() {
  return (
    <div>
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <p className="muted-label text-primary">Activity Center</p>
          <h1 className="mt-2 text-4xl font-black">Notifications</h1>
        </div>
        <Button variant="outline">
          <Bell size={16} />
          Mark All Read
        </Button>
      </div>
      <div className="grid gap-4">
        {notifications.map((notification) => (
          <Card interactive key={notification.id}>
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
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function ProfilePage() {
  const { user } = useAuth();
  const role = authService.normalizeRole(user?.role);
  const membership = role === "admin" || role === "owner"
    ? roleLabels[role]
    : user?.membership || user?.membershipPlan || "TURFX Member";

  return (
    <div className="page-shell py-10">
      <Card className="overflow-hidden">
        <div className="relative h-64">
          <img alt="User profile cover" className="h-full w-full object-cover" src={assetImages.training} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        </div>
        <CardContent className="-mt-20 relative">
          <img
            alt={user?.name || "TURFX member"}
            className="h-36 w-36 rounded-3xl border-4 border-white object-cover shadow-lift"
            src={user?.profileImage || assetImages.profile}
          />
          <div className="mt-4 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <Badge variant="primary">{membership}</Badge>
              <h1 className="mt-3 text-4xl font-black">{user?.name}</h1>
              <p className="mt-2 text-ink-muted">{user?.email}</p>
            </div>
            <Button>Edit Profile</Button>
          </div>
        </CardContent>
      </Card>
      <div className="mt-6 grid gap-5 md:grid-cols-4">
        {[
          ["Bookings", "34", "CalendarDays"],
          ["Win Rate", "68%", "Trophy"],
          ["Points", "12,060", "Star"],
          ["Teams", "5", "UsersRound"],
        ].map(([label, value, icon]) => (
          <StatsCard icon={icon} key={label} label={label} value={value} />
        ))}
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
        <ChartPanel data={analyticsSeries} dataKey="bookings" title="Booking Rhythm" type="bar" />
        <Card>
          <CardContent>
            <h2 className="text-2xl font-black">Preferences</h2>
            <div className="mt-5 grid gap-4">
              <Input defaultValue="Football" />
              <Input defaultValue="Canary Wharf, London" />
              <Input defaultValue="Weekdays after 18:00" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function MembershipCenterPage() {
  return (
    <div>
      <div className="mb-6">
        <p className="muted-label text-primary">Membership Center</p>
        <h1 className="mt-2 text-4xl font-black">TURFX Gold Benefits</h1>
        <p className="mt-2 text-ink-muted">Your current plan saves 15% on premium venues and unlocks early booking windows.</p>
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
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <Card className="bg-primary text-white">
          <CardContent>
            <Trophy />
            <h2 className="mt-4 text-2xl font-black">12,060 Turf Points</h2>
            <p className="mt-2 text-white/75">Redeem against coaching, peak slots, and event tickets.</p>
          </CardContent>
        </Card>
        <ChartPanel data={analyticsSeries} dataKey="users" title="Membership Growth" type="line" />
      </div>
    </div>
  );
}
