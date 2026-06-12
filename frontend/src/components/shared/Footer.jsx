import { Link } from "react-router-dom";
import { Button } from "../ui/button.jsx";
import { Input } from "../ui/input.jsx";
import { BrandLogo } from "./BrandLogo.jsx";

const columns = [
  { title: "Platform", links: ["Find Venues", "List your Turf", "Corporate Booking", "Pricing"] },
  { title: "Support", links: ["Support Center", "Terms of Service", "Privacy Policy", "Cancellation Policy"] },
  { title: "Company", links: ["About TURFX", "Careers", "Partner Network", "Status"] },
];

export function Footer() {
  return (
    <footer className="border-t border-surface-border bg-white">
      <div className="page-shell grid gap-10 py-14 lg:grid-cols-[1.5fr_2fr_1.4fr]">
        <div>
          <BrandLogo />
          <p className="mt-5 max-w-xs text-sm leading-6 text-ink-muted">
            Redefining the athletic journey through premium sports access and real-time venue intelligence.
          </p>
        </div>
        <div className="grid gap-8 sm:grid-cols-3">
          {columns.map((column) => (
            <div key={column.title}>
              <p className="muted-label text-primary">{column.title}</p>
              <div className="mt-4 space-y-3">
                {column.links.map((link) => (
                  <Link className="block text-sm text-ink-muted hover:text-primary" key={link} to="/support">
                    {link}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div>
          <p className="muted-label text-primary">Newsletter</p>
          <p className="mt-3 text-sm text-ink-muted">Get early access to slots, events, and tournament invites.</p>
          <div className="mt-4 flex gap-2">
            <Input placeholder="Email address" type="email" />
            <Button>Join</Button>
          </div>
        </div>
      </div>
      <div className="border-t border-surface-border py-5 text-center text-xs text-ink-soft">
        © 2026 TURFX Premium Athletics. All rights reserved.
      </div>
    </footer>
  );
}
