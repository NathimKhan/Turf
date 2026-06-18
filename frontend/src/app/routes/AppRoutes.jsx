import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AuthLayout } from "../layouts/AuthLayout.jsx";
import { OwnerLayout } from "../layouts/OwnerLayout.jsx";
import { PortalLayout } from "../layouts/PortalLayout.jsx";
import { PublicLayout } from "../layouts/PublicLayout.jsx";
import { ProtectedRoute } from "./ProtectedRoute.jsx";
import { Skeleton } from "../../components/ui/skeleton.jsx";
import { BOOKING_AUTH_MESSAGE } from "../../constants/auth.js";

function lazyNamed(loader, exportName) {
  return lazy(() => loader().then((module) => ({ default: module[exportName] })));
}

const LoginPage = lazyNamed(() => import("../../pages/auth/AuthPages.jsx"), "LoginPage");
const RegisterPage = lazyNamed(() => import("../../pages/auth/AuthPages.jsx"), "RegisterPage");
const ForgotPasswordPage = lazyNamed(() => import("../../pages/auth/AuthPages.jsx"), "ForgotPasswordPage");

const DashboardPage = lazyNamed(() => import("../../pages/athlete/AthletePages.jsx"), "DashboardPage");
const MyBookingsPage = lazyNamed(() => import("../../pages/athlete/AthletePages.jsx"), "MyBookingsPage");
const FavoritesPage = lazyNamed(() => import("../../pages/athlete/AthletePages.jsx"), "FavoritesPage");
const BookingDetailsPage = lazyNamed(() => import("../../pages/athlete/AthletePages.jsx"), "BookingDetailsPage");
const WalletPage = lazyNamed(() => import("../../pages/athlete/AthletePages.jsx"), "WalletPage");
const NotificationsPage = lazyNamed(() => import("../../pages/athlete/AthletePages.jsx"), "NotificationsPage");
const ProfilePage = lazyNamed(() => import("../../pages/athlete/AthletePages.jsx"), "ProfilePage");
const MembershipCenterPage = lazyNamed(() => import("../../pages/athlete/AthletePages.jsx"), "MembershipCenterPage");

const SlotSelectionPage = lazyNamed(() => import("../../pages/booking/BookingPages.jsx"), "SlotSelectionPage");
const CheckoutPage = lazyNamed(() => import("../../pages/booking/BookingPages.jsx"), "CheckoutPage");
const PaymentSuccessPage = lazyNamed(() => import("../../pages/booking/BookingPages.jsx"), "PaymentSuccessPage");
const BookingSuccessPage = lazyNamed(() => import("../../pages/booking/BookingPages.jsx"), "BookingSuccessPage");

const AdminDashboardPage = lazyNamed(() => import("../../pages/admin/AdminPages.jsx"), "AdminDashboardPage");
const UserManagementPage = lazyNamed(() => import("../../pages/admin/AdminPages.jsx"), "UserManagementPage");
const TurfOwnerManagementPage = lazyNamed(() => import("../../pages/admin/AdminPages.jsx"), "TurfOwnerManagementPage");
const TurfManagementPage = lazyNamed(() => import("../../pages/admin/AdminPages.jsx"), "TurfManagementPage");
const BookingManagementPage = lazyNamed(() => import("../../pages/admin/AdminPages.jsx"), "BookingManagementPage");
const PlatformRevenuePage = lazyNamed(() => import("../../pages/admin/AdminPages.jsx"), "PlatformRevenuePage");
const PlatformAnalyticsPage = lazyNamed(() => import("../../pages/admin/AdminPages.jsx"), "PlatformAnalyticsPage");
const PlatformNotificationsPage = lazyNamed(() => import("../../pages/admin/AdminPages.jsx"), "PlatformNotificationsPage");
const EventManagementPage = lazyNamed(() => import("../../pages/admin/AdminPages.jsx"), "EventManagementPage");
const TournamentManagementPage = lazyNamed(() => import("../../pages/admin/AdminPages.jsx"), "TournamentManagementPage");
const ReportsPage = lazyNamed(() => import("../../pages/admin/AdminPages.jsx"), "ReportsPage");
const SettingsPage = lazyNamed(() => import("../../pages/admin/AdminPages.jsx"), "SettingsPage");

const OwnerDashboardPage = lazyNamed(() => import("../../pages/owner/OwnerPages.jsx"), "OwnerDashboardPage");
const MyTurfsPage = lazyNamed(() => import("../../pages/owner/OwnerPages.jsx"), "MyTurfsPage");
const OwnerBookingsPage = lazyNamed(() => import("../../pages/owner/OwnerPages.jsx"), "OwnerBookingsPage");
const OwnerReviewsPage = lazyNamed(() => import("../../pages/owner/OwnerPages.jsx"), "OwnerReviewsPage");
const TurfDetailsOwnerPage = lazyNamed(() => import("../../pages/owner/OwnerPages.jsx"), "TurfDetailsOwnerPage");
const AddTurfWizardPage = lazyNamed(() => import("../../pages/owner/OwnerPages.jsx"), "AddTurfWizardPage");
const SlotManagementPage = lazyNamed(() => import("../../pages/owner/OwnerPages.jsx"), "SlotManagementPage");
const CalendarManagementPage = lazyNamed(() => import("../../pages/owner/OwnerPages.jsx"), "CalendarManagementPage");
const AnalyticsCenterPage = lazyNamed(() => import("../../pages/owner/OwnerPages.jsx"), "AnalyticsCenterPage");
const RevenueDashboardPage = lazyNamed(() => import("../../pages/owner/OwnerPages.jsx"), "RevenueDashboardPage");
const CRMPage = lazyNamed(() => import("../../pages/owner/OwnerPages.jsx"), "CRMPage");
const AthleteProfileOwnerPage = lazyNamed(() => import("../../pages/owner/OwnerPages.jsx"), "AthleteProfileOwnerPage");

const LandingPage = lazyNamed(() => import("../../pages/public/PublicPages.jsx"), "LandingPage");
const ExplorePage = lazyNamed(() => import("../../pages/public/PublicPages.jsx"), "ExplorePage");
const SearchResultsPage = lazyNamed(() => import("../../pages/public/PublicPages.jsx"), "SearchResultsPage");
const VenueDetailsPage = lazyNamed(() => import("../../pages/public/PublicPages.jsx"), "VenueDetailsPage");
const MembershipsPage = lazyNamed(() => import("../../pages/public/PublicPages.jsx"), "MembershipsPage");
const TournamentsPage = lazyNamed(() => import("../../pages/public/PublicPages.jsx"), "TournamentsPage");
const TournamentHubPage = lazyNamed(() => import("../../pages/public/PublicPages.jsx"), "TournamentHubPage");
const EventsPage = lazyNamed(() => import("../../pages/public/PublicPages.jsx"), "EventsPage");
const EventDetailsPage = lazyNamed(() => import("../../pages/public/PublicPages.jsx"), "EventDetailsPage");
const SupportPage = lazyNamed(() => import("../../pages/public/PublicPages.jsx"), "SupportPage");
const CoachingPage = lazyNamed(() => import("../../pages/public/PublicPages.jsx"), "CoachingPage");

function RouteLoader() {
  return (
    <div className="flex min-h-[55vh] items-center justify-center bg-background">
      <div className="w-full max-w-md rounded-xl border border-surface-border bg-white p-5 shadow-soft">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="mt-4 h-12 w-full" />
        <Skeleton className="mt-3 h-12 w-4/5" />
      </div>
    </div>
  );
}

export function AppRoutes() {
  return (
    <Suspense fallback={<RouteLoader />}>
      <Routes>
        <Route element={<AuthLayout />}>
          <Route element={<LoginPage />} path="/login" />
          <Route element={<RegisterPage />} path="/register" />
          <Route element={<ForgotPasswordPage />} path="/forgot-password" />
        </Route>

        <Route element={<PublicLayout />}>
          <Route element={<LandingPage />} index />
          <Route element={<ExplorePage />} path="/explore" />
          <Route element={<SearchResultsPage />} path="/search" />
          <Route element={<VenueDetailsPage />} path="/venue/:id" />
          <Route element={<VenueDetailsPage />} path="/booking/venue/:id" />
          <Route element={<MembershipsPage />} path="/memberships" />
          <Route element={<TournamentsPage />} path="/tournaments" />
          <Route element={<TournamentHubPage />} path="/tournaments/:id" />
          <Route element={<EventsPage />} path="/events" />
          <Route element={<EventDetailsPage />} path="/events/:id" />
          <Route element={<SupportPage />} path="/support" />
          <Route element={<CoachingPage />} path="/coaching" />
          <Route element={<ProtectedRoute allowedRoles={["user", "admin"]} authMessage={BOOKING_AUTH_MESSAGE} />}>
            <Route element={<SlotSelectionPage />} path="/booking/slots" />
            <Route element={<CheckoutPage />} path="/checkout" />
            <Route element={<CheckoutPage />} path="/payment" />
            <Route element={<PaymentSuccessPage />} path="/success" />
            <Route element={<BookingSuccessPage />} path="/booking-success" />
          </Route>
          <Route element={<ProtectedRoute />}>
            <Route element={<ProfilePage />} path="/profile" />
          </Route>
        </Route>

        <Route element={<ProtectedRoute allowedRoles={["user", "admin"]} />}>
          <Route element={<PortalLayout />}>
            <Route element={<DashboardPage />} path="/dashboard" />
            <Route element={<MyBookingsPage />} path="/bookings" />
            <Route element={<FavoritesPage />} path="/favorites" />
            <Route element={<BookingDetailsPage />} path="/bookings/:id" />
            <Route element={<WalletPage />} path="/wallet" />
            <Route element={<WalletPage />} path="/payments" />
            <Route element={<NotificationsPage />} path="/notifications" />
            <Route element={<MembershipCenterPage />} path="/membership-center" />
          </Route>
        </Route>

        <Route element={<ProtectedRoute allowedRoles={["owner", "admin"]} />}>
          <Route element={<OwnerLayout />}>
            <Route element={<OwnerDashboardPage />} path="/owner/dashboard" />
            <Route element={<MyTurfsPage />} path="/owner/turfs" />
            <Route element={<OwnerBookingsPage />} path="/owner/bookings" />
            <Route element={<OwnerReviewsPage />} path="/owner/reviews" />
            <Route element={<TurfDetailsOwnerPage />} path="/owner/turfs/:id" />
            <Route element={<AddTurfWizardPage />} path="/owner/add-turf" />
            <Route element={<SlotManagementPage />} path="/owner/slots" />
            <Route element={<CalendarManagementPage />} path="/owner/calendar" />
            <Route element={<AnalyticsCenterPage />} path="/owner/analytics" />
            <Route element={<RevenueDashboardPage />} path="/owner/revenue" />
            <Route element={<CRMPage />} path="/owner/crm" />
            <Route element={<AthleteProfileOwnerPage />} path="/owner/athletes/:id" />
          </Route>
        </Route>

        <Route element={<ProtectedRoute role="admin" showAccessDenied />}>
          <Route element={<OwnerLayout />}>
            <Route element={<Navigate replace to="/admin/dashboard" />} path="/admin" />
            <Route element={<AdminDashboardPage />} path="/admin/dashboard" />
            <Route element={<UserManagementPage />} path="/admin/users" />
            <Route element={<TurfOwnerManagementPage />} path="/admin/owners" />
            <Route element={<TurfManagementPage />} path="/admin/turfs" />
            <Route element={<BookingManagementPage />} path="/admin/bookings" />
            <Route element={<PlatformRevenuePage />} path="/admin/revenue" />
            <Route element={<PlatformAnalyticsPage />} path="/admin/analytics" />
            <Route element={<PlatformNotificationsPage />} path="/admin/notifications" />
            <Route element={<EventManagementPage />} path="/admin/events" />
            <Route element={<TournamentManagementPage />} path="/admin/tournaments" />
            <Route element={<ReportsPage />} path="/admin/reports" />
            <Route element={<SettingsPage />} path="/admin/settings" />
          </Route>
        </Route>

        <Route element={<Navigate replace to="/" />} path="*" />
      </Routes>
    </Suspense>
  );
}
