import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../ui/button.jsx";
import { Input } from "../ui/input.jsx";
import { BrandLogo } from "./BrandLogo.jsx";
import { notify } from "../../utils/notify.js";

const columns = [
  {
    title: "Platform",
    links: [
      ["Find Venues", "/explore"],
      ["List your Turf", "/register"],
    ],
  },
  {
    title: "Company",
    links: [
      ["Partner Network", "/register"],
    ],
  },
];

export function Footer() {
  const [email, setEmail] = useState("");

  return (
    <footer className="border-t border-surface-border bg-white">
      <div className="page-shell grid gap-10 py-14 lg:grid-cols-[1.5fr_2fr_1.4fr]">
        <div>
          <BrandLogo />
          <p className="mt-5 max-w-xs text-sm leading-6 text-ink-muted">
            Redefining the athletic journey through premium sports access and real-time venue intelligence.
          </p>
        </div>
        <div className="grid gap-8 sm:grid-cols-2">
          {columns.map((column) => (
            <div key={column.title}>
              <p className="muted-label text-primary">{column.title}</p>
              <div className="mt-4 space-y-3">
                {column.links.map(([label, href]) => (
                  <Link className="block text-sm text-ink-muted hover:text-primary" key={label} to={href}>
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div>
          <p className="muted-label text-primary">Newsletter</p>
          <p className="mt-3 text-sm text-ink-muted">Get early access to premium slots, coaching, and venue updates.</p>
          <form
            className="mt-4 flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (!email.includes("@")) {
                notify("Enter a valid email address.");
                return;
              }
              localStorage.setItem("turfx-newsletter-email", email);
              setEmail("");
              notify("Newsletter subscription saved.");
            }}
          >
            <Input onChange={(event) => setEmail(event.target.value)} placeholder="Email address" type="email" value={email} />
            <Button type="submit">
              Join
            </Button>
          </form>
        </div>
      </div>
      <div className="border-t border-surface-border py-5 text-center text-xs text-ink-soft">
        © 2026 TURFX Premium Athletics. All rights reserved.
      </div>
    </footer>
  );
}
