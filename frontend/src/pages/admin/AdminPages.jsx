import { ShieldCheck } from "lucide-react";
import { Badge } from "../../components/ui/badge.jsx";
import { Button } from "../../components/ui/button.jsx";
import { Card, CardContent } from "../../components/ui/card.jsx";
import { DataTable } from "../../components/shared/DataTable.jsx";
import { StatsCard } from "../../components/shared/StatsCard.jsx";
import { adminRows } from "../../data/turfxData.js";

const pageConfig = {
  dashboard: {
    title: "Global Dashboard",
    subtitle: "Platform-wide performance, approvals, revenue, user growth, and booking analytics.",
    columns: ["Metric", "Area", "Review Owner", "Status"],
    rows: [
      ["User Growth", "Customer Accounts", "Growth", "+12.4%"],
      ["Turf Owner Approvals", "Partner Network", "Operations", "8 pending"],
      ["Venue Approvals", "Marketplace", "Quality", "14 pending"],
      ["Booking Analytics", "Reservations", "Platform", "Healthy"],
      ["Revenue Metrics", "Finance", "Leadership", "$248K MTD"],
    ],
  },
  users: {
    title: "User Management",
    subtitle: "Customer and player account governance across the TURFX platform.",
    columns: ["Name", "Role", "Tier", "Status"],
    rows: adminRows.users,
  },
  owners: {
    title: "Turf Owner Management",
    subtitle: "Review business partners, venue portfolios, verification, and approval status.",
    columns: ["Turf Owner", "Portfolio", "Verification", "Status"],
    rows: [
      ["Ravi Kapoor", "3 venues", "Verified", "Active"],
      ["Sofia Miller", "2 venues", "Verified", "Active"],
      ["Marcus Chen", "1 venue", "Review required", "Pending"],
    ],
  },
  turfs: {
    title: "Venue Management",
    subtitle: "Venue approvals, verification, publish state, and utilization review.",
    columns: ["Venue", "City", "Status", "Utility"],
    rows: adminRows.turfs,
  },
  bookings: {
    title: "Booking Management",
    subtitle: "Reservation monitoring, payment state, and support escalation.",
    columns: ["Booking", "Venue", "Payment", "Status"],
    rows: [
      ["BK-1042", "The Stadium Turf", "Paid", "Active"],
      ["BK-1043", "Skyline Futsal", "Hold", "Ready"],
      ["BK-1044", "Prime Box Cricket", "Paid", "Healthy"],
      ["BK-1045", "Urban Arena", "Refund Review", "Pending"],
    ],
  },
  revenue: {
    title: "Revenue",
    subtitle: "Platform revenue, owner payouts, refunds, and payment health.",
    columns: ["Metric", "Current Period", "Previous Period", "Status"],
    rows: [
      ["Gross Booking Value", "$248,600", "$221,400", "Up 12.3%"],
      ["Platform Revenue", "$37,290", "$33,210", "Healthy"],
      ["Turf Owner Payouts", "$196,400", "$175,800", "On schedule"],
      ["Refund Rate", "1.8%", "2.2%", "Improved"],
    ],
  },
  analytics: {
    title: "Analytics",
    subtitle: "User growth, venue performance, booking demand, and marketplace health.",
    columns: ["Insight", "Current", "Trend", "Status"],
    rows: [
      ["Monthly Active Users", "24,820", "+12.4%", "Growing"],
      ["Active Turf Owners", "318", "+8.1%", "Growing"],
      ["Approved Venues", "486", "+6.5%", "Healthy"],
      ["Booking Conversion", "18.7%", "+2.3%", "Improving"],
    ],
  },
  notifications: {
    title: "Notifications",
    subtitle: "Platform alerts, approval queues, operational updates, and system notices.",
    columns: ["Notification", "Area", "Priority", "Status"],
    rows: [
      ["Turf owner verification queue", "Partner Network", "High", "8 pending"],
      ["Venue approval queue", "Marketplace", "High", "14 pending"],
      ["Payment reconciliation complete", "Finance", "Normal", "Resolved"],
      ["Booking demand threshold reached", "Analytics", "Normal", "Active"],
    ],
  },
  events: {
    title: "Event Management",
    subtitle: "Featured challenges, community events, and campaign readiness.",
    columns: ["Event", "City", "Registrations", "Status"],
    rows: [
      ["Corporate Athletics Challenge", "Mumbai", "184", "Active"],
      ["Weekend Football Night", "Pune", "96", "Ready"],
      ["Youth Skills Combine", "Bengaluru", "142", "Healthy"],
      ["Summer Training Camp", "Delhi", "71", "Review"],
    ],
  },
  tournaments: {
    title: "Tournament Management",
    subtitle: "Competitive brackets, prize pools, and operations visibility.",
    columns: ["Tournament", "Format", "Teams", "Status"],
    rows: [
      ["TURFX Pro Elite Cup", "5v5 Football", "32", "Active"],
      ["Box Cricket League", "Cricket", "24", "Ready"],
      ["Night Futsal Open", "Futsal", "16", "Healthy"],
      ["City Badminton Ladder", "Singles", "48", "Draft"],
    ],
  },
  reports: {
    title: "Reports",
    subtitle: "Operational reports for finance, growth, and marketplace health.",
    columns: ["Report", "Team", "Status", "Date"],
    rows: adminRows.reports,
  },
  settings: {
    title: "System Settings",
    subtitle: "Platform controls, security configuration, and integration health.",
    columns: ["Setting", "Area", "Value", "Status"],
    rows: adminRows.settings,
  },
};

function AdminShell({ type }) {
  const config = pageConfig[type];
  return (
    <div>
      <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <Badge variant="primary">Platform Owner</Badge>
          <h1 className="mt-3 text-4xl font-black">{config.title}</h1>
          <p className="mt-2 text-ink-muted">{config.subtitle}</p>
        </div>
        <Button variant="outline">
          <ShieldCheck size={16} />
          Audit Log
        </Button>
      </div>
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <StatsCard icon="UsersRound" label="Platform Users" value="24,820" />
        <StatsCard icon="UserPlus" label="Active Turf Owners" value="318" tone="secondary" />
        <StatsCard icon="Landmark" label="Approved Venues" value="486" tone="accent" />
        <StatsCard icon="Banknote" label="Monthly Revenue" value="$248K" tone="warning" />
      </div>
      <Card className="mb-6">
        <CardContent>
          <div className="grid gap-3 md:grid-cols-4">
            {["Region", "Role", "Status", "Date Range"].map((filter) => (
              <button className="rounded-lg border border-surface-border bg-white px-4 py-3 text-left text-sm font-bold text-ink-muted" key={filter}>
                {filter}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
      <DataTable columns={config.columns} rows={config.rows} />
    </div>
  );
}

export function AdminDashboardPage() {
  return <AdminShell type="dashboard" />;
}

export function UserManagementPage() {
  return <AdminShell type="users" />;
}

export function TurfOwnerManagementPage() {
  return <AdminShell type="owners" />;
}

export function TurfManagementPage() {
  return <AdminShell type="turfs" />;
}

export function BookingManagementPage() {
  return <AdminShell type="bookings" />;
}

export function PlatformRevenuePage() {
  return <AdminShell type="revenue" />;
}

export function PlatformAnalyticsPage() {
  return <AdminShell type="analytics" />;
}

export function PlatformNotificationsPage() {
  return <AdminShell type="notifications" />;
}

export function EventManagementPage() {
  return <AdminShell type="events" />;
}

export function TournamentManagementPage() {
  return <AdminShell type="tournaments" />;
}

export function ReportsPage() {
  return <AdminShell type="reports" />;
}

export function SettingsPage() {
  return <AdminShell type="settings" />;
}
