import { Fragment } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, Check, Clock, MapPin, MoreVertical, Plus, Search } from "lucide-react";
import { Badge } from "../../components/ui/badge.jsx";
import { Button } from "../../components/ui/button.jsx";
import { Card, CardContent } from "../../components/ui/card.jsx";
import { Input, Textarea } from "../../components/ui/input.jsx";
import { ChartPanel } from "../../components/shared/ChartPanel.jsx";
import { DataTable } from "../../components/shared/DataTable.jsx";
import { StatsCard } from "../../components/shared/StatsCard.jsx";
import { Stepper } from "../../components/shared/Stepper.jsx";
import { TurfCard } from "../../components/shared/TurfCard.jsx";
import {
  addTurfSteps,
  analyticsSeries,
  assetImages,
  bookings,
  members,
  ownerKpis,
  turfPerformance,
  turfs,
} from "../../data/turfxData.js";
import { currency } from "../../utils/formatters.js";

function PageTitle({ eyebrow, title, subtitle, action }) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
      <div>
        {eyebrow && <p className="muted-label text-primary">{eyebrow}</p>}
        <h1 className="mt-2 text-4xl font-black tracking-normal">{title}</h1>
        {subtitle && <p className="mt-2 text-ink-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

function PerformanceBars() {
  return (
    <Card>
      <CardContent>
        <h2 className="text-2xl font-black">Venue Performance</h2>
        <div className="mt-6 space-y-5">
          {turfPerformance.map((item) => (
            <div key={item.name}>
              <div className="mb-2 flex items-end justify-between">
                <div>
                  <p className="font-black">{item.name}</p>
                  <p className="text-sm text-ink-muted">{item.revenue} Revenue</p>
                </div>
                <p className="font-black text-primary">{item.value}% Utility</p>
              </div>
              <div className="h-2 rounded-full bg-surface-high">
                <div className="h-full rounded-full bg-primary" style={{ width: `${item.value}%` }} />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function OwnerDashboardPage() {
  const matches = [
    ["14:00", "Academy Quarterfinals", "Pitch 1 - 7-a-side"],
    ["15:30", "Corporate League", "Main Court - Full Pitch"],
    ["17:00", "Elite Training Session", "Training Zone B"],
    ["19:00", "Open Play Session", "Pitch 2 - 5-a-side"],
  ];

  return (
    <div>
      <PageTitle
        action={
          <div className="flex gap-3">
            <Button variant="outline">
              <CalendarDays size={16} />
              Last 30 Days
            </Button>
            <Button>Quick Actions</Button>
            <Button size="icon" variant="outline">
              <MoreVertical />
            </Button>
          </div>
        }
        eyebrow="Turf Owner Workspace"
        subtitle="Venue performance, bookings, earnings, and availability across your portfolio."
        title="Turf Owner Dashboard"
      />
      <div className="metric-grid">
        {ownerKpis.map((kpi, index) => (
          <StatsCard delay={index * 0.06} icon={kpi.icon} key={kpi.label} label={kpi.label} trend={kpi.trend} value={kpi.value} />
        ))}
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_360px]">
        <ChartPanel data={analyticsSeries} subtitle="Daily comparison against previous period" title="Revenue Trends" type="line" />
        <Card>
          <CardContent>
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black">Today&apos;s Bookings</h2>
              <Badge variant="primary">LIVE</Badge>
            </div>
            <div className="mt-6 space-y-6">
              {matches.map(([time, title, meta], index) => (
                <div className="flex gap-4" key={title}>
                  <div className="w-14 shrink-0 text-right font-black">{time}</div>
                  <div className="min-w-0 flex-1">
                    <p className="font-black">{title}</p>
                    <p className="text-sm text-ink-muted">{meta}</p>
                  </div>
                  <span className={`mt-2 h-2.5 w-2.5 rounded-full ${index === 0 ? "bg-accent" : "bg-surface-outline"}`} />
                </div>
              ))}
            </div>
            <Button className="mt-7 w-full" variant="ghost">
              View Full Schedule
            </Button>
          </CardContent>
        </Card>
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card>
          <CardContent>
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black">Peak Hours</h2>
              <p className="text-sm text-ink-muted">Intensity</p>
            </div>
            <div className="mt-6 grid grid-cols-[60px_repeat(7,1fr)] gap-3 text-center text-sm">
              <span />
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                <span className="font-bold text-ink-muted" key={day}>{day}</span>
              ))}
              {["08:00", "12:00", "18:00"].map((time, row) => (
                <Fragment key={time}>
                  <span className="text-right font-bold text-ink-muted" key={`${time}-label`}>{time}</span>
                  {Array.from({ length: 7 }).map((_, index) => (
                    <span
                      className="h-12 rounded-lg"
                      key={`${time}-${index}`}
                      style={{ backgroundColor: `rgba(37, 99, 235, ${0.18 + row * 0.22 + index * 0.035})` }}
                    />
                  ))}
                </Fragment>
              ))}
            </div>
          </CardContent>
        </Card>
        <PerformanceBars />
      </div>
    </div>
  );
}

export function MyTurfsPage() {
  return (
    <div>
      <PageTitle
        action={
          <Button as={Link} to="/owner/add-turf">
            <Plus size={16} />
            Add New Venue
          </Button>
        }
        eyebrow="Turf Owner Workspace"
        subtitle="Manage inventory, publish status, pricing, and performance."
        title="My Venues"
      />
      <div className="grid gap-5 lg:grid-cols-3">
        {turfs.slice(0, 3).map((turf) => (
          <TurfCard actionHref={`/owner/turfs/${turf.id}`} actionLabel="Manage" href={`/owner/turfs/${turf.id}`} key={turf.id} turf={turf} />
        ))}
      </div>
      <div className="mt-6">
        <DataTable
          columns={["Turf", "Sport", "Price", "Status"]}
          rows={turfs.map((turf) => [turf.name, turf.sport, currency(turf.price), turf.status])}
        />
      </div>
    </div>
  );
}

export function TurfDetailsOwnerPage() {
  const turf = turfs[0];
  return (
    <div>
      <PageTitle
        action={<Button>Edit Venue</Button>}
        eyebrow="Venue Details"
        subtitle="Operational summary, gallery, pricing, and live rules."
        title={turf.name}
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card className="overflow-hidden">
          <img alt={turf.name} className="h-80 w-full object-cover" src={turf.image} />
          <CardContent>
            <h2 className="text-2xl font-black">Published Experience</h2>
            <p className="mt-3 leading-7 text-ink-muted">
              Premium football turf with full lighting, digital locker flow, cafe access, and high utilization across peak hours.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-4">
              {turf.amenities.map((amenity) => (
                <Badge key={amenity} variant="primary">{amenity}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
        <PerformanceBars />
      </div>
    </div>
  );
}

export function AddTurfWizardPage() {
  return (
    <div>
      <PageTitle
        eyebrow="Add Venue"
        subtitle="All publishing steps from the reference flow are represented and ready for API submission."
        title="Launch a new venue"
      />
      <Stepper current={3} steps={addTurfSteps} />
      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_360px]">
        <Card>
          <CardContent className="space-y-8">
            <section>
              <h2 className="text-2xl font-black">Basic Information</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Input placeholder="Venue name" />
                <Input placeholder="Sport type" />
                <Input placeholder="Surface type" />
                <Input placeholder="Capacity" />
              </div>
            </section>
            <section>
              <h2 className="text-2xl font-black">Location</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-[1fr_1fr]">
                <Input placeholder="Address" />
                <Input placeholder="District" />
              </div>
              <div className="relative mt-4 h-56 overflow-hidden rounded-2xl">
                <img alt="Map" className="h-full w-full object-cover grayscale" src={assetImages.map} />
                <div className="absolute inset-0 grid place-items-center">
                  <div className="grid h-12 w-12 place-items-center rounded-full bg-primary text-white">
                    <MapPin />
                  </div>
                </div>
              </div>
            </section>
            <section>
              <h2 className="text-2xl font-black">Gallery</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                {[assetImages.stadium, assetImages.indoor, assetImages.training].map((image) => (
                  <img alt="Gallery upload preview" className="h-40 rounded-xl object-cover" key={image} src={image} />
                ))}
              </div>
            </section>
            <section>
              <h2 className="text-2xl font-black">Pricing, Amenities, Scheduling</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <Input placeholder="Base hourly price" />
                <Input placeholder="Peak hour uplift" />
                <Input placeholder="Cancellation window" />
              </div>
              <Textarea className="mt-4" placeholder="Rules, amenities, and owner notes" />
            </section>
            <section className="rounded-2xl bg-primary-soft p-5">
              <h2 className="text-2xl font-black">Review & Publish</h2>
              <p className="mt-2 text-sm text-ink-muted">
                Preview validates required data, image coverage, price bands, slot rules, and publish readiness.
              </p>
              <Button className="mt-5">Publish Venue</Button>
            </section>
          </CardContent>
        </Card>
        <Card className="h-max">
          <CardContent>
            <h2 className="text-2xl font-black">Wizard Checklist</h2>
            <div className="mt-5 space-y-3">
              {addTurfSteps.map((step, index) => (
                <div className="flex items-center gap-3 rounded-xl bg-surface-low p-3" key={step}>
                  <span className={`grid h-7 w-7 place-items-center rounded-full text-xs font-black ${index < 4 ? "bg-primary text-white" : "bg-white text-ink-muted"}`}>
                    {index < 4 ? <Check size={14} /> : index + 1}
                  </span>
                  <span className="text-sm font-bold">{step}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function SlotManagementPage() {
  const slots = ["06:00", "07:00", "08:00", "12:00", "14:00", "18:00", "19:00", "20:00", "21:00", "22:00"];
  return (
    <div>
      <PageTitle
        action={<Button>Save Rules</Button>}
        eyebrow="Scheduling Engine"
        subtitle="Configure availability, pricing tiers, blackout windows, and recurring rules."
        title="Availability"
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardContent>
            <h2 className="text-2xl font-black">Daily Schedule</h2>
            <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-5">
              {slots.map((slot, index) => (
                <button
                  className={`rounded-xl border p-4 text-left font-black ${
                    index > 5 ? "border-primary bg-primary text-white" : "border-surface-border bg-white"
                  }`}
                  key={slot}
                >
                  {slot}
                  <span className="mt-1 block text-xs font-medium opacity-70">{index > 5 ? "Peak" : "Open"}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <h2 className="text-2xl font-black">Rules</h2>
            <div className="mt-5 space-y-4">
              {["Peak uplift after 18:00", "Gold members save 15%", "Minimum 60 minute slots", "Blackout maintenance Monday 05:00"].map((rule) => (
                <div className="flex items-center justify-between rounded-xl bg-surface-low p-3" key={rule}>
                  <span className="text-sm font-bold">{rule}</span>
                  <Badge variant="success">On</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function CalendarManagementPage() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const times = ["08:00", "10:00", "12:00", "14:00", "18:00", "20:00"];
  return (
    <div>
      <PageTitle
        action={<Button variant="outline">Export Calendar</Button>}
        eyebrow="Calendar"
        subtitle="Week view built for dense operational scanning."
        title="Availability Calendar"
      />
      <Card>
        <CardContent>
          <div className="grid grid-cols-[72px_repeat(7,1fr)] gap-2 overflow-x-auto text-sm">
            <span />
            {days.map((day) => (
              <div className="min-w-32 rounded-xl bg-surface-low p-3 text-center font-black" key={day}>{day}</div>
            ))}
            {times.map((time, rowIndex) => (
              <Fragment key={time}>
                <div className="p-3 text-right font-bold text-ink-muted" key={`${time}-label`}>{time}</div>
                {days.map((day, index) => (
                  <div
                    className={`min-h-24 min-w-32 rounded-xl border p-3 ${index + rowIndex > 6 ? "border-primary bg-primary-soft" : "border-surface-border bg-white"}`}
                    key={`${day}-${time}`}
                  >
                    <p className="font-black">{index + rowIndex > 6 ? "Booked" : "Open"}</p>
                    <p className="mt-1 text-xs text-ink-muted">Pitch {index % 2 + 1}</p>
                  </div>
                ))}
              </Fragment>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function AnalyticsCenterPage() {
  return (
    <div>
      <PageTitle eyebrow="Analytics Center" subtitle="Executive dashboards using Recharts and production-ready data shapes." title="Executive Analytics" />
      <div className="metric-grid">
        {ownerKpis.map((kpi) => (
          <StatsCard icon={kpi.icon} key={kpi.label} label={kpi.label} trend={kpi.trend} value={kpi.value} />
        ))}
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <ChartPanel data={analyticsSeries} title="Revenue Trends" />
        <ChartPanel data={analyticsSeries} dataKey="bookings" title="Booking Trends" type="bar" />
        <ChartPanel data={analyticsSeries} dataKey="occupancy" title="Occupancy Rate" type="line" />
        <ChartPanel data={analyticsSeries} dataKey="users" title="User Growth" type="bar" />
      </div>
    </div>
  );
}

export function RevenueDashboardPage() {
  const rows = [
    ["Jun 2", "The Stadium Turf", "$8,420", "Settled"],
    ["Jun 1", "Skyline Arena", "$6,210", "Settled"],
    ["May 31", "The Glass Court", "$4,850", "Pending"],
  ];
  return (
    <div>
      <PageTitle eyebrow="Finance" subtitle="Earnings, payouts, refunds, and revenue across your venues." title="Earnings" />
      <div className="metric-grid">
        <StatsCard icon="CircleDollarSign" label="Net Revenue" trend="+14%" value="$96,430" />
        <StatsCard icon="CreditCard" label="Payment Holds" trend="Live" value="$18,200" tone="secondary" />
        <StatsCard icon="Banknote" label="Payouts" trend="2 pending" value="$74,100" tone="accent" />
        <StatsCard icon="BadgeCheck" label="Refund Rate" trend="-2.1%" value="1.8%" tone="warning" />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_0.8fr]">
        <ChartPanel data={analyticsSeries} title="Revenue Movement" />
        <PerformanceBars />
      </div>
      <div className="mt-6">
        <DataTable columns={["Date", "Venue", "Amount", "Status"]} rows={rows} />
      </div>
    </div>
  );
}

export function OwnerBookingsPage() {
  return (
    <div>
      <PageTitle
        eyebrow="Venue Operations"
        subtitle="Manage reservations and payment status across your venues."
        title="Bookings"
      />
      <DataTable
        columns={["Booking", "Venue", "Schedule", "Status"]}
        rows={bookings.map((booking) => [
          booking.id,
          booking.venue,
          `${booking.date}, ${booking.time}`,
          booking.status,
        ])}
      />
    </div>
  );
}

export function OwnerReviewsPage() {
  return (
    <div>
      <PageTitle
        eyebrow="Customer Experience"
        subtitle="Monitor ratings and customer feedback for your venues."
        title="Reviews"
      />
      <DataTable
        columns={["Venue", "Rating", "Reviews", "Status"]}
        rows={turfs.slice(0, 3).map((turf) => [
          turf.name,
          `${turf.rating} / 5`,
          String(turf.reviews),
          turf.rating >= 4.8 ? "Excellent" : "Healthy",
        ])}
      />
    </div>
  );
}

export function CRMPage() {
  return (
    <div>
      <PageTitle
        action={
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" size={18} />
            <Input className="pl-10" placeholder="Search athletes..." />
          </div>
        }
        eyebrow="CRM"
        subtitle="Manage athletes, spend, tiers, retention health, and outreach."
        title="Athletes"
      />
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        {["Elite", "Gold", "At Risk", "New"].map((segment, index) => (
          <Card interactive key={segment}>
            <CardContent>
              <p className="muted-label">{segment}</p>
              <p className="mt-2 text-3xl font-black">{[48, 122, 16, 73][index]}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <DataTable
        columns={["Athlete", "Sport", "Spend", "Tier"]}
        rows={members.map((member) => [member.name, member.sport, currency(member.spend), member.tier])}
      />
    </div>
  );
}

export function AthleteProfileOwnerPage() {
  const athlete = members[0];
  return (
    <div>
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <Card>
          <CardContent className="text-center">
            <img alt={athlete.name} className="mx-auto h-36 w-36 rounded-3xl object-cover" src={assetImages.profile} />
            <Badge className="mt-5" variant="primary">{athlete.tier}</Badge>
            <h1 className="mt-3 text-3xl font-black">{athlete.name}</h1>
            <p className="mt-2 text-ink-muted">{athlete.sport} - Retention health {athlete.health}%</p>
            <Button className="mt-6 w-full">Send Offer</Button>
          </CardContent>
        </Card>
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <StatsCard icon="CalendarDays" label="Bookings" value={String(athlete.bookings)} />
            <StatsCard icon="Banknote" label="Spend" value={currency(athlete.spend)} />
            <StatsCard icon="Activity" label="Health" value={`${athlete.health}%`} />
          </div>
          <ChartPanel data={analyticsSeries} dataKey="bookings" title="Athlete Booking Pattern" type="bar" />
        </div>
      </div>
      <Card className="mt-6">
        <CardContent>
          <h2 className="text-2xl font-black">Engagement Timeline</h2>
          <div className="mt-5 space-y-4">
            {["Booked The Stadium Turf", "Joined TURFX Gold", "Completed early-bird challenge", "Opened recovery lounge offer"].map((item) => (
              <div className="flex items-center gap-4" key={item}>
                <div className="grid h-9 w-9 place-items-center rounded-full bg-primary-soft text-primary">
                  <Clock size={16} />
                </div>
                <p className="font-bold">{item}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
