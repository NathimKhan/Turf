import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
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
  useAdminTurfs,
  useAdminVenueSchedules,
  useAdminUsers,
  useBookingConflictLogs,
  useCreateNotification,
  useCreateTournament,
  useDeleteTournament,
  useDeleteUser,
  useMarkNotificationRead,
  useOwnerStatusMutation,
  usePayments,
  useRefundPayment,
  useTournaments,
  useTurfStatusMutation,
  useUpdateUser,
} from "../../hooks/usePlatform.js";
import { currency } from "../../utils/formatters.js";
import { downloadPaymentReceipt } from "../../utils/bookingPass.js";
import { handleImageError } from "../../utils/media.js";
import { notify } from "../../utils/notify.js";

function futureDate(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
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

function VenueApprovalStatusBadge({ status }) {
  const value = String(status || "PENDING").toUpperCase();
  const variants = {
    ACTIVE: "success",
    APPROVED: "success",
    ARCHIVED: "default",
    EXPIRED: "warning",
    LIVE: "success",
    NEED_CHANGES: "warning",
    PENDING: "warning",
    REJECTED: "danger",
    SUSPENDED: "danger",
  };
  const labels = {
    ACTIVE: "Approved",
    APPROVED: "Approved",
    ARCHIVED: "Archived",
    EXPIRED: "Expired",
    LIVE: "Approved",
    NEED_CHANGES: "Need Changes",
    PENDING: "Pending",
    REJECTED: "Rejected",
    SUSPENDED: "Suspended",
  };

  return <Badge variant={variants[value] || "warning"}>{labels[value] || value}</Badge>;
}

function dashboardDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not set" : date.toLocaleDateString();
}

function ApprovalQueueCard({ actions, badge, className, emptyMessage, emptyTitle, items, renderMeta, title }) {
  return (
    <Card className={className}>
      <CardContent>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black">{title}</h2>
            <p className="mt-1 text-sm text-ink-muted">{items.length ? `${items.length} item${items.length === 1 ? "" : "s"} waiting for review` : emptyMessage}</p>
          </div>
          <Badge variant={items.length ? "warning" : "success"}>{items.length ? "Needs Review" : "Clear"}</Badge>
        </div>
        <div className="mt-5 space-y-3">
          {items.map((item) => (
            <div className="rounded-xl bg-surface-low p-4" key={item._id || item.id || item.email || item.name}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="break-words text-lg font-black text-ink">{item.title}</p>
                  <p className="mt-1 break-words text-sm text-ink-muted">{item.subtitle}</p>
                </div>
                {badge(item)}
              </div>
              <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                {renderMeta(item).map((meta) => (
                  <div className="rounded-lg bg-white p-3" key={meta.label}>
                    <p className="text-xs font-bold uppercase tracking-wide text-ink-muted">{meta.label}</p>
                    <p className="mt-1 break-words font-black text-ink">{meta.value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {actions(item)}
              </div>
            </div>
          ))}
          {!items.length && (
            <div className="rounded-xl bg-surface-low p-6 text-center">
              <Badge variant="success">All Clear</Badge>
              <p className="mt-3 font-black text-ink">{emptyTitle}</p>
              <p className="mt-1 text-sm text-ink-muted">{emptyMessage}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ReviewSummaryCard({ dashboard = {} }) {
  const openReviews = Number(dashboard.pendingOwners || 0) + Number(dashboard.pendingTurfs || 0);
  const items = [
    { label: "Open Reviews", value: String(openReviews) },
    { label: "Live Venues", value: String(dashboard.liveVenues || 0) },
    { label: "Rejected Venues", value: String(dashboard.rejectedVenues || 0) },
  ];

  return (
    <Card>
      <CardContent>
        <h2 className="text-2xl font-black">Review Summary</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
          {items.map((item) => (
            <div className="rounded-xl bg-surface-low p-3" key={item.label}>
              <p className="text-xs font-bold uppercase tracking-wide text-ink-muted">{item.label}</p>
              <p className="mt-1 text-2xl font-black text-ink">{item.value}</p>
            </div>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button as={Link} size="sm" to="/admin/owners" variant="outline">Owners</Button>
          <Button as={Link} size="sm" to="/admin/turfs" variant="outline">Venues</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function AdminShell({ children, rows = [], columns = [], subtitle, title }) {
  const { data: dashboard = {} } = useAnalytics();

  return (
    <div>
      <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <Badge variant="primary">Platform Admin</Badge>
          <h1 className="mt-3 text-4xl font-black">{title}</h1>
          <p className="mt-2 text-ink-muted">{subtitle}</p>
        </div>
      </div>
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <StatsCard icon="UsersRound" label="Platform Users" to="/admin/users" value={String(dashboard.totalUsers || 0)} />
        <StatsCard icon="UserPlus" label="Turf Owners" to="/admin/owners" value={String(dashboard.totalOwners || 0)} tone="secondary" />
        <StatsCard icon="Landmark" label="Venues" to="/admin/turfs" value={String(dashboard.totalTurfs || 0)} tone="accent" />
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
  const pendingOwnerApplications = (dashboard.pendingOwnerApplications || []).map((owner) => ({
    ...owner,
    subtitle: owner.email || "Email not provided",
    title: owner.businessName || owner.name || "Turf Owner",
  }));
  const pendingVenueApplications = (dashboard.pendingVenueApplications || []).map((turf) => ({
    ...turf,
    ownerName: turf.ownerId?.businessName || turf.ownerId?.name || "Owner",
    subtitle: turf.ownerId?.businessName || turf.ownerId?.name || "Owner",
    title: turf.name || "Venue",
  }));

  return (
    <AdminShell
      subtitle={`${dashboard.pendingOwners || 0} owner applications and ${dashboard.pendingTurfs || 0} venues await approval.`}
      title="Global Dashboard"
    >
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <StatsCard icon="UserPlus" label="Pending Owners" to="/admin/owners" value={String(dashboard.pendingOwners || 0)} tone="warning" />
        <StatsCard icon="Clock" label="Pending Venues" to="/admin/turfs" value={String(dashboard.pendingTurfs || 0)} tone="secondary" />
        <StatsCard icon="BadgeCheck" label="Live Venues" to="/admin/turfs" value={String(dashboard.liveVenues || 0)} tone="accent" />
        <StatsCard icon="X" label="Rejected Venues" to="/admin/turfs" value={String(dashboard.rejectedVenues || 0)} tone="warning" />
      </div>
      <div className="grid items-start gap-6 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-5">
          <ApprovalQueueCard
            actions={(owner) => [
              <Button key="approve" onClick={() => ownerMutation.mutate({ id: owner._id, status: "ACTIVE" })} size="sm">Approve</Button>,
              <Button key="reject" onClick={() => ownerMutation.mutate({ id: owner._id, status: "REJECTED" })} size="sm" variant="outline">Reject</Button>,
              <Button as={Link} key="details" size="sm" to="/admin/owners" variant="ghost">View Details</Button>,
            ]}
            badge={() => <Badge variant="warning">Owner</Badge>}
            emptyMessage="No pending turf owners need manual approval right now."
            emptyTitle="Owner queue is clear"
            items={pendingOwnerApplications}
            renderMeta={(owner) => [
              { label: "Phone", value: owner.phone || "Not provided" },
              { label: "Created", value: dashboardDate(owner.createdAt) },
              { label: "Status", value: ownerDisplayStatus(owner) },
            ]}
            title="Pending Turf Owners"
          />
          <ReviewSummaryCard dashboard={dashboard} />
        </div>
        <ApprovalQueueCard
          actions={(turf) => [
            <Button key="approve" onClick={() => turfMutation.mutate({ id: turf._id, status: "APPROVED" })} size="sm">Approve</Button>,
            <Button key="reject" onClick={() => turfMutation.mutate({ id: turf._id, status: "REJECTED" })} size="sm" variant="outline">Reject</Button>,
            <Button as={Link} key="details" size="sm" to="/admin/turfs" variant="ghost">View Details</Button>,
          ]}
          badge={(turf) => <Badge variant="primary">{turf.sportsSupported?.[0] || "Sport"}</Badge>}
          className="xl:col-span-7"
          emptyMessage="No pending venue submissions are waiting in the platform queue."
          emptyTitle="Venue queue is clear"
          items={pendingVenueApplications}
          renderMeta={(turf) => [
            { label: "Owner", value: turf.ownerName },
            { label: "Location", value: turf.location || turf.city || "Not provided" },
            { label: "Created", value: dashboardDate(turf.createdAt) },
          ]}
          title="Pending Venues"
        />
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
  const [viewOwner, setViewOwner] = useState(null);
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
        <Button onClick={() => setViewOwner(owner)} size="sm" variant="ghost">View Details</Button>
        {["APPROVED", "PENDING"].includes(displayStatus) && (
          <Button onClick={() => mutation.mutate({ id: owner._id, status: "SUSPENDED" })} size="sm" variant="danger">
            Suspend
          </Button>
        )}
      </div>,
    ];
  });

  const viewStatus = viewOwner ? ownerDisplayStatus(viewOwner) : "";

  return (
    <AdminShell columns={["Business", "Email", "Phone", "Status", "Created", "Actions"]} rows={rows} subtitle="Approve, reject, or suspend turf owner applications." title="Turf Owner Management">
      <DataTable columns={["Business", "Email", "Phone", "Status", "Created", "Actions"]} rows={rows} />
      <Modal onOpenChange={(open) => !open && setViewOwner(null)} open={Boolean(viewOwner)} title="Turf Owner Details">
        {viewOwner && (
          <div className="grid gap-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl font-black">{viewOwner.businessName || viewOwner.name || "Turf Owner"}</h2>
                <p className="mt-1 text-sm text-ink-muted">{viewOwner.email}</p>
              </div>
              <OwnerApprovalStatusBadge status={viewStatus} />
            </div>
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              {[
                ["Contact Name", viewOwner.name || "-"],
                ["Business", viewOwner.businessName || "-"],
                ["Email", viewOwner.email || "-"],
                ["Phone", viewOwner.phone || "Not provided"],
                ["Address", viewOwner.address || "Not provided"],
                ["Account Status", viewOwner.accountStatus || "-"],
                ["Approval Status", viewOwner.approvalStatus || viewStatus],
                ["Created", viewOwner.createdAt ? new Date(viewOwner.createdAt).toLocaleDateString() : "-"],
                ["Approved", viewOwner.approvedAt ? new Date(viewOwner.approvedAt).toLocaleDateString() : "-"],
                ["Reason", viewOwner.rejectionReason || "-"],
              ].map(([label, value]) => (
                <p className="rounded-lg bg-surface-low p-3" key={label}>
                  <span className="block text-xs font-bold uppercase tracking-wider text-ink-soft">{label}</span>
                  <strong className="mt-1 block break-words text-ink">{value}</strong>
                </p>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 border-t border-surface-border pt-4">
              {viewStatus !== "APPROVED" && (
                <Button disabled={mutation.isPending} onClick={() => mutation.mutate({ id: viewOwner._id, status: "ACTIVE" })}>
                  Approve
                </Button>
              )}
              {["APPROVED", "PENDING"].includes(viewStatus) && (
                <Button disabled={mutation.isPending} onClick={() => mutation.mutate({ id: viewOwner._id, status: "REJECTED" })} variant="outline">
                  Reject
                </Button>
              )}
              {["APPROVED", "PENDING"].includes(viewStatus) && (
                <Button disabled={mutation.isPending} onClick={() => mutation.mutate({ id: viewOwner._id, status: "SUSPENDED" })} variant="danger">
                  Suspend
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </AdminShell>
  );
}

function VenueMediaCell({ turf }) {
  const mediaCount = new Set([
    ...(turf.gallery || []),
    ...(turf.groundImages || []),
    ...(turf.amenityImages || []),
    ...(turf.locationImages || []),
    ...(turf.sportsImages || []),
  ].filter(Boolean)).size;

  return (
    <div className="flex min-w-56 items-center gap-3">
      <img
        alt={turf.name}
        className="h-14 w-20 rounded-lg object-cover"
        data-fallback-src={turf.heroImage}
        loading="lazy"
        onError={handleImageError}
        src={turf.thumbnail || turf.heroImage || turf.image}
      />
      <div className="min-w-0">
        <p className="truncate font-black text-ink">{turf.name}</p>
        <p className="text-xs text-ink-muted">{mediaCount} media assets</p>
      </div>
    </div>
  );
}

function VenueApprovalRow({ disabled, onModerate, onPreview, turf }) {
  const ownerName = turf.ownerId?.businessName || turf.ownerId?.name || "Owner";
  const ownerEmail = turf.ownerId?.email || "Not provided";
  const sports = turf.sportsSupported?.join(", ") || turf.sport || "-";

  return (
    <article className="grid gap-5 bg-white p-5 xl:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.4fr)] xl:items-center">
      <VenueMediaCell turf={turf} />
      <div className="grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1.25fr_0.8fr_0.7fr_auto]">
        {[
          ["Owner", ownerName],
          ["Email", ownerEmail],
          ["Sports", sports],
          ["Hourly", currency(turf.price)],
        ].map(([label, value]) => (
          <div className="min-w-0 rounded-lg bg-surface-low px-3 py-2" key={label}>
            <p className="text-xs font-bold uppercase tracking-wider text-ink-soft">{label}</p>
            <p className="mt-1 break-words font-black text-ink-muted">{value}</p>
          </div>
        ))}
        <div className="min-w-0 rounded-lg bg-surface-low px-3 py-2">
          <p className="text-xs font-bold uppercase tracking-wider text-ink-soft">Status</p>
          <div className="mt-1">
            <VenueApprovalStatusBadge status={turf.approvalStatus || turf.statusValue} />
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 xl:col-span-2">
        <Button className="min-w-28 flex-1 sm:flex-none" disabled={disabled} onClick={() => onModerate(turf, "APPROVED")} size="sm">
          Approve
        </Button>
        <Button className="min-w-40 flex-1 sm:flex-none" disabled={disabled} onClick={() => onModerate(turf, "NEED_CHANGES", true)} size="sm" variant="outline">
          Request Changes
        </Button>
        <Button className="min-w-24 flex-1 sm:flex-none" disabled={disabled} onClick={() => onModerate(turf, "REJECTED", true)} size="sm" variant="outline">
          Reject
        </Button>
        <Button className="min-w-24 flex-1 sm:flex-none" onClick={() => onPreview(turf)} size="sm" variant="ghost">
          Preview
        </Button>
        <Button className="min-w-28 flex-1 sm:flex-none" disabled={disabled} onClick={() => onModerate(turf, "SUSPENDED", true)} size="sm" variant="danger">
          Suspend
        </Button>
      </div>
    </article>
  );
}

export function TurfManagementPage() {
  const { data: turfs = [] } = useAdminTurfs();
  const mutation = useTurfStatusMutation();
  const [filter, setFilter] = useState("PENDING");
  const [previewTurf, setPreviewTurf] = useState(null);
  const filteredTurfs = filter === "ALL" ? turfs : turfs.filter((turf) => turf.approvalStatus === filter || turf.statusValue === filter);
  const counts = {
    ALL: turfs.length,
    APPROVED: turfs.filter((turf) => turf.approvalStatus === "APPROVED").length,
    ARCHIVED: turfs.filter((turf) => turf.approvalStatus === "ARCHIVED").length,
    NEED_CHANGES: turfs.filter((turf) => turf.approvalStatus === "NEED_CHANGES").length,
    PENDING: turfs.filter((turf) => turf.approvalStatus === "PENDING").length,
    REJECTED: turfs.filter((turf) => turf.approvalStatus === "REJECTED").length,
    SUSPENDED: turfs.filter((turf) => turf.approvalStatus === "SUSPENDED").length,
  };

  function moderate(turf, status, promptForReason = false) {
    const reason = promptForReason ? window.prompt(`Reason for ${status.toLowerCase().replace("_", " ")}?`) : "";
    if (promptForReason && reason === null) return;
    mutation.mutate(
      { id: turf.id, reason: reason || "", status },
      {
        onError: (error) => notify(errorMessage(error)),
        onSuccess: () => notify(`${turf.name} updated.`),
      },
    );
  }

  return (
    <AdminShell subtitle="Approve venue submissions, manage publishing, and protect customer-facing inventory." title="Venue Approval Queue">
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <StatsCard icon="Clock" label="Pending Venues" value={String(counts.PENDING)} tone="warning" />
        <StatsCard icon="BadgeCheck" label="Approved Venues" value={String(counts.APPROVED)} tone="accent" />
        <StatsCard icon="FileText" label="Need Changes" value={String(counts.NEED_CHANGES)} tone="secondary" />
        <StatsCard icon="X" label="Rejected/Suspended" value={String(counts.REJECTED + counts.SUSPENDED)} />
      </div>
      <div className="mb-5 flex gap-2 overflow-x-auto pb-2 no-scrollbar">
        {[
          ["PENDING", "Pending"],
          ["APPROVED", "Approved"],
          ["NEED_CHANGES", "Need Changes"],
          ["REJECTED", "Rejected"],
          ["SUSPENDED", "Suspended"],
          ["ARCHIVED", "Archived"],
          ["ALL", "All"],
        ].map(([value, label]) => (
          <Button key={value} onClick={() => setFilter(value)} variant={filter === value ? "primary" : "outline"}>
            {label} ({counts[value] || 0})
          </Button>
        ))}
      </div>
      <Card className="overflow-hidden">
        <div className="divide-y divide-surface-border">
          {filteredTurfs.map((turf) => (
            <VenueApprovalRow
              disabled={mutation.isPending}
              key={turf.id}
              onModerate={moderate}
              onPreview={setPreviewTurf}
              turf={turf}
            />
          ))}
          {!filteredTurfs.length && (
            <div className="px-5 py-8 text-center text-ink-muted">
              No venues match this approval filter.
            </div>
          )}
        </div>
      </Card>
      <Modal onOpenChange={(open) => !open && setPreviewTurf(null)} open={Boolean(previewTurf)} title="Venue Approval Preview">
        {previewTurf && (
          <div className="grid gap-5">
            <img alt={previewTurf.name} className="max-h-72 w-full rounded-xl object-cover" onError={handleImageError} src={previewTurf.coverImage || previewTurf.heroImage || previewTurf.image} />
            <div>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-black">{previewTurf.name}</h2>
                  <p className="mt-1 text-sm text-ink-muted">{previewTurf.address || previewTurf.location}, {previewTurf.city}</p>
                </div>
                <VenueApprovalStatusBadge status={previewTurf.approvalStatus || previewTurf.statusValue} />
              </div>
              <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <p className="rounded-lg bg-surface-low p-3"><span className="block text-ink-muted">Owner</span><strong>{previewTurf.ownerId?.businessName || previewTurf.ownerId?.name || "Owner"}</strong></p>
                <p className="rounded-lg bg-surface-low p-3"><span className="block text-ink-muted">Phone</span><strong>{previewTurf.ownerId?.phone || "Not provided"}</strong></p>
                <p className="rounded-lg bg-surface-low p-3"><span className="block text-ink-muted">Email</span><strong>{previewTurf.ownerId?.email || "Not provided"}</strong></p>
                <p className="rounded-lg bg-surface-low p-3"><span className="block text-ink-muted">Coordinates</span><strong>{previewTurf.latitude}, {previewTurf.longitude}</strong></p>
                <p className="rounded-lg bg-surface-low p-3"><span className="block text-ink-muted">Sports</span><strong>{previewTurf.sportsSupported?.join(", ")}</strong></p>
                <p className="rounded-lg bg-surface-low p-3"><span className="block text-ink-muted">Amenities</span><strong>{previewTurf.amenities?.join(", ")}</strong></p>
                <p className="rounded-lg bg-surface-low p-3"><span className="block text-ink-muted">Pricing</span><strong>{currency(previewTurf.price)} / hour</strong></p>
                <p className="rounded-lg bg-surface-low p-3"><span className="block text-ink-muted">Submitted</span><strong>{previewTurf.submittedAt ? new Date(previewTurf.submittedAt).toLocaleDateString() : "Pending"}</strong></p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {(previewTurf.gallery || []).slice(0, 6).map((image) => (
                <img alt={`${previewTurf.name} gallery`} className="h-28 w-full rounded-lg object-cover" key={image} onError={handleImageError} src={image} />
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button as="a" href={`https://www.google.com/maps?q=${previewTurf.latitude},${previewTurf.longitude}`} rel="noreferrer" target="_blank" variant="outline">View Location</Button>
              <Button as={Link} to={`/venue/${previewTurf.id}`} variant="outline">Preview as Customer</Button>
              <Button disabled={mutation.isPending} onClick={() => moderate(previewTurf, "APPROVED")}>Approve</Button>
              <Button disabled={mutation.isPending} onClick={() => moderate(previewTurf, "NEED_CHANGES", true)} variant="outline">Request Changes</Button>
              <Button disabled={mutation.isPending} onClick={() => moderate(previewTurf, "ARCHIVED", true)} variant="danger">Archive</Button>
            </div>
          </div>
        )}
      </Modal>
    </AdminShell>
  );
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
      {["confirmed", "upcoming"].includes(booking.statusValue) && <Button onClick={() => updateStatus.mutate({ id: booking.id, status: "checked_in" })} size="sm">Check In</Button>}
      {["checked_in", "ongoing"].includes(booking.statusValue) && <Button onClick={() => updateStatus.mutate({ id: booking.id, status: "completed" })} size="sm">Complete</Button>}
      {!["cancelled", "completed", "checked_in", "ongoing"].includes(booking.statusValue) && (
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
    <AdminShell subtitle="Track and advance platform reservation states." title="Booking Management">
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
  const finalizedPayments = payments.filter((payment) =>
    ["paid", "partially_refunded"].includes(payment.status) && payment.finalizedAt);
  const platformRevenue = finalizedPayments
    .reduce((sum, payment) => sum + Number(payment.platformFee || 0), 0);
  const grossRevenue = finalizedPayments
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
      {["paid", "partially_refunded"].includes(payment.status) ? (
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
    <AdminShell subtitle="Send and audit persisted platform notifications." title="Notifications">
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
    <AdminShell subtitle="Publish and retire tournaments and prize pools." title="Tournament Management">
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
