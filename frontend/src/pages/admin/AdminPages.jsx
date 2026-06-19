import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { Badge } from "../../components/ui/badge.jsx";
import { Button } from "../../components/ui/button.jsx";
import { Card, CardContent } from "../../components/ui/card.jsx";
import { DataTable } from "../../components/shared/DataTable.jsx";
import { StatsCard } from "../../components/shared/StatsCard.jsx";
import { Input, Textarea } from "../../components/ui/input.jsx";
import { Modal } from "../../components/ui/modal.jsx";
import { useAnalytics } from "../../hooks/useAnalytics.js";
import { useBookings, useNotifications, useUpdateBookingStatus } from "../../hooks/useBookings.js";
import {
  useAdminOwners,
  useAdminSettings,
  useAdminTurfs,
  useAdminVenueSchedules,
  useAdminUsers,
  useBookingConflictLogs,
  useCreateEvent,
  useCreateNotification,
  useCreateTournament,
  useDeleteEvent,
  useDeleteTournament,
  useDeleteUser,
  useEvents,
  useMarkNotificationRead,
  useOwnerStatusMutation,
  usePayments,
  useRefundPayment,
  useSaveSetting,
  useTournaments,
  useTurfStatusMutation,
  useUpdateUser,
} from "../../hooks/usePlatform.js";
import { currency } from "../../utils/formatters.js";
import { downloadPaymentReceipt } from "../../utils/bookingPass.js";
import { notify } from "../../utils/notify.js";

function futureDate(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function downloadCsv(filename, rows) {
  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function errorMessage(error) {
  return error.response?.data?.message || error.message || "The action could not be completed.";
}

function scheduleSummary(schedule = {}) {
  const weekly = schedule.weeklyAvailability || {};
  const ranges = Object.values(weekly).flat().filter(Boolean);
  const uniqueRanges = [...new Set(ranges)];
  return uniqueRanges.length ? uniqueRanges.join(", ") : "Closed";
}

function formatOwnerApprovalStatus(status = "") {
  const normalized = String(status || "").toUpperCase();
  const statusMap = {
    ACTIVE: "APPROVED",
    APPROVED: "APPROVED",
    PENDING: "PENDING",
    REJECTED: "REJECTED",
    SUSPENDED: "SUSPENDED",
    active: "APPROVED",
    pending: "PENDING",
    rejected: "REJECTED",
    suspended: "SUSPENDED",
  };

  return statusMap[normalized] || statusMap[String(status)] || "PENDING";
}

function ownerDisplayStatus(owner = {}) {
  return formatOwnerApprovalStatus(owner.approvalStatus || owner.accountStatus);
}

function OwnerApprovalStatusBadge({ status }) {
  const displayStatus = formatOwnerApprovalStatus(status);
  const variants = {
    APPROVED: "success",
    PENDING: "warning",
    REJECTED: "danger",
    SUSPENDED: "warning",
  };
  const classNames = {
    SUSPENDED: "bg-orange-100 text-orange-700",
  };

  return (
    <Badge className={classNames[displayStatus]} variant={variants[displayStatus] || "default"}>
      {displayStatus}
    </Badge>
  );
}

function AdminShell({ children, rows = [], columns = [], subtitle, title }) {
  const { data: dashboard = {} } = useAnalytics();

  return (
    <div>
      <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <Badge variant="primary">Platform Owner</Badge>
          <h1 className="mt-3 text-4xl font-black">{title}</h1>
          <p className="mt-2 text-ink-muted">{subtitle}</p>
        </div>
        <Button as={Link} to="/admin/settings" variant="outline">
          <ShieldCheck size={16} />
          Protected Workspace
        </Button>
      </div>
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <StatsCard icon="UsersRound" label="Platform Users" to="/admin/users" value={String(dashboard.totalUsers || 0)} />
        <StatsCard icon="UserPlus" label="Turf Owners" to="/admin/owners" value={String(dashboard.totalOwners || 0)} tone="secondary" />
        <StatsCard icon="Landmark" label="Venues" to="/admin/turfs" value={String(dashboard.totalTurfs || 0)} tone="accent" />
        <StatsCard icon="Banknote" label="Revenue" to="/admin/revenue" value={currency(dashboard.totalRevenue || 0)} tone="warning" />
      </div>
      {children || <DataTable columns={columns} rows={rows} />}
    </div>
  );
}

export function AdminDashboardPage() {
  const { data: dashboard = {} } = useAnalytics();
  const ownerMutation = useOwnerStatusMutation();
  const turfMutation = useTurfStatusMutation();
  const rows = (dashboard.recentActivities || []).map((activity) => [
    new Date(activity.createdAt).toLocaleString(),
    activity.type,
    activity.message,
    "Active",
  ]);
  const pendingOwnerRows = (dashboard.pendingOwnerApplications || []).map((owner) => [
    owner.businessName || owner.name,
    owner.email,
    owner.phone || "Not provided",
    new Date(owner.createdAt).toLocaleDateString(),
    <div className="flex flex-wrap gap-2" key={`${owner._id}-pending-owner-actions`}>
      <Button onClick={() => ownerMutation.mutate({ id: owner._id, status: "ACTIVE" })} size="sm">Approve</Button>
      <Button onClick={() => ownerMutation.mutate({ id: owner._id, status: "REJECTED" })} size="sm" variant="outline">Reject</Button>
      <Button as={Link} size="sm" to="/admin/owners" variant="ghost">View Details</Button>
    </div>,
  ]);
  const pendingVenueRows = (dashboard.pendingVenueApplications || []).map((turf) => [
    turf.name,
    turf.ownerId?.businessName || turf.ownerId?.name || "Owner",
    turf.sportsSupported?.[0] || "Sport",
    turf.location || turf.city,
    new Date(turf.createdAt).toLocaleDateString(),
    <div className="flex flex-wrap gap-2" key={`${turf._id}-pending-venue-actions`}>
      <Button onClick={() => turfMutation.mutate({ id: turf._id, status: "LIVE" })} size="sm">Approve</Button>
      <Button onClick={() => turfMutation.mutate({ id: turf._id, status: "REJECTED" })} size="sm" variant="outline">Reject</Button>
      <Button as={Link} size="sm" to="/admin/turfs" variant="ghost">View Details</Button>
    </div>,
  ]);

  return (
    <AdminShell
      subtitle={`${dashboard.pendingOwners || 0} owner applications and ${dashboard.pendingTurfs || 0} venues await review.`}
      title="Global Dashboard"
    >
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <StatsCard icon="UserPlus" label="Pending Owners" to="/admin/owners" value={String(dashboard.pendingOwners || 0)} tone="warning" />
        <StatsCard icon="Clock" label="Pending Venues" to="/admin/turfs" value={String(dashboard.pendingTurfs || 0)} tone="secondary" />
        <StatsCard icon="BadgeCheck" label="Live Venues" to="/admin/turfs" value={String(dashboard.liveVenues || 0)} tone="accent" />
        <StatsCard icon="X" label="Rejected Venues" to="/admin/turfs" value={String(dashboard.rejectedVenues || 0)} tone="warning" />
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <section>
          <h2 className="mb-4 text-xl font-black">Pending Turf Owners</h2>
          <DataTable columns={["Name", "Email", "Phone", "Created", "Actions"]} emptyMessage="No pending turf owners." rows={pendingOwnerRows} />
        </section>
        <section>
          <h2 className="mb-4 text-xl font-black">Pending Venues</h2>
          <DataTable columns={["Venue", "Owner", "Sport", "Location", "Created", "Actions"]} emptyMessage="No pending venues." rows={pendingVenueRows} />
        </section>
      </div>
      <div className="mt-6">
        <h2 className="mb-4 text-xl font-black">Recent Activity</h2>
        <DataTable columns={["Time", "Type", "Activity", "Status"]} rows={rows} />
      </div>
    </AdminShell>
  );
}

export function UserManagementPage() {
  const [searchParams] = useSearchParams();
  const search = searchParams.get("search") || "";
  const { data = {} } = useAdminUsers({ limit: 100, role: "user", search: search || undefined });
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();
  const [viewUser, setViewUser] = useState(null);
  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", phone: "", walletBalance: "0" });

  function openEditUser(user) {
    setEditUser(user);
    setEditForm({
      name: user.name || "",
      phone: user.phone || "",
      walletBalance: String(user.walletBalance || 0),
    });
  }

  const rows = (data.users || []).map((user) => [
    user.name,
    user.email,
    user.accountStatus || "active",
    <div className="flex gap-2" key={`${user._id}-actions`}>
      <Button onClick={() => setViewUser(user)} size="sm" variant="ghost">
        View
      </Button>
      <Button onClick={() => openEditUser(user)} size="sm" variant="outline">
        Edit
      </Button>
      <Button
        onClick={() => updateUser.mutate({
          id: user._id,
          payload: { accountStatus: user.accountStatus === "suspended" ? "active" : "suspended" },
        })}
        size="sm"
        variant="outline"
      >
        {user.accountStatus === "suspended" ? "Activate" : "Suspend"}
      </Button>
      <Button
        onClick={() => {
          if (window.confirm(`Delete ${user.name}? This cannot be undone.`)) deleteUser.mutate(user._id);
        }}
        size="sm"
        variant="danger"
      >
        Delete
      </Button>
    </div>,
  ]);
  return (
    <AdminShell
      columns={["Name", "Email", "Status", "Actions"]}
      rows={rows}
      subtitle={search ? `Showing accounts matching "${search}".` : "Manage user access and account lifecycle."}
      title="User Management"
    >
      <DataTable columns={["Name", "Email", "Status", "Actions"]} rows={rows} />
      <Modal onOpenChange={(open) => !open && setViewUser(null)} open={Boolean(viewUser)} title="User Details">
        {viewUser && (
          <div className="grid gap-3 text-sm">
            <p><strong>Name:</strong> {viewUser.name}</p>
            <p><strong>Email:</strong> {viewUser.email}</p>
            <p><strong>Phone:</strong> {viewUser.phone || "Not provided"}</p>
            <p><strong>Status:</strong> {viewUser.accountStatus || "active"}</p>
            <p><strong>Membership:</strong> {viewUser.membershipPlan || "Starter"}</p>
            <p><strong>Wallet:</strong> {currency(viewUser.walletBalance || 0)}</p>
          </div>
        )}
      </Modal>
      <Modal onOpenChange={(open) => !open && setEditUser(null)} open={Boolean(editUser)} title="Edit User">
        {editUser && (
          <form
            className="grid gap-4"
            onSubmit={async (event) => {
              event.preventDefault();
              try {
                await updateUser.mutateAsync({
                  id: editUser._id,
                  payload: {
                    name: editForm.name,
                    phone: editForm.phone,
                    walletBalance: Number(editForm.walletBalance || 0),
                  },
                });
                setEditUser(null);
                notify("User updated.");
              } catch (error) {
                notify(errorMessage(error));
              }
            }}
          >
            <Input onChange={(event) => setEditForm((current) => ({ ...current, name: event.target.value }))} required value={editForm.name} />
            <Input onChange={(event) => setEditForm((current) => ({ ...current, phone: event.target.value }))} value={editForm.phone} />
            <Input min="0" onChange={(event) => setEditForm((current) => ({ ...current, walletBalance: event.target.value }))} type="number" value={editForm.walletBalance} />
            <Button disabled={updateUser.isPending} type="submit">Save User</Button>
          </form>
        )}
      </Modal>
    </AdminShell>
  );
}

export function TurfOwnerManagementPage() {
  const { data = {} } = useAdminOwners({ limit: 100 });
  const mutation = useOwnerStatusMutation();
  const rows = (data.owners || []).map((owner) => {
    const displayStatus = ownerDisplayStatus(owner);

    return [
      owner.businessName || owner.name,
      owner.email,
      owner.phone || "Not provided",
      <OwnerApprovalStatusBadge key={`${owner._id}-status`} status={displayStatus} />,
      new Date(owner.createdAt).toLocaleDateString(),
      <div className="flex flex-wrap gap-2" key={`${owner._id}-actions`}>
        {displayStatus !== "APPROVED" && (
          <Button onClick={() => mutation.mutate({ id: owner._id, status: "ACTIVE" })} size="sm">
            Approve
          </Button>
        )}
        {["APPROVED", "PENDING"].includes(displayStatus) && (
          <Button onClick={() => mutation.mutate({ id: owner._id, status: "REJECTED" })} size="sm" variant="outline">
            Reject
          </Button>
        )}
        <Button as={Link} size="sm" to="/admin/owners" variant="ghost">View Details</Button>
        {["APPROVED", "PENDING"].includes(displayStatus) && (
          <Button onClick={() => mutation.mutate({ id: owner._id, status: "SUSPENDED" })} size="sm" variant="danger">
            Suspend
          </Button>
        )}
      </div>,
    ];
  });
  return <AdminShell columns={["Business", "Email", "Phone", "Status", "Created", "Actions"]} rows={rows} subtitle="Approve, reject, or suspend turf owner applications." title="Turf Owner Management" />;
}

export function TurfManagementPage() {
  const { data: turfs = [] } = useAdminTurfs();
  const mutation = useTurfStatusMutation();
  const rows = turfs.map((turf) => [
    turf.name,
    turf.ownerId?.businessName || turf.ownerId?.name || "Owner",
    turf.sport,
    turf.location || turf.city,
    turf.status,
    <div className="flex flex-wrap gap-2" key={`${turf.id}-actions`}>
      <Button onClick={() => mutation.mutate({ id: turf.id, status: "LIVE" })} size="sm">
        {["Suspended", "Rejected"].includes(turf.status) ? "Reactivate" : "Approve"}
      </Button>
      <Button onClick={() => mutation.mutate({ id: turf.id, status: "REJECTED" })} size="sm" variant="outline">Reject</Button>
      <Button as={Link} size="sm" to="/admin/turfs" variant="ghost">View Details</Button>
      <Button onClick={() => mutation.mutate({ id: turf.id, status: "SUSPENDED" })} size="sm" variant="danger">Suspend</Button>
    </div>,
  ]);
  return <AdminShell columns={["Venue", "Owner", "Sport", "Location", "Status", "Actions"]} rows={rows} subtitle="Moderate venue visibility and marketplace status." title="Venue Management" />;
}

export function BookingManagementPage() {
  const { data: bookings = [] } = useBookings();
  const { data: conflictLogs = [] } = useBookingConflictLogs({ limit: 20 });
  const { data: schedules = [] } = useAdminVenueSchedules();
  const updateStatus = useUpdateBookingStatus();
  const rows = bookings.map((booking) => [
    booking.id,
    booking.venue,
    booking.user?.name || "User",
    booking.status,
    <div className="flex flex-wrap gap-2" key={`${booking.id}-actions`}>
      {booking.statusValue === "pending" && <Button onClick={() => updateStatus.mutate({ id: booking.id, status: "confirmed" })} size="sm">Confirm</Button>}
      {booking.statusValue === "confirmed" && <Button onClick={() => updateStatus.mutate({ id: booking.id, status: "checked_in" })} size="sm">Check In</Button>}
      {booking.statusValue === "checked_in" && <Button onClick={() => updateStatus.mutate({ id: booking.id, status: "completed" })} size="sm">Complete</Button>}
      {!["cancelled", "completed", "checked_in"].includes(booking.statusValue) && (
        <Button onClick={() => updateStatus.mutate({ id: booking.id, status: "cancelled" })} size="sm" variant="danger">Cancel</Button>
      )}
    </div>,
  ]);
  const scheduleRows = schedules.slice(0, 8).map((turf) => [
    turf.name,
    turf.ownerId?.businessName || turf.ownerId?.name || "Owner",
    scheduleSummary(turf.schedule),
    `${turf.schedule?.slotMinutes || 60} min, ${turf.schedule?.bufferMinutes || 0} min buffer`,
  ]);
  const conflictRows = conflictLogs.map((log) => [
    new Date(log.createdAt).toLocaleString(),
    log.turfId?.name || "Venue",
    log.userId?.email || "Guest preview",
    `${String(log.bookingDate).slice(0, 10)} ${log.slotStartTime} - ${log.slotEndTime}`,
    log.reason,
  ]);

  return (
    <AdminShell subtitle="Review and advance platform reservation states." title="Booking Management">
      <DataTable columns={["Booking", "Venue", "User", "Status", "Actions"]} rows={rows} />
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section>
          <h2 className="mb-4 text-xl font-black">Venue Schedules</h2>
          <DataTable columns={["Venue", "Owner", "Hours", "Rules"]} rows={scheduleRows} />
        </section>
        <section>
          <h2 className="mb-4 text-xl font-black">Conflict Logs</h2>
          <DataTable columns={["Time", "Venue", "User", "Request", "Reason"]} rows={conflictRows} />
        </section>
      </div>
    </AdminShell>
  );
}

export function PlatformRevenuePage() {
  const { data: payments = [] } = usePayments();
  const refundPayment = useRefundPayment();
  const platformRevenue = payments
    .filter((payment) => payment.status === "paid")
    .reduce((sum, payment) => sum + Number(payment.platformFee || 0), 0);
  const grossRevenue = payments
    .filter((payment) => payment.status === "paid")
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const rows = payments.map((payment) => [
    payment.paymentId,
    new Date(payment.createdAt).toLocaleDateString(),
    payment.customer?.email || payment.userId?.email || "User",
    payment.venue,
    currency(payment.amount),
    currency(payment.platformFee || 0),
    currency(payment.ownerRevenue || 0),
    payment.status,
    <div className="flex flex-wrap gap-2" key={`${payment.id}-actions`}>
      <Button
        onClick={async () => {
          await downloadPaymentReceipt(payment);
          notify("Receipt downloaded.");
        }}
        size="sm"
        variant="outline"
      >
        Receipt
      </Button>
      {payment.status === "paid" ? (
        <Button
          disabled={refundPayment.isPending}
          onClick={() => {
            if (window.confirm(`Refund ${currency(payment.amount)} to ${payment.customer?.email || payment.userId?.email || "this user"}?`)) {
              refundPayment.mutate(payment.id);
            }
          }}
          size="sm"
          variant="outline"
        >
          Refund
        </Button>
      ) : "No action"}
    </div>,
  ]);
  return (
    <AdminShell subtitle="Paid, pending, failed, and refunded transactions." title="Revenue">
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <StatsCard icon="CircleDollarSign" label="Platform Earnings" trend="10% fee" value={currency(platformRevenue)} />
        <StatsCard icon="Banknote" label="Gross Payments" trend="User paid" value={currency(grossRevenue)} tone="secondary" />
        <StatsCard icon="BadgeCheck" label="Transactions" trend="All records" value={String(payments.length)} tone="accent" />
      </div>
      <DataTable columns={["Transaction", "Date", "User", "Venue", "Gross", "Platform Fee", "Owner Revenue", "Status", "Actions"]} rows={rows} />
    </AdminShell>
  );
}

export function PlatformAnalyticsPage() {
  const { data: dashboard = {} } = useAnalytics();
  const rows = [
    ["Users", dashboard.totalUsers || 0, "Accounts", "Active"],
    ["Turf Owners", dashboard.totalOwners || 0, "Partners", "Active"],
    ["Venues", dashboard.totalTurfs || 0, "Inventory", "Active"],
    ["Bookings", dashboard.totalBookings || 0, "Reservations", "Active"],
  ];
  return <AdminShell columns={["Metric", "Value", "Area", "Status"]} rows={rows} subtitle="Current platform totals from MongoDB." title="Analytics" />;
}

export function PlatformNotificationsPage() {
  const { data: notifications = [] } = useNotifications();
  const { data: usersData = {} } = useAdminUsers({ limit: 100 });
  const createNotification = useCreateNotification();
  const markRead = useMarkNotificationRead();
  const [form, setForm] = useState({ userId: "", title: "", message: "" });
  const rows = notifications.map((notification) => [
    notification.userId?.email || "Platform audience",
    notification.title,
    notification.body,
    notification.time,
    notification.isRead ? "Read" : "Active",
    <div className="flex flex-wrap gap-2" key={`${notification.id}-actions`}>
      {notification.targetUrl && <Button as={Link} size="sm" to={notification.targetUrl} variant="ghost">Open</Button>}
      {notification.isRead ? "No action" : (
        <Button onClick={() => markRead.mutate(notification.id)} size="sm" variant="outline">
          Mark Read
        </Button>
      )}
    </div>,
  ]);

  return (
    <AdminShell subtitle="Send and review persisted platform notifications." title="Notifications">
      <Card className="mb-6">
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <select
              className="focus-ring h-11 rounded-lg border border-surface-outline bg-white px-3 text-sm"
              onChange={(event) => setForm((current) => ({ ...current, userId: event.target.value }))}
              value={form.userId}
            >
              <option value="">Select recipient</option>
              <option value="__broadcast">Broadcast to all active accounts</option>
              {(usersData.users || []).map((user) => <option key={user._id} value={user._id}>{user.name} - {user.email}</option>)}
            </select>
            <Input onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Title" value={form.title} />
            <Input onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))} placeholder="Message" value={form.message} />
          </div>
          <Button
            className="mt-4"
            disabled={!form.userId || !form.title || !form.message || createNotification.isPending}
            onClick={async () => {
              try {
                await createNotification.mutateAsync({
                  ...form,
                  broadcast: form.userId === "__broadcast",
                  userId: form.userId === "__broadcast" ? undefined : form.userId,
                });
                setForm({ userId: "", title: "", message: "" });
                notify(form.userId === "__broadcast" ? "Broadcast notification sent." : "Notification sent.");
              } catch (error) {
                notify(errorMessage(error));
              }
            }}
          >
            Send Notification
          </Button>
        </CardContent>
      </Card>
      <DataTable columns={["Recipient", "Title", "Message", "Time", "Status", "Actions"]} rows={rows} />
    </AdminShell>
  );
}

export function EventManagementPage() {
  const { data: events = [] } = useEvents();
  const createEvent = useCreateEvent();
  const deleteEvent = useDeleteEvent();
  const [form, setForm] = useState({
    description: "",
    entryFee: "0",
    eventDate: futureDate(14),
    location: "",
    maxParticipants: "60",
    title: "",
  });
  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  const rows = events.map((event) => [
    event.title,
    event.venue,
    event.date,
    event.capacity,
    <Button
      key={event.id}
      onClick={() => {
        if (window.confirm(`Delete ${event.title}?`)) deleteEvent.mutate(event.id);
      }}
      size="sm"
      variant="danger"
    >
      Delete
    </Button>,
  ]);
  return (
    <AdminShell subtitle="Create and retire events published through the API." title="Event Management">
      <Card className="mb-6">
        <CardContent>
          <h2 className="text-xl font-black">Publish Event</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Input onChange={update("title")} placeholder="Event title" value={form.title} />
            <Input onChange={update("location")} placeholder="Location" value={form.location} />
            <Input onChange={update("eventDate")} type="date" value={form.eventDate} />
            <Input min="1" onChange={update("maxParticipants")} type="number" value={form.maxParticipants} />
            <Input min="0" onChange={update("entryFee")} placeholder="Entry fee" type="number" value={form.entryFee} />
            <Textarea onChange={update("description")} placeholder="Event description" value={form.description} />
          </div>
          <Button
            className="mt-4"
            disabled={createEvent.isPending || !form.title || !form.location || !form.description}
            onClick={async () => {
              try {
                await createEvent.mutateAsync({
                  ...form,
                  entryFee: Number(form.entryFee),
                  maxParticipants: Number(form.maxParticipants),
                });
                setForm({ description: "", entryFee: "0", eventDate: futureDate(14), location: "", maxParticipants: "60", title: "" });
                notify("Event published.");
              } catch (error) {
                notify(errorMessage(error));
              }
            }}
          >
            Publish Event
          </Button>
        </CardContent>
      </Card>
      <DataTable columns={["Event", "Location", "Date", "Capacity", "Actions"]} rows={rows} />
    </AdminShell>
  );
}

export function TournamentManagementPage() {
  const { data: tournaments = [] } = useTournaments();
  const createTournament = useCreateTournament();
  const deleteTournament = useDeleteTournament();
  const [form, setForm] = useState({
    description: "",
    endDate: futureDate(32),
    prizePool: "10000",
    sport: "Football",
    startDate: futureDate(30),
    title: "",
  });
  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  const rows = tournaments.map((tournament) => [
    tournament.title,
    tournament.sport,
    tournament.date,
    tournament.status,
    <Button
      key={tournament.id}
      onClick={() => {
        if (window.confirm(`Delete ${tournament.title}?`)) deleteTournament.mutate(tournament.id);
      }}
      size="sm"
      variant="danger"
    >
      Delete
    </Button>,
  ]);
  return (
    <AdminShell subtitle="Publish and retire competitive events and prize pools." title="Tournament Management">
      <Card className="mb-6">
        <CardContent>
          <h2 className="text-xl font-black">Publish Tournament</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Input onChange={update("title")} placeholder="Tournament title" value={form.title} />
            <select className="focus-ring h-11 rounded-lg border border-surface-outline bg-white px-3 text-sm" onChange={update("sport")} value={form.sport}>
              {["Football", "Cricket", "Volleyball", "Basketball", "Badminton", "Tennis"].map((sport) => <option key={sport}>{sport}</option>)}
            </select>
            <Input onChange={update("startDate")} type="date" value={form.startDate} />
            <Input onChange={update("endDate")} type="date" value={form.endDate} />
            <Input min="0" onChange={update("prizePool")} type="number" value={form.prizePool} />
            <Textarea onChange={update("description")} placeholder="Tournament description" value={form.description} />
          </div>
          <Button
            className="mt-4"
            disabled={createTournament.isPending || !form.title || !form.description}
            onClick={async () => {
              if (form.endDate < form.startDate) {
                notify("End date must be after the start date.");
                return;
              }
              try {
                await createTournament.mutateAsync({ ...form, prizePool: Number(form.prizePool) });
                setForm({ description: "", endDate: futureDate(32), prizePool: "10000", sport: "Football", startDate: futureDate(30), title: "" });
                notify("Tournament published.");
              } catch (error) {
                notify(errorMessage(error));
              }
            }}
          >
            Publish Tournament
          </Button>
        </CardContent>
      </Card>
      <DataTable columns={["Tournament", "Sport", "Date", "Status", "Actions"]} rows={rows} />
    </AdminShell>
  );
}

export function ReportsPage() {
  const { data: dashboard = {} } = useAnalytics();
  const rows = [
    ["Revenue snapshot", "Finance", currency(dashboard.totalRevenue || 0), "Ready"],
    ["Booking snapshot", "Operations", dashboard.totalBookings || 0, "Ready"],
    ["Approval queue", "Marketplace", (dashboard.pendingOwners || 0) + (dashboard.pendingTurfs || 0), "Ready"],
  ];
  return (
    <AdminShell subtitle="Live operational summaries with an exportable handoff." title="Reports">
      <div className="mb-4 flex justify-end">
        <Button
          onClick={() => {
            downloadCsv("TURFX-platform-reports.csv", [["Report", "Team", "Value", "Status"], ...rows]);
            notify("Platform report downloaded.");
          }}
          variant="outline"
        >
          Download CSV
        </Button>
      </div>
      <DataTable columns={["Report", "Team", "Value", "Status"]} rows={rows} />
    </AdminShell>
  );
}

export function SettingsPage() {
  const { data: settings = [] } = useAdminSettings();
  const saveSetting = useSaveSetting();
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const rows = settings.map((setting) => [setting.key, setting.category, String(setting.value), "Active"]);

  return (
    <AdminShell subtitle="Persist platform controls and operational configuration." title="System Settings">
      <Card className="mb-6">
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <Input onChange={(event) => setKey(event.target.value)} placeholder="setting.key" value={key} />
            <Textarea onChange={(event) => setValue(event.target.value)} placeholder="Setting value" value={value} />
          </div>
          <Button
            className="mt-4"
            disabled={!key || !value || saveSetting.isPending}
            onClick={async () => {
              try {
                await saveSetting.mutateAsync({ key, payload: { value } });
                setKey("");
                setValue("");
                notify("Platform setting saved.");
              } catch (error) {
                notify(errorMessage(error));
              }
            }}
          >
            Save Setting
          </Button>
        </CardContent>
      </Card>
      <DataTable columns={["Setting", "Category", "Value", "Status"]} rows={rows} />
    </AdminShell>
  );
}
