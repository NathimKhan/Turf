import { Outlet } from "react-router-dom";
import { BrandLogo } from "../../components/shared/BrandLogo.jsx";
import { assetImages } from "../../data/turfxData.js";
import { PageTransition } from "../../components/shared/Motion.jsx";

export function AuthLayout() {
  return (
    <main className="grid min-h-screen bg-background lg:grid-cols-[1fr_0.85fr]">
      <section className="flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <BrandLogo />
          <PageTransition>
            <Outlet />
          </PageTransition>
        </div>
      </section>
      <section className="relative hidden overflow-hidden lg:block">
        <img alt="Premium turf" className="h-full w-full object-cover" src={assetImages.hero} />
        <div className="absolute inset-0 bg-gradient-to-t from-dark/90 via-dark/40 to-transparent" />
        <div className="absolute bottom-12 left-12 right-12 text-white">
          <p className="muted-label text-secondary-soft">Book. Play. Compete. Repeat.</p>
          <h1 className="mt-4 text-5xl font-black tracking-normal">Premium athletic access, ready for real product teams.</h1>
          <p className="mt-5 max-w-lg text-white/75">
            JWT-ready auth, reusable API hooks, route protection, and responsive portal flows for athletes and venue operators.
          </p>
        </div>
      </section>
    </main>
  );
}
