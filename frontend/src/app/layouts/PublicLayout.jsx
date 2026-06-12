import { Outlet } from "react-router-dom";
import { Footer } from "../../components/shared/Footer.jsx";
import { Navbar } from "../../components/shared/Navbar.jsx";
import { PageTransition } from "../../components/shared/Motion.jsx";

export function PublicLayout() {
  return (
    <div className="min-h-screen bg-background text-ink">
      <Navbar />
      <PageTransition>
        <Outlet />
      </PageTransition>
      <Footer />
    </div>
  );
}
