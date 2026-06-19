import { Fragment, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
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
  assetImages,
} from "../../data/turfxData.js";
import { useOwnerDashboard } from "../../hooks/useAnalytics.js";
import { useBookings, useUpdateBookingStatus } from "../../hooks/useBookings.js";
import { useOwnerReviews, usePayments } from "../../hooks/usePlatform.js";
import {
  useCreateTurf,
  useDeleteTurf,
  useMyTurfs,
  useTurf,
  useUpdateTurf,
  useUpdateTurfSlots,
} from "../../hooks/useTurfs.js";
import { currency } from "../../utils/formatters.js";
import { downloadPaymentReceipt } from "../../utils/bookingPass.js";
import { handleImageError } from "../../utils/media.js";
import { notify } from "../../utils/notify.js";
import { useAuth } from "../../store/authContext.js";

const TURF_SPORT_OPTIONS = ["Football", "Cricket", "Volleyball", "Basketball", "Badminton", "Tennis"];
const TURF_AMENITY_OPTIONS = ["Parking", "Washroom", "Drinking Water", "Flood Lights", "Seating Area"];
const DAY_KEYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const UTC_DAY_KEYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const WEEKDAY_KEYS = ["monday", "tuesday", "wednesday", "thursday", "friday"];
const WEEKEND_KEYS = ["saturday", "sunday"];
const BLACKOUT_REASON_OPTIONS = ["Maintenance", "Private Event", "Holiday"];
const PROTOTYPE_REVENUE_SERIES = [
  { name: "Jan", previous: 72000, revenue: 84000 },
  { name: "Feb", previous: 78000, revenue: 96000 },
  { name: "Mar", previous: 82000, revenue: 112000 },
  { name: "Apr", previous: 91000, revenue: 128000 },
  { name: "May", previous: 104000, revenue: 146000 },
  { name: "Jun", previous: 118000, revenue: 164000 },
];
const PROTOTYPE_PAYMENTS = [
  { amount: 18400, bookingReference: "BK-DEMO001", createdAt: "2026-06-15T10:00:00.000Z", customerName: "Nathim", ownerRevenue: 16560, paymentId: "TXN001", paymentMethod: "Mock Payment", paymentStatus: "paid", platformFee: 1840, venue: "The Stadium Turf" },
  { amount: 12600, bookingReference: "BK-DEMO002", createdAt: "2026-06-13T16:30:00.000Z", customerName: "Aarav Shah", ownerRevenue: 11340, paymentId: "TXN002", paymentMethod: "UPI", paymentStatus: "paid", platformFee: 1260, venue: "Skyline Arena" },
  { amount: 9800, bookingReference: "BK-DEMO003", createdAt: "2026-06-11T19:00:00.000Z", customerName: "Meera Iyer", ownerRevenue: 8820, paymentId: "TXN003", paymentMethod: "Card", paymentStatus: "paid", platformFee: 980, venue: "The Glass Court" },
  { amount: 6200, bookingReference: "BK-DEMO004", createdAt: "2026-06-09T07:30:00.000Z", customerName: "Rohan Das", ownerRevenue: 5580, paymentId: "TXN004", paymentMethod: "Cash", paymentStatus: "paid", platformFee: 620, venue: "Arena North" },
];
const PROTOTYPE_PEAK_HOURS = [
  { label: "18:00 - 20:00", value: "32 bookings" },
  { label: "07:00 - 09:00", value: "18 bookings" },
  { label: "20:00 - 22:00", value: "16 bookings" },
];
const PROTOTYPE_DASHBOARD_TRANSACTIONS = [
  { amount: 1200, customerName: "Nathim", id: "TXN001", paymentStatus: "Paid", venue: "Football Arena 6" },
  { amount: 1800, customerName: "Rahul", id: "TXN002", paymentStatus: "Paid", venue: "The Stadium" },
  { amount: 1400, customerName: "Priya", id: "TXN003", paymentStatus: "Paid", venue: "Skyline Cricket Box" },
];
const PROTOTYPE_UPCOMING_PAYOUTS = [
  { amount: 5800, expectedDate: "Tomorrow", venue: "Football Arena 6" },
  { amount: 2400, expectedDate: "2 Days", venue: "The Stadium" },
];
const PROTOTYPE_REVENUE_FORECAST = [
  { label: "Potential Revenue This Week", value: currency(12000) },
  { label: "Upcoming Bookings Revenue", value: currency(8400) },
  { label: "Potential Earnings", value: currency(16800) },
  { label: "Expected Bookings", value: "8" },
  { label: "Average Booking Value", value: currency(1500) },
  { label: "Peak Booking Day", value: "Saturday" },
  { label: "Venue Utilization", value: "72%" },
  { label: "Top Venue", value: "Football Arena 6" },
];
const PROTOTYPE_VENUE_HIGHLIGHTS = [
  { label: "Most Booked Venue", value: "Football Arena 6" },
  { label: "Least Booked Venue", value: "Arena North" },
  { label: "Highest Revenue Venue", value: "The Stadium" },
  { label: "Fastest Growing Venue", value: "Skyline Cricket Box" },
];
const PROTOTYPE_BOOKING_INSIGHTS = [
  { label: "Peak Hour", value: "18:00 - 20:00" },
  { label: "Most Popular Sport", value: "Football" },
  { label: "Bookings This Week", value: "18" },
  { label: "Bookings This Month", value: "64" },
  { label: "Completion Rate", value: "91%" },
  { label: "Cancellation Rate", value: "4%" },
];
const PROTOTYPE_SUGGESTED_ACTIONS = [
  "Review weekend pricing",
  "Open evening slots",
  "Confirm pending payouts",
];
const PROTOTYPE_PEAK_BOOKING_SUMMARY = [
  { label: "Today's Bookings", value: "12" },
  { label: "Today's Revenue", value: currency(8500) },
  { label: "Upcoming", value: "6" },
  { label: "Completed", value: "5" },
  { label: "Cancelled", value: "1" },
];
const PROTOTYPE_PEAK_TIME_ANALYSIS = [
  { label: "Most Popular Time", value: "18:00 - 20:00" },
  { label: "Least Busy Time", value: "08:00 - 10:00" },
  { label: "Most Popular Day", value: "Saturday" },
  { label: "Highest Utilization", value: "Football Arena 6" },
];
const PROTOTYPE_UPCOMING_BOOKINGS = [
  { customerName: "Nathim", time: "6:00 PM", venue: "Football Arena 6" },
  { customerName: "Rahul", time: "7:00 PM", venue: "Skyline Cricket Box" },
  { customerName: "Priya", time: "8:00 PM", venue: "The Stadium" },
];
const PROTOTYPE_TOP_VENUE_ROWS = [
  { bookings: 48, revenue: 5800, venue: "Football Arena 6" },
  { bookings: 34, revenue: 1800, venue: "The Stadium" },
  { bookings: 29, revenue: 1400, venue: "Skyline Cricket Box" },
];
const PROTOTYPE_PERFORMANCE_INSIGHTS = [
  { label: "Booking Growth", value: "+12%" },
  { label: "Revenue Growth", value: "+18%" },
  { label: "Weekend Utilization", value: "92%" },
  { label: "Customer Satisfaction", value: "4.8/5" },
];
// eslint-disable-next-line no-unused-vars
const PEAK_QUICK_ACTIONS = [
  { href: "/owner/bookings", label: "View Bookings" },
  { href: "/owner/slots", label: "Manage Availability" },
  { href: "/owner/revenue", label: "View Earnings" },
  { href: "/owner/add-turf", label: "Create Venue" },
];

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

function validOptions(values = [], options) {
  return [...new Set(values)].filter((value) => options.includes(value));
}

function titleCase(value = "") {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function approvalStatus(user, dashboard = {}) {
  const value = dashboard.approvalStatus || user?.approvalStatus || user?.accountStatus || "ACTIVE";
  const upper = String(value).toUpperCase();
  if (["ACTIVE", "PENDING", "REJECTED", "SUSPENDED"].includes(upper)) return upper;
  if (String(value).toLowerCase() === "active") return "ACTIVE";
  if (String(value).toLowerCase() === "pending") return "PENDING";
  if (String(value).toLowerCase() === "rejected") return "REJECTED";
  if (String(value).toLowerCase() === "suspended") return "SUSPENDED";
  return "ACTIVE";
}

function isOwnerPending(user, dashboard = {}) {
  return approvalStatus(user, dashboard) === "PENDING";
}

function OwnerApprovalBanner({ dashboard = {} }) {
  const { user } = useAuth();
  if (!isOwnerPending(user, dashboard)) return null;

  return (
    <Card className="mb-6">
      <CardContent>
        <Badge variant="warning">Pending Approval</Badge>
        <p className="mt-3 font-black text-ink">Your application is awaiting approval.</p>
        <p className="mt-1 text-sm text-ink-muted">Add Venue, Availability, Bookings, and Revenue actions are disabled until approval.</p>
      </CardContent>
    </Card>
  );
}

function VenueStatusBadge({ status }) {
  const statusValue = String(status || "PENDING").toUpperCase();
  const variants = {
    DRAFT: "default",
    LIVE: "success",
    PENDING: "warning",
    REJECTED: "danger",
    SUSPENDED: "danger",
  };
  const labels = {
    DRAFT: "Draft",
    LIVE: "Live",
    PENDING: "Pending Approval",
    REJECTED: "Rejected",
    SUSPENDED: "Suspended",
  };

  return <Badge variant={variants[statusValue] || "warning"}>{labels[statusValue] || status}</Badge>;
}

function OptionGroup({ options, selected, onToggle }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {options.map((option) => {
        const isSelected = selected.includes(option);

        return (
          <label
            className="focus-within:ring-2 focus-within:ring-primary/30 flex items-center gap-2 rounded-lg border border-surface-outline bg-white px-3 py-3 text-sm font-bold text-ink"
            key={option}
          >
            <input checked={isSelected} className="h-4 w-4 accent-primary" onChange={() => onToggle(option)} type="checkbox" />
            {option}
          </label>
        );
      })}
    </div>
  );
}

function timeToMinutes(time) {
  const [hours, minutes] = String(time).split(":").map(Number);
  return hours * 60 + minutes;
}

function formatTime(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function dayKeyForDate(dateValue) {
  const date = new Date(`${dateValue}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  return UTC_DAY_KEYS[date.getUTCDay()];
}

function buildPreviewSlots(startTime, endTime, slotMinutes, startIntervalMinutes = 30) {
  const output = [];
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  const duration = Number(slotMinutes) || 60;
  const interval = Number(startIntervalMinutes) || 30;

  for (let minute = start; minute + duration <= end; minute += interval) {
    output.push({
      endTime: formatTime(minute + duration),
      reason: "Available",
      startTime: formatTime(minute),
      status: "available",
    });
  }

  return output;
}

function recurringSummary(selectedDays = {}) {
  const selected = DAY_KEYS.filter((day) => selectedDays[day]);
  const weekdays = WEEKDAY_KEYS.every((day) => selectedDays[day]);
  const weekends = WEEKEND_KEYS.every((day) => selectedDays[day]);

  if (weekdays && weekends) return "Mon-Fri, Sat-Sun";
  if (weekdays) return "Mon-Fri";
  if (weekends) return "Sat-Sun";

  return selected.length
    ? selected.map((day) => day.slice(0, 3).replace(/^\w/, (letter) => letter.toUpperCase())).join(", ")
    : "No recurring days";
}

function sumAmounts(items = []) {
  return items.reduce((sum, item) => sum + Number(item.amount || item.totalAmount || item.paid || 0), 0);
}

function paymentRevenue(payment = {}) {
  return Number(payment.ownerRevenue ?? payment.amount ?? 0);
}

function bookingRevenue(booking = {}) {
  return Number(booking.paid || booking.totalAmount || booking.amount || 0);
}

function isPaidPayment(payment = {}) {
  return String(payment.paymentStatus || payment.status || "").toLowerCase() === "paid";
}

function percent(part, total) {
  return total ? `${Math.round((part / total) * 100)}%` : "0%";
}

function groupPaymentsByVenue(payments = []) {
  const totals = new Map();

  payments.forEach((payment) => {
    const venue = payment.venue || payment.bookingId?.turfId?.name || "Venue";
    totals.set(venue, (totals.get(venue) || 0) + Number(payment.amount || 0));
  });

  return [...totals.entries()]
    .sort((first, second) => second[1] - first[1])
    .slice(0, 3)
    .map(([venue, amount]) => ({ amount, venue }));
}

function groupPaymentsByMethod(payments = []) {
  const totals = new Map();

  payments.forEach((payment) => {
    const method = payment.paymentMethod || "Mock Payment";
    totals.set(method, (totals.get(method) || 0) + Number(payment.amount || 0));
  });

  return ["Cash", "UPI", "Card", "Mock Payment"].map((method) => ({
    amount: totals.get(method) || 0,
    method,
  }));
}

function buildSixMonthRevenueSeries(monthlyEarnings = []) {
  const earningsByMonth = new Map(
    monthlyEarnings.map((item) => [`${item.year}-${item.month}`, item]),
  );
  const today = new Date();

  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 5 + index, 1));
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1;
    const item = earningsByMonth.get(`${year}-${month}`);

    return {
      name: date.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }),
      bookings: Number(item?.payments || 0),
      previous: Number(item?.previous || 0),
      revenue: Number(item?.revenue || 0),
    };
  });
}

function buildPaymentRevenueSeries(payments = []) {
  const today = new Date();
  const totals = new Map();

  payments.forEach((payment) => {
    const paidAt = new Date(payment.paidAt || payment.createdAt || payment.date);
    if (Number.isNaN(paidAt.getTime())) return;

    const key = `${paidAt.getUTCFullYear()}-${paidAt.getUTCMonth() + 1}`;
    const current = totals.get(key) || { bookings: 0, revenue: 0 };
    totals.set(key, {
      bookings: current.bookings + 1,
      revenue: current.revenue + paymentRevenue(payment),
    });
  });

  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 5 + index, 1));
    const key = `${date.getUTCFullYear()}-${date.getUTCMonth() + 1}`;
    const item = totals.get(key) || {};

    return {
      bookings: Number(item.bookings || 0),
      name: date.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }),
      previous: 0,
      revenue: Number(item.revenue || 0),
    };
  });
}

function hasSeriesActivity(series = []) {
  return series.some((item) => Number(item.revenue || 0) > 0 || Number(item.bookings || item.payments || 0) > 0);
}

function peakHoursFromBookings(bookings = []) {
  const counts = new Map();

  bookings.forEach((booking) => {
    const start = booking.slotStartTime || String(booking.time || "").split("-")[0]?.trim();
    if (!start) return;
    const hour = Number(start.split(":")[0]);
    if (Number.isNaN(hour)) return;
    const label = `${String(hour).padStart(2, "0")}:00 - ${String(hour + 1).padStart(2, "0")}:00`;
    counts.set(label, (counts.get(label) || 0) + 1);
  });

  return [...counts.entries()]
    .sort((first, second) => second[1] - first[1])
    .slice(0, 3)
    .map(([label, count]) => ({ label, value: `${count} bookings` }));
}

function bookingTurfId(booking = {}) {
  return booking.turf?.id || booking.venueId || booking.turfId?._id || booking.turfId || "";
}

function bookingDateValue(booking = {}) {
  const date = new Date(booking.dateValue || booking.bookingDate || booking.date);
  return Number.isNaN(date.getTime()) ? null : date;
}

function bookingTimeValue(booking = {}) {
  return booking.slotStartTime || String(booking.time || "").split("-")[0]?.trim() || "";
}

function bookingStartDateTime(booking = {}) {
  const date = bookingDateValue(booking);
  const time = bookingTimeValue(booking);
  if (!date) return null;

  const [hours = 0, minutes = 0] = time.split(":").map(Number);
  const output = new Date(date);

  if (!Number.isNaN(hours)) output.setHours(hours, Number.isNaN(minutes) ? 0 : minutes, 0, 0);

  return output;
}

function displayBookingTime(booking = {}) {
  const time = bookingTimeValue(booking);
  const [hours, minutes = 0] = time.split(":").map(Number);

  if (Number.isNaN(hours)) return time || "6:00 PM";

  return new Date(2000, 0, 1, hours, minutes).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function sameDate(firstDate, secondDate) {
  return firstDate && secondDate && firstDate.toDateString() === secondDate.toDateString();
}

function topVenueByRevenue(payments = []) {
  return groupPaymentsByVenue(payments)[0]?.venue || "";
}

function topBookingDay(bookings = []) {
  const days = new Map();

  bookings.forEach((booking) => {
    const date = bookingDateValue(booking);
    if (!date) return;
    const day = date.toLocaleDateString("en-US", { weekday: "long" });
    days.set(day, (days.get(day) || 0) + 1);
  });

  return [...days.entries()].sort((first, second) => second[1] - first[1])[0]?.[0] || "Saturday";
}

function bookingsInWindow(bookings = [], daysBack) {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - daysBack);

  return bookings.filter((booking) => {
    const date = bookingDateValue(booking);
    return date && date >= start && date <= now;
  }).length;
}

function hourlyBookingCounts(bookings = []) {
  const counts = new Map();

  bookings.forEach((booking) => {
    const start = bookingTimeValue(booking);
    if (!start) return;

    const hour = Number(start.split(":")[0]);
    if (Number.isNaN(hour)) return;

    const label = `${String(hour).padStart(2, "0")}:00 - ${String(hour + 1).padStart(2, "0")}:00`;
    counts.set(label, (counts.get(label) || 0) + 1);
  });

  return [...counts.entries()].sort((first, second) => second[1] - first[1]);
}

// eslint-disable-next-line no-unused-vars
function buildPeakBookingSummary({ bookings = [], payments = [] }) {
  if (!bookings.length) return PROTOTYPE_PEAK_BOOKING_SUMMARY;

  const today = new Date();
  const todaysBookings = bookings.filter((booking) => sameDate(bookingDateValue(booking), today));
  const todaysRevenue = todaysBookings.reduce((sum, booking) => sum + bookingRevenue(booking), 0)
    || payments
      .filter((payment) => sameDate(new Date(payment.paidAt || payment.createdAt || payment.date), today))
      .reduce((sum, payment) => sum + paymentRevenue(payment), 0);
  const upcoming = bookings.filter((booking) => {
    const date = bookingStartDateTime(booking);
    return date && date >= today && ["confirmed", "pending"].includes(booking.statusValue);
  }).length;
  const completed = bookings.filter((booking) => booking.statusValue === "completed").length;
  const cancelled = bookings.filter((booking) => booking.statusValue === "cancelled").length;

  return [
    { label: "Today's Bookings", value: String(todaysBookings.length) },
    { label: "Today's Revenue", value: currency(todaysRevenue) },
    { label: "Upcoming", value: String(upcoming) },
    { label: "Completed", value: String(completed) },
    { label: "Cancelled", value: String(cancelled) },
  ];
}

// eslint-disable-next-line no-unused-vars
function buildPeakTimeAnalysis({ bookings = [], turfs = [] }) {
  if (!bookings.length) return PROTOTYPE_PEAK_TIME_ANALYSIS;

  const hourlyCounts = hourlyBookingCounts(bookings);
  const venueCounts = new Map();

  bookings.forEach((booking) => {
    const venue = booking.venue || booking.turf?.name || "TURFX Venue";
    venueCounts.set(venue, (venueCounts.get(venue) || 0) + 1);
  });

  return [
    { label: "Most Popular Time", value: hourlyCounts[0]?.[0] || PROTOTYPE_PEAK_TIME_ANALYSIS[0].value },
    { label: "Least Busy Time", value: hourlyCounts.at(-1)?.[0] || PROTOTYPE_PEAK_TIME_ANALYSIS[1].value },
    { label: "Most Popular Day", value: topBookingDay(bookings) },
    {
      label: "Highest Utilization",
      value: [...venueCounts.entries()].sort((first, second) => second[1] - first[1])[0]?.[0]
        || turfs[0]?.name
        || PROTOTYPE_PEAK_TIME_ANALYSIS[3].value,
    },
  ];
}

// eslint-disable-next-line no-unused-vars
function buildUpcomingBookingRows(bookings = []) {
  if (!bookings.length) return PROTOTYPE_UPCOMING_BOOKINGS;

  const now = new Date();
  const rows = bookings
    .map((booking) => ({ booking, startsAt: bookingStartDateTime(booking) }))
    .filter(({ booking, startsAt }) => startsAt && startsAt >= now && ["confirmed", "pending"].includes(booking.statusValue))
    .sort((first, second) => first.startsAt - second.startsAt)
    .slice(0, 5)
    .map(({ booking }) => ({
      customerName: booking.user?.name || booking.customerName || "Customer",
      time: displayBookingTime(booking),
      venue: booking.venue || booking.turf?.name || "TURFX Venue",
    }));

  return rows.length ? rows : PROTOTYPE_UPCOMING_BOOKINGS;
}

// eslint-disable-next-line no-unused-vars
function buildTopVenueRows({ bookings = [], payments = [], turfs = [] }) {
  if (!bookings.length && !payments.length) return PROTOTYPE_TOP_VENUE_ROWS;

  const venues = new Map();

  turfs.forEach((turf) => {
    venues.set(turf.name, { bookings: 0, revenue: 0, venue: turf.name });
  });

  bookings.forEach((booking) => {
    const venue = booking.venue || booking.turf?.name || "TURFX Venue";
    const current = venues.get(venue) || { bookings: 0, revenue: 0, venue };
    venues.set(venue, {
      ...current,
      bookings: current.bookings + 1,
      revenue: current.revenue + bookingRevenue(booking),
    });
  });

  payments.filter(isPaidPayment).forEach((payment) => {
    const venue = payment.venue || payment.bookingId?.turfId?.name || "TURFX Venue";
    const current = venues.get(venue) || { bookings: 0, revenue: 0, venue };
    venues.set(venue, {
      ...current,
      revenue: current.revenue || paymentRevenue(payment),
    });
  });

  const rows = [...venues.values()]
    .filter((venue) => venue.bookings || venue.revenue)
    .sort((first, second) => second.revenue - first.revenue || second.bookings - first.bookings)
    .slice(0, 3);

  return rows.length ? rows : PROTOTYPE_TOP_VENUE_ROWS;
}

// eslint-disable-next-line no-unused-vars
function buildPeakPerformanceInsights({ bookings = [], payments = [] }) {
  if (!bookings.length && !payments.length) return PROTOTYPE_PERFORMANCE_INSIGHTS;

  const completed = bookings.filter((booking) => booking.statusValue === "completed").length;
  const weekendBookings = bookings.filter((booking) => {
    const date = bookingDateValue(booking);
    return date && [0, 6].includes(date.getDay());
  }).length;
  const totalRevenue = payments.filter(isPaidPayment).reduce((sum, payment) => sum + paymentRevenue(payment), 0)
    || bookings.reduce((sum, booking) => sum + bookingRevenue(booking), 0);
  const recentBookings = bookingsInWindow(bookings, 7);
  const monthlyBookings = Math.max(bookingsInWindow(bookings, 30), bookings.length);
  const bookingGrowth = monthlyBookings ? Math.round((recentBookings / monthlyBookings) * 100) : 0;
  const revenueGrowth = totalRevenue ? Math.min(38, Math.max(8, Math.round(totalRevenue / 1200))) : 0;

  return [
    { label: "Booking Growth", value: `+${bookingGrowth || 12}%` },
    { label: "Revenue Growth", value: `+${revenueGrowth || 18}%` },
    { label: "Weekend Utilization", value: percent(weekendBookings, Math.max(1, bookings.length)) },
    { label: "Customer Satisfaction", value: completed ? "4.8/5" : PROTOTYPE_PERFORMANCE_INSIGHTS[3].value },
  ];
}

function buildRecentTransactions(payments = [], hasRevenueData = false) {
  const source = hasRevenueData && payments.length ? payments : PROTOTYPE_DASHBOARD_TRANSACTIONS;

  return source.slice(0, 4).map((payment, index) => ({
    amount: paymentRevenue(payment),
    customerName: payment.customerName || payment.customer?.name || payment.userId?.name || "Customer",
    id: payment.paymentId || payment.transactionId || payment.id || `TXN00${index + 1}`,
    status: titleCase(String(payment.paymentStatus || payment.status || "Paid")),
    venue: payment.venue || payment.bookingId?.turfId?.name || "TURFX Venue",
  }));
}

function buildUpcomingPayouts(payments = [], hasRevenueData = false) {
  if (!hasRevenueData) return PROTOTYPE_UPCOMING_PAYOUTS;

  const totals = new Map();

  payments.filter(isPaidPayment).forEach((payment) => {
    const venue = payment.venue || payment.bookingId?.turfId?.name || "TURFX Venue";
    totals.set(venue, (totals.get(venue) || 0) + paymentRevenue(payment));
  });

  const payoutDates = ["Tomorrow", "2 Days", "Friday"];
  const payouts = [...totals.entries()]
    .sort((first, second) => second[1] - first[1])
    .slice(0, 3)
    .map(([venue, amount], index) => ({
      amount,
      expectedDate: payoutDates[index] || "This Week",
      venue,
    }));

  return payouts.length ? payouts : PROTOTYPE_UPCOMING_PAYOUTS;
}

function buildRevenueForecast({ bookings = [], dashboard = {}, hasRevenueData = false, payments = [], turfs = [] }) {
  if (!hasRevenueData) return PROTOTYPE_REVENUE_FORECAST;

  const paidPayments = payments.filter(isPaidPayment);
  const upcomingBookings = bookings.filter((booking) => ["confirmed", "pending"].includes(booking.statusValue));
  const averageBookingValue = paidPayments.length
    ? paidPayments.reduce((sum, payment) => sum + paymentRevenue(payment), 0) / paidPayments.length
    : Number(dashboard.revenue || 0) / Math.max(1, Number(dashboard.totalBookings || bookings.length || 1));
  const upcomingBookingsRevenue = upcomingBookings.reduce((sum, booking) => sum + Number(booking.paid || booking.totalAmount || 0), 0);
  const weeklyRevenue = Number(dashboard.weeklyRevenue || 0);
  const venueUtilization = turfs.length ? percent(bookings.length, turfs.length * 12) : "0%";

  return [
    { label: "Potential Revenue This Week", value: currency(weeklyRevenue + upcomingBookingsRevenue) },
    { label: "Upcoming Bookings Revenue", value: currency(upcomingBookingsRevenue) },
    { label: "Potential Earnings", value: currency(Number(dashboard.pendingRevenue || 0) + weeklyRevenue) },
    { label: "Expected Bookings", value: String(Math.max(upcomingBookings.length, Number(dashboard.totalBookings || 0))) },
    { label: "Average Booking Value", value: currency(averageBookingValue || 0) },
    { label: "Peak Booking Day", value: topBookingDay(bookings) },
    { label: "Venue Utilization", value: venueUtilization },
    { label: "Top Venue", value: topVenueByRevenue(paidPayments) || turfs[0]?.name || "TURFX Venue" },
  ];
}

function buildVenueHighlights({ bookings = [], hasRevenueData = false, payments = [], turfs = [] }) {
  if (!hasRevenueData && !bookings.length) return PROTOTYPE_VENUE_HIGHLIGHTS;

  const bookingCounts = new Map();
  const revenueTotals = new Map();

  turfs.forEach((turf) => {
    bookingCounts.set(turf.name, 0);
    revenueTotals.set(turf.name, 0);
  });

  bookings.forEach((booking) => {
    const venue = booking.venue || booking.turf?.name || "TURFX Venue";
    bookingCounts.set(venue, (bookingCounts.get(venue) || 0) + 1);
  });

  payments.filter(isPaidPayment).forEach((payment) => {
    const venue = payment.venue || payment.bookingId?.turfId?.name || "TURFX Venue";
    revenueTotals.set(venue, (revenueTotals.get(venue) || 0) + paymentRevenue(payment));
  });

  const bookingsRanked = [...bookingCounts.entries()].sort((first, second) => second[1] - first[1]);
  const revenueRanked = [...revenueTotals.entries()].sort((first, second) => second[1] - first[1]);

  return [
    { label: "Most Booked Venue", value: bookingsRanked[0]?.[0] || PROTOTYPE_VENUE_HIGHLIGHTS[0].value },
    { label: "Least Booked Venue", value: bookingsRanked.filter((item) => item[1] > 0).at(-1)?.[0] || PROTOTYPE_VENUE_HIGHLIGHTS[1].value },
    { label: "Highest Revenue Venue", value: revenueRanked[0]?.[0] || PROTOTYPE_VENUE_HIGHLIGHTS[2].value },
    { label: "Fastest Growing Venue", value: bookingsRanked[1]?.[0] || bookingsRanked[0]?.[0] || PROTOTYPE_VENUE_HIGHLIGHTS[3].value },
  ];
}

function buildBookingInsights(bookings = [], turfs = []) {
  if (!bookings.length) return PROTOTYPE_BOOKING_INSIGHTS;

  const completed = bookings.filter((booking) => booking.statusValue === "completed").length;
  const cancelled = bookings.filter((booking) => booking.statusValue === "cancelled").length;
  const peakHour = peakHoursFromBookings(bookings)[0]?.label || PROTOTYPE_BOOKING_INSIGHTS[0].value;
  const sports = new Map();

  bookings.forEach((booking) => {
    const sport = booking.turf?.sport || turfs.find((turf) => turf.id === bookingTurfId(booking))?.sport;
    if (sport) sports.set(sport, (sports.get(sport) || 0) + 1);
  });

  const popularSport = [...sports.entries()].sort((first, second) => second[1] - first[1])[0]?.[0] || turfs[0]?.sport || "Football";

  return [
    { label: "Peak Hour", value: peakHour },
    { label: "Most Popular Sport", value: popularSport },
    { label: "Bookings This Week", value: String(bookingsInWindow(bookings, 7)) },
    { label: "Bookings This Month", value: String(bookingsInWindow(bookings, 30)) },
    { label: "Completion Rate", value: percent(completed, bookings.length) },
    { label: "Cancellation Rate", value: percent(cancelled, bookings.length) },
  ];
}

function MetricSummaryCard({ title, items = [] }) {
  return (
    <Card>
      <CardContent>
        <h2 className="text-2xl font-black">{title}</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {items.map((item) => (
            <div className="rounded-xl bg-surface-low p-3" key={item.label}>
              <p className="text-xs font-bold uppercase tracking-wide text-ink-muted">{item.label}</p>
              <p className="mt-1 font-black text-ink">{item.value}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function TransactionPreviewCard({ rows = [] }) {
  return (
    <Card>
      <CardContent>
        <h2 className="text-2xl font-black">Recent Transactions</h2>
        <div className="mt-5 space-y-3">
          {rows.map((transaction) => (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-low p-3" key={transaction.id}>
              <div>
                <p className="font-black">{transaction.id}</p>
                <p className="text-sm text-ink-muted">{transaction.customerName} - {transaction.venue}</p>
              </div>
              <div className="text-right">
                <p className="font-black text-primary">{currency(transaction.amount)}</p>
                <Badge variant="success">{transaction.status}</Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function PayoutPreviewCard({ rows = [] }) {
  return (
    <Card>
      <CardContent>
        <h2 className="text-2xl font-black">Upcoming Payouts</h2>
        <div className="mt-5 space-y-3">
          {rows.map((payout) => (
            <div className="grid grid-cols-[1fr_auto] gap-3 rounded-xl bg-surface-low p-3" key={`${payout.venue}-${payout.expectedDate}`}>
              <div>
                <p className="font-black">{payout.venue}</p>
                <p className="text-sm text-ink-muted">Expected {payout.expectedDate}</p>
              </div>
              <p className="font-black text-primary">{currency(payout.amount)}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function PerformanceBars({ bookings = [], turfs = [] }) {
  const maxBookings = Math.max(
    1,
    ...turfs.map((turf) => bookings.filter((booking) => bookingTurfId(booking) === turf.id).length),
  );

  return (
    <Card>
      <CardContent>
        <h2 className="text-2xl font-black">Venue Performance</h2>
        <div className="mt-6 space-y-5">
          {turfs.map((turf) => {
            const turfBookings = bookings.filter((booking) => bookingTurfId(booking) === turf.id);
            const utility = Math.round((turfBookings.length / maxBookings) * 100);
            const revenue = turfBookings
              .filter((booking) => booking.paymentStatus === "paid")
              .reduce((sum, booking) => sum + booking.paid, 0);
            return (
            <div key={turf.id}>
              <div className="mb-2 flex items-end justify-between">
                <div>
                  <p className="font-black">{turf.name}</p>
                  <p className="text-sm text-ink-muted">{currency(revenue)} Revenue</p>
                </div>
                <p className="font-black text-primary">{utility}% Utility</p>
              </div>
              <div className="h-2 rounded-full bg-surface-high">
                <div className="h-full rounded-full bg-primary" style={{ width: `${utility}%` }} />
              </div>
            </div>
          )})}
          {!turfs.length && <p className="text-sm text-ink-muted">Add a venue to see performance.</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export function OwnerDashboardPage() {
  const { user } = useAuth();
  const { data: dashboard = {} } = useOwnerDashboard();
  const { data: bookings = [] } = useBookings();
  const { data: payments = [] } = usePayments();
  const { data: turfs = [] } = useMyTurfs();
  const ownerPending = isOwnerPending(user, dashboard);
  const paidPayments = payments.filter(isPaidPayment);
  const monthlySeries = buildSixMonthRevenueSeries(dashboard.monthlyEarnings || []);
  const paymentSeries = buildPaymentRevenueSeries(paidPayments);
  const hasRevenueData = paidPayments.length > 0 || hasSeriesActivity(monthlySeries);
  const chartData = hasRevenueData
    ? (hasSeriesActivity(monthlySeries) ? monthlySeries : paymentSeries)
    : PROTOTYPE_REVENUE_SERIES;
  const dashboardRevenue = hasRevenueData
    ? Number(dashboard.revenue || paidPayments.reduce((sum, payment) => sum + paymentRevenue(payment), 0))
    : 12000;
  const recentTransactions = buildRecentTransactions(paidPayments, hasRevenueData);
  const upcomingPayouts = buildUpcomingPayouts(paidPayments, hasRevenueData);
  const revenueForecast = buildRevenueForecast({ bookings, dashboard, hasRevenueData, payments: paidPayments, turfs });
  const venueHighlights = buildVenueHighlights({ bookings, hasRevenueData, payments: paidPayments, turfs });
  const bookingInsights = buildBookingInsights(bookings, turfs);
  const perSportRevenue = (dashboard.perSportRevenue || []).map((item) => ({
    label: item.sport,
    value: currency(item.revenue || 0),
  }));
  const bookingBreakdown = dashboard.bookingBreakdown || {};
  const bookingStatusSummary = [
    { label: "Today's Bookings", value: String(bookingBreakdown.today ?? 0) },
    { label: "Upcoming Bookings", value: String(bookingBreakdown.upcoming ?? 0) },
    { label: "Live Bookings", value: String(bookingBreakdown.live ?? 0) },
    { label: "Cancelled Bookings", value: String(bookingBreakdown.cancelled ?? 0) },
  ];
  const ownerKpis = [
    { label: "Total Revenue", value: currency(dashboardRevenue), trend: hasRevenueData ? "Paid bookings" : "Preview forecast", icon: "Banknote" },
    { label: "Bookings", value: String(dashboard.totalBookings || 0), trend: "All statuses", icon: "ClipboardList" },
    { label: "Venues", value: String(dashboard.totalTurfs || 0), trend: "Owned venues", icon: "Landmark" },
    { label: "Pending", value: String(bookings.filter((item) => item.statusValue === "pending").length), trend: "Needs review", icon: "Clock" },
  ];
  const today = new Date().toISOString().slice(0, 10);
  const matches = bookings
    .filter((booking) => String(booking.dateValue || "").slice(0, 10) === today)
    .slice(0, 4);

  return (
    <div>
      <PageTitle
        action={
          <div className="flex gap-3">
            <Button as={Link} to="/owner/analytics" variant="outline">
              <CalendarDays size={16} />
              Last 30 Days
            </Button>
            {ownerPending ? (
              <Button disabled>Quick Actions</Button>
            ) : (
              <Button as={Link} to="/owner/add-turf">Quick Actions</Button>
            )}
            <Button as={Link} aria-label="Manage venues" size="icon" to="/owner/turfs" variant="outline">
              <MoreVertical />
            </Button>
          </div>
        }
        eyebrow="Turf Owner Workspace"
        subtitle="Venue performance, bookings, earnings, and availability across your portfolio."
        title="Turf Owner Dashboard"
      />
      <OwnerApprovalBanner dashboard={dashboard} />
      <div className="metric-grid">
        {ownerKpis.map((kpi, index) => (
          <StatsCard delay={index * 0.06} icon={kpi.icon} key={kpi.label} label={kpi.label} trend={kpi.trend} value={kpi.value} />
        ))}
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_360px]">
        <ChartPanel data={chartData} subtitle="Paid booking revenue by month" title="Revenue Trends" type="line" />
        <Card>
          <CardContent>
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black">Today&apos;s Bookings</h2>
              <Badge variant="primary">LIVE</Badge>
            </div>
            <div className="mt-6 space-y-6">
              {matches.map((booking, index) => (
                <div className="flex gap-4" key={booking.id}>
                  <div className="w-14 shrink-0 text-right font-black">{booking.time}</div>
                  <div className="min-w-0 flex-1">
                    <p className="font-black">{booking.venue}</p>
                    <p className="text-sm text-ink-muted">{booking.user?.name || "User"} - {booking.status}</p>
                  </div>
                  <span className={`mt-2 h-2.5 w-2.5 rounded-full ${index === 0 ? "bg-accent" : "bg-surface-outline"}`} />
                </div>
              ))}
              {!matches.length && (
                <div className="rounded-xl bg-surface-low p-4 text-center">
                  <p className="font-black">No bookings today</p>
                  <p className="mt-1 text-sm text-ink-muted">Your next reservations remain available in the full schedule.</p>
                </div>
              )}
            </div>
            <Button as={Link} className="mt-7 w-full" to="/owner/calendar" variant="ghost">
              View Full Schedule
            </Button>
          </CardContent>
        </Card>
      </div>
      {!hasRevenueData && (
        <Card className="mt-6">
          <CardContent>
            <p className="font-black text-ink">Your venues are ready for bookings.</p>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {PROTOTYPE_SUGGESTED_ACTIONS.map((action) => (
                <div className="rounded-xl bg-surface-low p-3 text-sm font-bold" key={action}>{action}</div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_0.8fr]">
        <div className="space-y-6">
          <MetricSummaryCard items={revenueForecast} title="Revenue Forecast" />
          <TransactionPreviewCard rows={recentTransactions} />
        </div>
        <div className="space-y-6">
          <PayoutPreviewCard rows={upcomingPayouts} />
          <MetricSummaryCard items={bookingStatusSummary} title="Booking Status" />
          {perSportRevenue.length > 0 && <MetricSummaryCard items={perSportRevenue} title="Per Sport Revenue" />}
          <MetricSummaryCard items={bookingInsights} title="Booking Insights" />
        </div>
      </div>
      <div className="mt-6">
        <MetricSummaryCard items={venueHighlights} title="Venue Performance Highlights" />
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
        <PerformanceBars bookings={bookings} turfs={turfs} />
      </div>
    </div>
  );
}

export function MyTurfsPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const { data: allTurfs = [] } = useMyTurfs();
  const deleteTurf = useDeleteTurf();
  const ownerPending = isOwnerPending(user);
  const search = (searchParams.get("search") || "").trim().toLowerCase();
  const turfs = allTurfs.filter((turf) =>
    !search || [turf.name, turf.city, turf.location, turf.format].some((value) => String(value || "").toLowerCase().includes(search)),
  );
  return (
    <div>
      <PageTitle
        action={
          ownerPending ? (
            <Button disabled>
              <Plus size={16} />
              Add New Venue
            </Button>
          ) : (
            <Button as={Link} to="/owner/add-turf">
              <Plus size={16} />
              Add New Venue
            </Button>
          )
        }
        eyebrow="Turf Owner Workspace"
        subtitle="Manage inventory, publish status, pricing, and performance."
        title="My Venues"
      />
      <OwnerApprovalBanner />
      <div className="grid gap-5 lg:grid-cols-3">
        {turfs.map((turf) => (
          <TurfCard actionHref={`/owner/turfs/${turf.id}`} actionLabel="Manage" href={`/owner/turfs/${turf.id}`} key={turf.id} turf={turf} />
        ))}
      </div>
      {!turfs.length && (
        <Card>
          <CardContent className="text-center">
            <h2 className="text-xl font-black">{search ? "No matching venues" : "No venues yet"}</h2>
            <p className="mt-2 text-sm text-ink-muted">
              {search ? "Try a venue name, city, or sport." : "Submit your first venue to begin the approval flow."}
            </p>
            {!search && (
              ownerPending
                ? <Button className="mt-5" disabled>Add Venue</Button>
                : <Button as={Link} className="mt-5" to="/owner/add-turf">Add Venue</Button>
            )}
          </CardContent>
        </Card>
      )}
      <div className="mt-6">
        <DataTable
          columns={["Turf", "Sport", "Price", "Status", "Actions"]}
          rows={turfs.map((turf) => [
            turf.name,
            turf.sport,
            currency(turf.price),
            <VenueStatusBadge key={`${turf.id}-status`} status={turf.statusValue} />,
            <div className="flex gap-2" key={`${turf.id}-actions`}>
              <Button as={Link} size="sm" to={`/owner/add-turf?edit=${turf.id}`} variant="outline">Edit</Button>
              <Button
                onClick={() => {
                  if (window.confirm(`Delete ${turf.name}? This cannot be undone.`)) deleteTurf.mutate(turf.id);
                }}
                size="sm"
                variant="danger"
              >
                Delete
              </Button>
            </div>,
          ])}
        />
      </div>
    </div>
  );
}

export function TurfDetailsOwnerPage() {
  const { id } = useParams();
  const { data: turf } = useTurf(id);
  const { data: bookings = [] } = useBookings();

  if (!turf) {
    return <div className="py-16 text-center text-ink-muted">Loading venue...</div>;
  }
  return (
    <div>
      <PageTitle
        action={<Button as={Link} to={`/owner/add-turf?edit=${turf.id}`}>Edit Venue</Button>}
        eyebrow="Venue Details"
        subtitle="Operational summary, gallery, pricing, and live rules."
        title={turf.name}
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card className="overflow-hidden">
          <img alt={turf.name} className="h-80 w-full object-cover" onError={handleImageError} src={turf.image} />
          <CardContent>
            <h2 className="text-2xl font-black">Published Experience</h2>
            <p className="mt-3 leading-7 text-ink-muted">
              {turf.description}
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-4">
              {turf.amenities.map((amenity) => (
                <Badge key={amenity} variant="primary">{amenity}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
        <PerformanceBars bookings={bookings} turfs={[turf]} />
      </div>
    </div>
  );
}

export function AddTurfWizardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");
  const { data: editingTurf } = useTurf(editId);
  const createTurf = useCreateTurf();
  const updateTurf = useUpdateTurf();
  const ownerPending = isOwnerPending(user);
  const [message, setMessage] = useState("");
  const [imagePreviews, setImagePreviews] = useState([]);
  const [form, setForm] = useState({
    address: "",
    amenities: [],
    city: "",
    description: "",
    location: "",
    name: "",
    pricePerHour: "",
    sportRates: {},
    sportsSupported: [],
    state: "",
  });

  useEffect(() => {
    if (!editingTurf) return;
    setForm({
      address: editingTurf.address || "",
      amenities: validOptions(editingTurf.amenities || [], TURF_AMENITY_OPTIONS),
      city: editingTurf.city || "",
      description: editingTurf.description || "",
      location: editingTurf.location || "",
      name: editingTurf.name || "",
      pricePerHour: String(editingTurf.price || ""),
      sportRates: editingTurf.sportRates || {},
      sportsSupported: validOptions(editingTurf.sportsSupported || [], TURF_SPORT_OPTIONS),
      state: editingTurf.state || "",
    });
  }, [editingTurf]);

  function update(field) {
    return (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  }

  function toggleOption(field, option) {
    setForm((current) => {
      const selected = current[field];
      const nextSelected = selected.includes(option) ? selected.filter((item) => item !== option) : [...selected, option];
      const nextSportRates = field === "sportsSupported" && !selected.includes(option)
        ? { ...current.sportRates, [option]: current.sportRates[option] || current.pricePerHour }
        : current.sportRates;
      return {
        ...current,
        [field]: nextSelected,
        sportRates: nextSportRates,
      };
    });
  }

  function updateSportRate(sport) {
    return (event) => setForm((current) => ({
      ...current,
      sportRates: {
        ...current.sportRates,
        [sport]: event.target.value,
      },
    }));
  }

  async function submitVenue(event) {
    event.preventDefault();
    setMessage("");

    if (ownerPending) {
      setMessage("Your account is pending approval from Platform Owner.");
      return;
    }

    const sportsSupported = validOptions(form.sportsSupported, TURF_SPORT_OPTIONS);
    const amenities = validOptions(form.amenities, TURF_AMENITY_OPTIONS);

    if (!sportsSupported.length) {
      setMessage("Please select at least one sport.");
      return;
    }

    if (!amenities.length) {
      setMessage("Please select at least one amenity.");
      return;
    }

    const cleanPayload = {
      ...form,
      amenities,
      sportRates: Object.fromEntries(
        sportsSupported.map((sport) => [sport, Number(form.sportRates[sport] || form.pricePerHour || 0)]),
      ),
      sportsSupported,
    };

    console.info("[turfx] venue payload", JSON.stringify(cleanPayload));

    const payload = new FormData();
    Object.entries(cleanPayload).forEach(([key, value]) => {
      if (key === "sportsSupported" || key === "amenities" || key === "sportRates") {
        payload.append(key, JSON.stringify(value));
      } else {
        payload.append(key, value);
      }
    });
    Array.from(event.currentTarget.elements.images?.files || []).forEach((file) => payload.append("images", file));

    try {
      if (editId) {
        await updateTurf.mutateAsync({ id: editId, payload });
      } else {
        await createTurf.mutateAsync(payload);
      }
      notify(editId ? "Venue updated successfully." : "Venue submitted for approval successfully.");
      navigate("/owner/turfs", { replace: true });
    } catch (error) {
      setMessage(error.response?.data?.message || error.message);
    }
  }

  return (
    <div>
      <PageTitle
        eyebrow="Add Venue"
        subtitle="All publishing steps from the reference flow are represented and ready for API submission."
        title={editId ? "Edit venue" : "Launch a new venue"}
      />
      <OwnerApprovalBanner />
      <Stepper current={3} steps={addTurfSteps} />
      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_360px]">
        <Card>
          <CardContent>
            <form className="space-y-8" onSubmit={submitVenue}>
            <section>
              <h2 className="text-2xl font-black">Basic Information</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Input onChange={update("name")} placeholder="Venue name" required value={form.name} />
                <Input onChange={update("description")} placeholder="Short description" required value={form.description} />
                <Input min="0" onChange={update("pricePerHour")} placeholder="Price per hour" required type="number" value={form.pricePerHour} />
                <div className="md:col-span-2">
                  <p className="mb-2 text-sm font-bold text-ink">Sports</p>
                  <OptionGroup
                    onToggle={(option) => toggleOption("sportsSupported", option)}
                    options={TURF_SPORT_OPTIONS}
                    selected={form.sportsSupported}
                  />
                </div>
              </div>
            </section>
            <section>
              <h2 className="text-2xl font-black">Location</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-[1fr_1fr]">
                <Input onChange={update("address")} placeholder="Address" required value={form.address} />
                <Input onChange={update("location")} placeholder="Area or district" required value={form.location} />
                <Input onChange={update("city")} placeholder="City" required value={form.city} />
                <Input onChange={update("state")} placeholder="State" required value={form.state} />
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
              <Input
                accept="image/*"
                className="mt-4"
                multiple
                name="images"
                onChange={(event) => {
                  setImagePreviews(Array.from(event.target.files || []).map((file) => URL.createObjectURL(file)));
                }}
                type="file"
              />
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                {(imagePreviews.length ? imagePreviews : editingTurf?.gallery?.length ? editingTurf.gallery : [assetImages.stadium, assetImages.indoor, assetImages.training]).map((image) => (
                  <img alt="Gallery upload preview" className="h-40 rounded-xl object-cover" key={image} onError={handleImageError} src={image} />
                ))}
              </div>
            </section>
            <section>
              <h2 className="text-2xl font-black">Pricing, Amenities, Scheduling</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <Input readOnly value={form.pricePerHour ? `${currency(Number(form.pricePerHour))} / hour` : "Set base price above"} />
                <Input readOnly value="60 minute slots" />
                {form.sportsSupported.map((sport) => (
                  <label key={sport}>
                    <span className="text-sm font-bold">{sport} / hour</span>
                    <Input
                      className="mt-2"
                      min="0"
                      onChange={updateSportRate(sport)}
                      placeholder={form.pricePerHour || "Hourly rate"}
                      type="number"
                      value={form.sportRates[sport] ?? ""}
                    />
                  </label>
                ))}
                <div className="md:col-span-3">
                  <p className="mb-2 text-sm font-bold text-ink">Amenities</p>
                  <OptionGroup
                    onToggle={(option) => toggleOption("amenities", option)}
                    options={TURF_AMENITY_OPTIONS}
                    selected={form.amenities}
                  />
                </div>
              </div>
              <Textarea className="mt-4" onChange={update("description")} placeholder="Venue description and rules" value={form.description} />
            </section>
            <section className="rounded-2xl bg-primary-soft p-5">
              <h2 className="text-2xl font-black">Review & Publish</h2>
              <p className="mt-2 text-sm text-ink-muted">
                Preview validates required data, image coverage, price bands, slot rules, and publish readiness.
              </p>
              <Button className="mt-5" disabled={ownerPending || createTurf.isPending || updateTurf.isPending} type="submit">
                {ownerPending ? "Pending Approval" : createTurf.isPending || updateTurf.isPending ? "Submitting..." : editId ? "Save Venue" : "Submit for Approval"}
              </Button>
              {message && <p className="mt-3 text-sm font-bold text-danger">{message}</p>}
            </section>
            </form>
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
  const { user } = useAuth();
  const { data: turfs = [] } = useMyTurfs();
  const updateSlots = useUpdateTurfSlots();
  const ownerPending = isOwnerPending(user);
  const [turfId, setTurfId] = useState("");
  const [startTime, setStartTime] = useState("06:00");
  const [endTime, setEndTime] = useState("23:00");
  const [slotMinutes, setSlotMinutes] = useState(60);
  const [startIntervalMinutes, setStartIntervalMinutes] = useState(30);
  const [bufferMinutes, setBufferMinutes] = useState(0);
  const [previewDate, setPreviewDate] = useState(new Date(Date.now() + 86400000).toISOString().slice(0, 10));
  const [blackoutDate, setBlackoutDate] = useState("");
  const [blackoutReason, setBlackoutReason] = useState("Maintenance");
  const [blackouts, setBlackouts] = useState([]);
  const [selectedDays, setSelectedDays] = useState(() =>
    Object.fromEntries(DAY_KEYS.map((day) => [day, true])),
  );
  const selectedTurf = turfs.find((turf) => turf.id === turfId) || turfs[0];
  const previewBlackout = blackouts.find((blackout) => blackout.date === previewDate);
  const previewIsBlackout = Boolean(previewBlackout);
  const previewDay = dayKeyForDate(previewDate);
  const previewDayEnabled = Boolean(previewDay && selectedDays[previewDay]);
  const generatedSlots = useMemo(
    () => buildPreviewSlots(startTime, endTime, slotMinutes, startIntervalMinutes),
    [endTime, slotMinutes, startIntervalMinutes, startTime],
  );
  const slots = useMemo(() => {
    if (!previewDayEnabled) return [];
    if (!previewIsBlackout) return generatedSlots;
    return generatedSlots.map((slot) => ({ ...slot, reason: previewBlackout?.reason || "Blackout", status: "blocked" }));
  }, [generatedSlots, previewBlackout?.reason, previewDayEnabled, previewIsBlackout]);
  const weekdaysEnabled = WEEKDAY_KEYS.every((day) => selectedDays[day]);
  const weekendsEnabled = WEEKEND_KEYS.every((day) => selectedDays[day]);

  useEffect(() => {
    if (!turfId && turfs[0]?.id) setTurfId(turfs[0].id);
  }, [turfId, turfs]);

  useEffect(() => {
    if (!selectedTurf) return;
    const schedule = selectedTurf.schedule || {};
    const weeklyAvailability = schedule.weeklyAvailability || {};
    const firstRange = DAY_KEYS.map((day) => weeklyAvailability[day]?.[0]).find(Boolean) || "06:00-23:00";
    const [nextStart, nextEnd] = firstRange.split("-");

    setStartTime(nextStart || "06:00");
    setEndTime(nextEnd || "23:00");
    setSlotMinutes(Number(schedule.slotMinutes || 60));
    setStartIntervalMinutes(Number(schedule.startIntervalMinutes || 30));
    setBufferMinutes(Number(schedule.bufferMinutes || 0));
    const savedBlackouts = schedule.blackouts?.length
      ? schedule.blackouts
      : (schedule.blackoutDates || []).map((date) => ({ date, reason: "Blackout" }));
    setBlackouts(savedBlackouts
      .map((blackout) => ({
        date: String(blackout.date || blackout).slice(0, 10),
        reason: blackout.reason || "Blackout",
      }))
      .filter((blackout) => blackout.date));
    setSelectedDays(Object.fromEntries(
      DAY_KEYS.map((day) => [day, (weeklyAvailability[day] || []).length > 0]),
    ));
  }, [selectedTurf]);

  function setDayGroup(days, enabled) {
    setSelectedDays((current) => ({
      ...current,
      ...Object.fromEntries(days.map((day) => [day, enabled])),
    }));
  }

  function addBlackoutDate() {
    if (ownerPending) return;
    if (!blackoutDate) return;
    setBlackouts((current) => {
      const next = current.filter((blackout) => blackout.date !== blackoutDate);
      next.push({ date: blackoutDate, reason: blackoutReason });
      return next.sort((first, second) => first.date.localeCompare(second.date));
    });
    setBlackoutDate("");
  }

  async function saveSchedule() {
    if (ownerPending) {
      notify("Your account is pending approval from Platform Owner.");
      return;
    }
    if (!selectedTurf) return;
    if (!generatedSlots.length) {
      notify("End time must allow at least one complete slot.");
      return;
    }
    if (!Object.values(selectedDays).some(Boolean)) {
      notify("Select at least one recurring day.");
      return;
    }
    const weeklyAvailability = Object.fromEntries(
      DAY_KEYS.map((day) => [day, selectedDays[day] ? [`${startTime}-${endTime}`] : []]),
    );
    try {
      await updateSlots.mutateAsync({
        id: selectedTurf.id,
        payload: {
          blackoutDates: blackouts.map((blackout) => blackout.date),
          blackouts,
          bufferMinutes,
          minimumBookingMinutes: 60,
          slotMinutes,
          startIntervalMinutes,
          weeklyAvailability,
        },
      });
      notify(`Availability saved for ${selectedTurf.name}.`);
    } catch (error) {
      notify(error.response?.data?.message || error.message);
    }
  }

  return (
    <div>
      <PageTitle
        action={<Button disabled={ownerPending || !selectedTurf || updateSlots.isPending} onClick={saveSchedule}>Save Rules</Button>}
        eyebrow="Scheduling Engine"
        subtitle="Configure availability, pricing tiers, blackout windows, and recurring rules."
        title="Availability"
      />
      <OwnerApprovalBanner />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardContent>
            <h2 className="text-2xl font-black">Daily Schedule</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <label>
                <span className="text-sm font-bold">Venue</span>
                <select
                  className="focus-ring mt-2 h-11 w-full rounded-lg border border-surface-outline bg-white px-3 text-sm"
                  onChange={(event) => setTurfId(event.target.value)}
                  value={selectedTurf?.id || ""}
                >
                  {turfs.map((turf) => <option key={turf.id} value={turf.id}>{turf.name}</option>)}
                </select>
              </label>
              <label>
                <span className="text-sm font-bold">Opening Time</span>
                <Input className="mt-2" onChange={(event) => setStartTime(event.target.value)} type="time" value={startTime} />
              </label>
              <label>
                <span className="text-sm font-bold">Closing Time</span>
                <Input className="mt-2" onChange={(event) => setEndTime(event.target.value)} type="time" value={endTime} />
              </label>
              <label>
                <span className="text-sm font-bold">Default Slot Duration</span>
                <select
                  className="focus-ring mt-2 h-11 w-full rounded-lg border border-surface-outline bg-white px-3 text-sm"
                  onChange={(event) => setSlotMinutes(Number(event.target.value))}
                  value={slotMinutes}
                >
                  {[30, 60, 90, 120].map((minutesValue) => (
                    <option key={minutesValue} value={minutesValue}>{minutesValue} minutes</option>
                  ))}
                </select>
              </label>
              <label>
                <span className="text-sm font-bold">Buffer Time</span>
                <select
                  className="focus-ring mt-2 h-11 w-full rounded-lg border border-surface-outline bg-white px-3 text-sm"
                  onChange={(event) => setBufferMinutes(Number(event.target.value))}
                  value={bufferMinutes}
                >
                  {[0, 15, 30].map((minutesValue) => (
                    <option key={minutesValue} value={minutesValue}>{minutesValue} minutes</option>
                  ))}
                </select>
              </label>
              <label>
                <span className="text-sm font-bold">Preview Date</span>
                <Input className="mt-2" onChange={(event) => setPreviewDate(event.target.value)} type="date" value={previewDate} />
              </label>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <label className="flex items-center gap-2 rounded-lg border border-surface-outline bg-white px-3 py-3 text-sm font-bold">
                <input checked={weekdaysEnabled} className="h-4 w-4 accent-primary" onChange={(event) => setDayGroup(WEEKDAY_KEYS, event.target.checked)} type="checkbox" />
                Mon-Fri
              </label>
              <label className="flex items-center gap-2 rounded-lg border border-surface-outline bg-white px-3 py-3 text-sm font-bold">
                <input checked={weekendsEnabled} className="h-4 w-4 accent-primary" onChange={(event) => setDayGroup(WEEKEND_KEYS, event.target.checked)} type="checkbox" />
                Sat-Sun
              </label>
            </div>
            <div className="mt-5 border-t border-surface-border pt-5">
              <h3 className="text-lg font-black">Blackout Dates</h3>
              <div className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                <Input onChange={(event) => setBlackoutDate(event.target.value)} type="date" value={blackoutDate} />
                <select
                  className="focus-ring h-11 w-full rounded-lg border border-surface-outline bg-white px-3 text-sm"
                  onChange={(event) => setBlackoutReason(event.target.value)}
                  value={blackoutReason}
                >
                  {BLACKOUT_REASON_OPTIONS.map((reason) => <option key={reason}>{reason}</option>)}
                </select>
                <Button disabled={ownerPending} onClick={addBlackoutDate} variant="outline">Add Blackout</Button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {blackouts.map((blackout) => (
                  <button
                    className="rounded-full bg-surface-low px-3 py-1 text-xs font-bold text-ink-muted"
                    key={blackout.date}
                    onClick={() => setBlackouts((current) => current.filter((item) => item.date !== blackout.date))}
                    type="button"
                  >
                    {blackout.date} - {blackout.reason}
                  </button>
                ))}
                {!blackouts.length && <p className="text-sm text-ink-muted">No blackout dates added.</p>}
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-5">
              {slots.map((slot) => (
                <div
                  className={`rounded-xl border p-4 text-left font-black ${
                    slot.status === "blocked"
                      ? "border-danger bg-danger-soft text-danger"
                      : "border-primary bg-primary text-white"
                  }`}
                  key={`${slot.startTime}-${slot.endTime}`}
                >
                  {slot.startTime} - {slot.endTime}
                  <span className="mt-1 block text-xs font-medium opacity-70">{slot.reason}</span>
                </div>
              ))}
              {!slots.length && (
                <p className="col-span-full text-sm font-bold text-danger">
                  {previewDayEnabled ? "Choose an end time after the start time." : "Selected preview date is closed by recurring rules."}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <h2 className="text-2xl font-black">Rules</h2>
            <div className="mt-5 space-y-4">
              {[
                `${slotMinutes} minute slots`,
                `${startIntervalMinutes} minute starts`,
                "Minimum 1 hour",
                `${bufferMinutes} minute buffer`,
                `Open ${startTime} to ${endTime}`,
                recurringSummary(selectedDays),
                `${blackouts.length} blackout dates`,
              ].map((rule) => (
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
  const { data: bookings = [] } = useBookings();
  const dates = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() + index);
    return date;
  });
  const times = [...new Set(bookings.map((booking) => booking.time).filter(Boolean))].sort();
  function exportCalendar() {
    const csv = [
      ["Booking", "Venue", "Date", "Time", "Status"],
      ...bookings.map((booking) => [booking.id, booking.venue, booking.date, booking.time, booking.status]),
    ].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "TURFX-owner-calendar.csv";
    anchor.click();
    URL.revokeObjectURL(url);
    notify("Owner calendar exported.");
  }
  return (
    <div>
      <PageTitle
        action={<Button onClick={exportCalendar} variant="outline">Export Calendar</Button>}
        eyebrow="Calendar"
        subtitle="Week view built for dense operational scanning."
        title="Availability Calendar"
      />
      <Card>
        <CardContent>
          <div className="grid grid-cols-[72px_repeat(7,1fr)] gap-2 overflow-x-auto text-sm">
            <span />
            {dates.map((date) => (
              <div className="min-w-32 rounded-xl bg-surface-low p-3 text-center font-black" key={date.toISOString()}>
                {date.toLocaleDateString("en-US", { weekday: "short", day: "numeric" })}
              </div>
            ))}
            {times.map((time) => (
              <Fragment key={time}>
                <div className="p-3 text-right font-bold text-ink-muted" key={`${time}-label`}>{time}</div>
                {dates.map((date) => {
                  const booking = bookings.find(
                    (item) => String(item.dateValue).slice(0, 10) === date.toISOString().slice(0, 10) && item.time === time,
                  );
                  return (
                  <div
                    className={`min-h-24 min-w-32 rounded-xl border p-3 ${booking ? "border-primary bg-primary-soft" : "border-surface-border bg-white"}`}
                    key={`${date.toISOString()}-${time}`}
                  >
                    <p className="font-black">{booking ? "Booked" : "Open"}</p>
                    <p className="mt-1 text-xs text-ink-muted">{booking?.venue || "Available"}</p>
                  </div>
                )})}
              </Fragment>
            ))}
            {!times.length && <p className="col-span-8 py-8 text-center text-ink-muted">No bookings in this calendar window.</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function AnalyticsCenterPage() {
  const { data: dashboard = {} } = useOwnerDashboard();
  const chartData = (dashboard.monthlyEarnings || []).map((item) => ({
    name: `${item.month}/${item.year}`,
    bookings: item.payments,
    revenue: item.revenue,
  }));
  const ownerKpis = [
    { label: "Revenue", value: currency(dashboard.revenue || 0), trend: "Paid", icon: "Banknote" },
    { label: "Bookings", value: String(dashboard.totalBookings || 0), trend: "Total", icon: "ClipboardList" },
    { label: "Venues", value: String(dashboard.totalTurfs || 0), trend: "Portfolio", icon: "Landmark" },
  ];
  return (
    <div>
      <PageTitle eyebrow="Analytics Center" subtitle="Executive dashboards using Recharts and real booking data shapes." title="Executive Analytics" />
      <div className="metric-grid">
        {ownerKpis.map((kpi) => (
          <StatsCard icon={kpi.icon} key={kpi.label} label={kpi.label} trend={kpi.trend} value={kpi.value} />
        ))}
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <ChartPanel data={chartData} title="Revenue Trends" />
        <ChartPanel data={chartData} dataKey="bookings" title="Booking Trends" type="bar" />
      </div>
    </div>
  );
}

export function RevenueDashboardPage() {
  const { user } = useAuth();
  const { data: payments = [] } = usePayments();
  const { data: dashboard = {} } = useOwnerDashboard();
  const { data: bookings = [] } = useBookings();
  const { data: turfs = [] } = useMyTurfs();
  const ownerPending = isOwnerPending(user, dashboard);
  const paid = payments.filter(isPaidPayment);
  const realMonthlyEarnings = dashboard.monthlyEarnings || [];
  const realRevenueSeries = buildSixMonthRevenueSeries(realMonthlyEarnings);
  const paymentRevenueSeries = buildPaymentRevenueSeries(paid);
  const hasEarningsData = paid.length > 0 || hasSeriesActivity(realRevenueSeries);
  const insightPayments = hasEarningsData ? payments : PROTOTYPE_PAYMENTS;
  const insightPaid = insightPayments.filter(isPaidPayment);
  const chartData = hasEarningsData
    ? (hasSeriesActivity(realRevenueSeries) ? realRevenueSeries : paymentRevenueSeries)
    : PROTOTYPE_REVENUE_SERIES;
  const currentMonthRevenue = chartData[chartData.length - 1]?.revenue || 0;
  const totalRevenue = hasEarningsData ? Number(dashboard.revenue || sumAmounts(paid)) : sumAmounts(insightPaid);
  const todayRevenue = hasEarningsData ? Number(dashboard.todayRevenue || 0) : 6200;
  const weeklyRevenue = hasEarningsData ? Number(dashboard.weeklyRevenue || 0) : 47000;
  const monthlyRevenue = hasEarningsData ? Number(dashboard.monthlyRevenue || currentMonthRevenue) : currentMonthRevenue;
  const pendingRevenue = hasEarningsData ? Number(dashboard.pendingRevenue || 0) : 2400;
  const completedRevenue = hasEarningsData ? Number(dashboard.completedRevenue || totalRevenue) : totalRevenue;
  const refundedRevenue = hasEarningsData ? Number(dashboard.refundedRevenue || 0) : 0;
  const averageBookingValue = insightPaid.length ? totalRevenue / insightPaid.length : 0;
  const completedBookings = bookings.filter((booking) => booking.statusValue === "completed").length;
  const cancelledBookings = bookings.filter((booking) => booking.statusValue === "cancelled").length;
  const bookingTotal = hasEarningsData ? bookings.length : Math.max(bookings.length, 58);
  const bookingCompleted = hasEarningsData ? completedBookings : Math.max(completedBookings, 42);
  const bookingCancelled = hasEarningsData ? cancelledBookings : Math.max(cancelledBookings, 3);
  const topVenues = groupPaymentsByVenue(insightPayments);
  const paymentBreakdown = groupPaymentsByMethod(insightPayments);
  const peakHours = hasEarningsData ? peakHoursFromBookings(bookings) : PROTOTYPE_PEAK_HOURS;
  const recentTransactions = buildRecentTransactions(insightPaid, hasEarningsData);
  const upcomingPayouts = buildUpcomingPayouts(insightPaid, hasEarningsData);
  const revenueForecast = buildRevenueForecast({ bookings, dashboard, hasRevenueData: hasEarningsData, payments: insightPaid, turfs });
  const venueHighlights = buildVenueHighlights({ bookings, hasRevenueData: hasEarningsData, payments: insightPaid, turfs });
  const bookingInsights = buildBookingInsights(hasEarningsData ? bookings : [], turfs);
  const rows = insightPayments.map((payment) => [
    payment.paymentId || payment.transactionId || payment.id || "TXN-PREVIEW",
    payment.bookingReference || "BK-PREVIEW",
    payment.customerName || payment.customer?.name || payment.userId?.name || "Customer",
    payment.venue || payment.bookingId?.turfId?.name || "Venue",
    payment.date || new Date(payment.createdAt).toLocaleDateString(),
    currency(payment.amount),
    currency(payment.platformFee || Number(payment.amount || 0) * 0.1),
    currency(payment.ownerRevenue || Number(payment.amount || 0) * 0.9),
    payment.status || payment.paymentStatus,
    <div className="flex flex-wrap gap-2" key={`${payment.id || payment.paymentId}-actions`}>
      {payment.bookingIdValue && <Button as={Link} size="sm" to={`/bookings/${payment.bookingIdValue}`} variant="ghost">Booking</Button>}
      {payment.customer?._id && <Button as={Link} size="sm" to={`/owner/athletes/${payment.customer._id}`} variant="outline">Customer</Button>}
      <Button
        disabled={ownerPending}
        onClick={async () => {
          await downloadPaymentReceipt(payment);
          notify("Receipt downloaded.");
        }}
        size="sm"
        variant="outline"
      >
        Receipt
      </Button>
    </div>,
  ]);
  return (
    <div>
      <PageTitle eyebrow="Finance" subtitle="Earnings, payouts, refunds, and revenue across your venues." title="Earnings" />
      <OwnerApprovalBanner dashboard={dashboard} />
      <div className="metric-grid">
        <StatsCard icon="CircleDollarSign" label="Total Revenue" trend={hasEarningsData ? "Net earnings" : "Preview"} value={currency(totalRevenue)} />
        <StatsCard icon="CreditCard" label="Today's Revenue" trend="Today" value={currency(todayRevenue)} tone="secondary" />
        <StatsCard icon="Banknote" label="Weekly Revenue" trend="Last 7 days" value={currency(weeklyRevenue)} tone="accent" />
        <StatsCard icon="BadgeCheck" label="Monthly Revenue" trend="This month" value={currency(monthlyRevenue)} tone="warning" />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_0.8fr]">
        <div className="space-y-6">
          {!hasEarningsData && (
            <Card>
              <CardContent>
                <p className="font-black text-ink">No earnings data yet. Revenue insights will appear as bookings are completed.</p>
                <p className="mt-2 text-sm text-ink-muted">Prototype preview data is shown below so the earnings workspace remains useful during demos.</p>
              </CardContent>
            </Card>
          )}
          <ChartPanel data={chartData} subtitle="Last 6 months earnings" title="Revenue Movement" />
          <MetricSummaryCard items={revenueForecast} title="Revenue Forecast" />
          <div className="grid gap-4 md:grid-cols-2">
            <TransactionPreviewCard rows={recentTransactions} />
            <PayoutPreviewCard rows={upcomingPayouts} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardContent>
                <h2 className="text-2xl font-black">Revenue Overview</h2>
                <div className="mt-5 space-y-3 text-sm">
                  <p className="flex justify-between"><span className="text-ink-muted">Total Revenue</span><strong>{currency(totalRevenue)}</strong></p>
                  <p className="flex justify-between"><span className="text-ink-muted">Pending Revenue</span><strong>{currency(pendingRevenue)}</strong></p>
                  <p className="flex justify-between"><span className="text-ink-muted">Completed Revenue</span><strong>{currency(completedRevenue)}</strong></p>
                  <p className="flex justify-between"><span className="text-ink-muted">Refunded Revenue</span><strong>{currency(refundedRevenue)}</strong></p>
                  <p className="flex justify-between"><span className="text-ink-muted">Average Booking Value</span><strong>{currency(averageBookingValue)}</strong></p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <h2 className="text-2xl font-black">Booking Performance</h2>
                <div className="mt-5 space-y-3 text-sm">
                  <p className="flex justify-between"><span className="text-ink-muted">Total Bookings</span><strong>{bookingTotal}</strong></p>
                  <p className="flex justify-between"><span className="text-ink-muted">Completed Bookings</span><strong>{bookingCompleted}</strong></p>
                  <p className="flex justify-between"><span className="text-ink-muted">Cancelled Bookings</span><strong>{bookingCancelled}</strong></p>
                  <p className="flex justify-between"><span className="text-ink-muted">Paid Bookings</span><strong>{insightPaid.length}</strong></p>
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardContent>
                <h2 className="text-2xl font-black">Peak Hours Analysis</h2>
                <div className="mt-5 space-y-3">
                  {(peakHours.length ? peakHours : PROTOTYPE_PEAK_HOURS).map((hour) => (
                    <div className="flex items-center justify-between rounded-xl bg-surface-low p-3" key={hour.label}>
                      <span className="text-sm font-bold">{hour.label}</span>
                      <span className="text-sm font-black text-primary">{hour.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <h2 className="text-2xl font-black">Payment Breakdown</h2>
                <div className="mt-5 space-y-3">
                  {paymentBreakdown.map((item) => (
                    <div className="flex items-center justify-between rounded-xl bg-surface-low p-3" key={item.method}>
                      <span className="text-sm font-bold">{item.method}</span>
                      <span className="text-sm font-black text-primary">{currency(item.amount)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          <MetricSummaryCard items={venueHighlights} title="Venue Performance Highlights" />
          <MetricSummaryCard items={bookingInsights} title="Booking Insights" />
          <Card>
            <CardContent>
              <h2 className="text-2xl font-black">Top Performing Venues</h2>
              <div className="mt-5 space-y-3">
                {topVenues.map((venue) => (
                  <div className="flex items-center justify-between rounded-xl bg-surface-low p-3" key={venue.venue}>
                    <span className="text-sm font-bold">{venue.venue}</span>
                    <span className="text-sm font-black text-primary">{currency(venue.amount)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
        <PerformanceBars bookings={bookings} turfs={turfs} />
      </div>
      <div className="mt-6">
        <DataTable
          columns={["Transaction", "Booking", "Customer", "Venue", "Date", "Amount", "Commission", "Net Earnings", "Status", "Actions"]}
          emptyMessage="No earnings data yet. Revenue insights will appear as bookings are completed."
          rows={rows}
        />
      </div>
    </div>
  );
}

export function OwnerBookingsPage() {
  const { user } = useAuth();
  const { data: bookings = [] } = useBookings();
  const updateStatus = useUpdateBookingStatus();
  const ownerPending = isOwnerPending(user);
  return (
    <div>
      <PageTitle
        eyebrow="Venue Operations"
        subtitle="Manage reservations and payment status across your venues."
        title="Bookings"
      />
      <OwnerApprovalBanner />
      <DataTable
        columns={["Booking", "Venue", "Schedule", "Status", "Actions"]}
        rows={bookings.map((booking) => [
          booking.id,
          booking.venue,
          `${booking.date}, ${booking.time}`,
          booking.status,
          <div className="flex gap-2" key={`${booking.id}-actions`}>
            {booking.statusValue === "pending" && (
              <Button disabled={ownerPending} onClick={() => updateStatus.mutate({ id: booking.id, status: "confirmed" })} size="sm">
                Confirm
              </Button>
            )}
            {booking.statusValue === "confirmed" && (
              <Button disabled={ownerPending} onClick={() => updateStatus.mutate({ id: booking.id, status: "checked_in" })} size="sm">
                Check In
              </Button>
            )}
            {booking.statusValue === "checked_in" && (
              <Button disabled={ownerPending} onClick={() => updateStatus.mutate({ id: booking.id, status: "completed" })} size="sm">
                Complete
              </Button>
            )}
            {!["cancelled", "completed", "checked_in"].includes(booking.statusValue) && (
              <Button disabled={ownerPending} onClick={() => updateStatus.mutate({ id: booking.id, status: "cancelled" })} size="sm" variant="danger">
                Cancel
              </Button>
            )}
          </div>,
        ])}
      />
    </div>
  );
}

export function OwnerReviewsPage() {
  const { data: reviews = [] } = useOwnerReviews();
  return (
    <div>
      <PageTitle
        eyebrow="Customer Experience"
        subtitle="Monitor ratings and customer feedback for your venues."
        title="Reviews"
      />
      <DataTable
        columns={["Venue", "User", "Rating", "Comment"]}
        rows={reviews.map((review) => [
          review.turfId?.name || "Venue",
          review.userId?.name || "User",
          `${review.rating} / 5`,
          review.comment,
        ])}
      />
    </div>
  );
}

export function CRMPage() {
  const { data: bookings = [] } = useBookings();
  const [search, setSearch] = useState("");
  const members = useMemo(() => {
    const map = new Map();
    bookings.forEach((booking) => {
      if (!booking.user?._id) return;
      const current = map.get(booking.user._id) || {
        bookings: 0,
        id: booking.user._id,
        name: booking.user.name,
        spend: 0,
        sport: booking.turf.sport,
      };
      current.bookings += 1;
      current.spend += booking.paid;
      map.set(current.id, current);
    });
    return [...map.values()];
  }, [bookings]);
  const filteredMembers = members.filter((member) => member.name?.toLowerCase().includes(search.toLowerCase()));
  return (
    <div>
      <PageTitle
        action={
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" size={18} />
            <Input className="pl-10" onChange={(event) => setSearch(event.target.value)} placeholder="Search athletes..." value={search} />
          </div>
        }
        eyebrow="CRM"
        subtitle="Manage athletes, spend, tiers, retention health, and outreach."
        title="Athletes"
      />
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        {["Athletes", "Repeat", "New", "Bookings"].map((segment, index) => (
          <Card interactive key={segment}>
            <CardContent>
              <p className="muted-label">{segment}</p>
              <p className="mt-2 text-3xl font-black">{[
                members.length,
                members.filter((member) => member.bookings > 1).length,
                members.filter((member) => member.bookings === 1).length,
                bookings.length,
              ][index]}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <DataTable
        columns={["Athlete", "Sport", "Spend", "Bookings"]}
        rows={filteredMembers.map((member) => [
          <Link className="font-black text-primary hover:underline" key={member.id} to={`/owner/athletes/${member.id}`}>{member.name}</Link>,
          member.sport,
          currency(member.spend),
          String(member.bookings),
        ])}
      />
    </div>
  );
}

export function AthleteProfileOwnerPage() {
  const { id } = useParams();
  const { data: bookings = [] } = useBookings();
  const athleteBookings = bookings.filter((booking) => booking.user?._id === id);
  const athlete = athleteBookings[0]?.user;
  const spend = athleteBookings.reduce((sum, booking) => sum + booking.paid, 0);
  const chartData = athleteBookings.map((booking) => ({
    bookings: 1,
    name: booking.date,
  }));

  if (!athlete) {
    return <div className="py-16 text-center text-ink-muted">Athlete not found in your booking history.</div>;
  }
  return (
    <div>
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <Card>
          <CardContent className="text-center">
            <img alt={athlete.name} className="mx-auto h-36 w-36 rounded-3xl object-cover" src={assetImages.profile} />
            <Badge className="mt-5" variant="primary">TURFX User</Badge>
            <h1 className="mt-3 text-3xl font-black">{athlete.name}</h1>
            <p className="mt-2 text-ink-muted">{athlete.email}</p>
            <Button
              className="mt-6 w-full"
              onClick={() => {
                const offers = JSON.parse(localStorage.getItem("turfx-owner-offers") || "[]");
                offers.push({ athleteId: id, createdAt: new Date().toISOString(), offer: "10% off next booking" });
                localStorage.setItem("turfx-owner-offers", JSON.stringify(offers));
                notify(`Offer saved for ${athlete.name}.`);
              }}
            >
              Send Offer
            </Button>
          </CardContent>
        </Card>
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <StatsCard icon="CalendarDays" label="Bookings" value={String(athleteBookings.length)} />
            <StatsCard icon="Banknote" label="Spend" value={currency(spend)} />
            <StatsCard icon="Activity" label="Completed" value={String(athleteBookings.filter((item) => item.statusValue === "completed").length)} />
          </div>
          <ChartPanel data={chartData} dataKey="bookings" title="Athlete Booking Pattern" type="bar" />
        </div>
      </div>
      <Card className="mt-6">
        <CardContent>
          <h2 className="text-2xl font-black">Engagement Timeline</h2>
          <div className="mt-5 space-y-4">
            {athleteBookings.map((booking) => (
              <div className="flex items-center gap-4" key={booking.id}>
                <div className="grid h-9 w-9 place-items-center rounded-full bg-primary-soft text-primary">
                  <Clock size={16} />
                </div>
                <p className="font-bold">Booked {booking.venue} on {booking.date}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
