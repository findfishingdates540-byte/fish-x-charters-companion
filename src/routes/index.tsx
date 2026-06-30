import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Fish-X Charters — Run your charter business from the helm" },
      {
        name: "description",
        content:
          "Bookings, customers, boats, trips and payouts in one operator surface built for charter captains. Part of the Fish-X ecosystem.",
      },
      { property: "og:title", content: "Fish-X Charters" },
      {
        property: "og:description",
        content: "The operating platform for charter captains.",
      },
    ],
  }),
  component: Landing,
});

const HERO_IMG =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuD6e46KF2vf27E9cDL2yivanrPcx5Yim3gEFYLtZPUsKOwbxnRqi9vZyXUFxasvW87z3kT35nUiYs11K-sNCRovfyTnZ7Uy1p3AL3Dy2msKBYalQ5rqgeHCttNBeg0mdqI8NQOnd-rWDiJBhKMMEkIj1fdIICHPi9pjfoqBNC_3c7XQ_gPgwvInojPz_UZmlW0Z47wCQ1ozy9hKWOlxUQKmJ-0upjrSm6-wrpVGdUkWALV1IuKM1ZvDNwmjb8HWMqSaYQrHDAoD8PaW";

const DECK_IMG =
  "https://images.unsplash.com/photo-1502635385003-ee1e6a1a742d?auto=format&fit=crop&w=1600&q=80";

function Landing() {
  return (
    <div className="min-h-screen overflow-hidden">
      {/* Nav */}
      <header className="fixed top-0 inset-x-0 z-50 backdrop-blur-md bg-deep-hull/40 border-b border-white/5">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="material-symbols-outlined text-sandy-gold">anchor</span>
            <span className="text-label-caps text-on-deep">Fish-X Charters</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm text-on-deep-muted">
            <a href="#operator" className="hover:text-on-deep transition">Operator</a>
            <a href="#workflow" className="hover:text-on-deep transition">Workflow</a>
            <a href="#ecosystem" className="hover:text-on-deep transition">Ecosystem</a>
            <a href="#pricing" className="hover:text-on-deep transition">Pricing</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/auth" className="text-sm text-on-deep-muted hover:text-on-deep">
              Sign in
            </Link>
            <Link
              to="/auth"
              search={{ mode: "signup" }}
              className="btn-gold btn-gold-hover text-sm"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* HERO — editorial split */}
      <section className="relative pt-32 pb-24 md:pt-40 md:pb-32">
        <div
          className="absolute inset-0 -z-10 opacity-50"
          style={{
            backgroundImage: `url('${HERO_IMG}')`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            maskImage:
              "linear-gradient(to bottom, black 0%, black 40%, transparent 100%)",
          }}
          aria-hidden
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-deep-hull/30 via-deep-hull/70 to-deep-hull" aria-hidden />

        <div className="mx-auto max-w-7xl px-6 grid md:grid-cols-12 gap-10 items-end">
          <div className="md:col-span-7">
            <p className="text-label-caps text-sandy-gold">For charter captains</p>
            <h1 className="mt-6 text-display text-5xl md:text-7xl leading-[0.95] text-on-deep">
              Run your charter<br />
              <span className="italic text-sandy-gold">from the helm.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-on-deep-muted">
              Bookings, customers, boats and payouts in one operator surface
              built for the people actually on the water — not a desk.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Link to="/auth" search={{ mode: "signup" }} className="btn-gold btn-gold-hover">
                Start free — no card
              </Link>
              <a
                href="#workflow"
                className="rounded-full border border-white/15 px-6 py-3 text-sm font-medium text-on-deep hover:bg-white/5 transition"
              >
                See the workflow
              </a>
            </div>
            <div className="mt-10 flex items-center gap-6 text-xs text-on-deep-muted">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-sandy-gold text-base">verified</span>
                Trusted by 400+ captains
              </div>
              <div className="hidden sm:flex items-center gap-2">
                <span className="material-symbols-outlined text-sandy-gold text-base">bolt</span>
                Live in 5 minutes
              </div>
            </div>
          </div>

          {/* Floating booking card mock */}
          <div className="md:col-span-5">
            <div className="glass-card p-5 rounded-2xl shadow-2xl">
              <div className="flex items-center justify-between">
                <p className="text-label-caps text-on-deep-muted">Today on the water</p>
                <span className="text-xs text-sea-foam">3 confirmed</span>
              </div>
              <div className="mt-4 space-y-3">
                {[
                  { t: "06:00", trip: "Offshore — Yellowfin", who: "M. Ortega +3", state: "Departed" },
                  { t: "13:30", trip: "Inshore half-day", who: "Reyes party +4", state: "Boarding" },
                  { t: "18:00", trip: "Sunset cruise", who: "Hall +6", state: "Prep" },
                ].map((b) => (
                  <div
                    key={b.t}
                    className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-display text-lg text-sandy-gold w-14">{b.t}</span>
                      <div>
                        <p className="text-sm text-on-deep">{b.trip}</p>
                        <p className="text-xs text-on-deep-muted">{b.who}</p>
                      </div>
                    </div>
                    <span className="text-[10px] uppercase tracking-wider text-on-deep-muted">{b.state}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4 text-xs text-on-deep-muted">
                <span>Deposits cleared</span>
                <span className="text-sandy-gold text-display text-lg">$2,840</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <section className="border-y border-white/5 bg-deep-hull-2/40">
        <div className="mx-auto max-w-7xl px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { k: "400+", v: "Captains aboard" },
            { k: "$14M", v: "Charters booked" },
            { k: "92%", v: "Repeat clients" },
            { k: "<5 min", v: "To first booking" },
          ].map((s) => (
            <div key={s.v}>
              <p className="text-display text-3xl md:text-4xl text-sandy-gold">{s.k}</p>
              <p className="mt-1 text-xs uppercase tracking-wider text-on-deep-muted">{s.v}</p>
            </div>
          ))}
        </div>
      </section>

      {/* OPERATOR — feature trio */}
      <section id="operator" className="mx-auto max-w-7xl px-6 py-24">
        <div className="max-w-2xl">
          <p className="text-label-caps text-sandy-gold">The operator surface</p>
          <h2 className="mt-4 text-display text-4xl md:text-5xl text-on-deep">
            Everything the dock used to do — in your pocket.
          </h2>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {[
            {
              icon: "event_available",
              title: "Fill your calendar",
              body: "Templates for full-day, half-day and species trips. Confirm with a tap.",
            },
            {
              icon: "groups",
              title: "Know your anglers",
              body: "Repeat-customer roster, notes and message history — synced with Fish-X.",
            },
            {
              icon: "payments",
              title: "Get paid faster",
              body: "Deposits at booking, balance on the boat, payouts that don't make you chase.",
            },
          ].map((f) => (
            <div key={f.title} className="glass-card p-6 group hover:bg-white/[0.07] transition">
              <span className="material-symbols-outlined text-sandy-gold text-[28px]">{f.icon}</span>
              <h3 className="mt-4 text-xl text-display">{f.title}</h3>
              <p className="mt-2 text-sm text-on-deep-muted">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* WORKFLOW — step rail */}
      <section id="workflow" className="relative py-24">
        <div
          className="absolute inset-y-0 right-0 w-1/2 -z-10 opacity-30 hidden md:block"
          style={{
            backgroundImage: `url('${DECK_IMG}')`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            maskImage: "linear-gradient(to left, black 0%, transparent 90%)",
          }}
          aria-hidden
        />
        <div className="mx-auto max-w-7xl px-6 grid md:grid-cols-12 gap-12">
          <div className="md:col-span-5">
            <p className="text-label-caps text-sandy-gold">A day on the boat</p>
            <h2 className="mt-4 text-display text-4xl md:text-5xl text-on-deep">
              From inquiry to high-fives at the dock.
            </h2>
            <p className="mt-6 text-on-deep-muted">
              Fish-X Charters tracks every trip from the first DM to the final
              tip — without you ever switching apps.
            </p>
          </div>
          <ol className="md:col-span-7 space-y-6">
            {[
              { n: "01", t: "Quote in seconds", d: "Pick a template, set the date, send a booking link." },
              { n: "02", t: "Lock the deposit", d: "Card on file, deposit cleared before the boat leaves the slip." },
              { n: "03", t: "Run the trip", d: "Manifest, weather, catch log — one swipe each." },
              { n: "04", t: "Close the books", d: "Auto-receipts, tip splits, payout to your account next morning." },
            ].map((s) => (
              <li key={s.n} className="flex gap-5 border-l border-white/10 pl-6 relative">
                <span className="absolute -left-2 top-1 w-3 h-3 rounded-full bg-sandy-gold" />
                <div className="flex-1">
                  <div className="flex items-baseline gap-4">
                    <span className="text-display text-2xl text-sandy-gold">{s.n}</span>
                    <h3 className="text-lg text-on-deep">{s.t}</h3>
                  </div>
                  <p className="mt-1 text-sm text-on-deep-muted">{s.d}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Testimonial */}
      <section className="mx-auto max-w-5xl px-6 py-24">
        <div className="glass-card p-10 md:p-14 rounded-3xl">
          <span className="material-symbols-outlined text-sandy-gold text-4xl">format_quote</span>
          <p className="mt-6 text-display text-2xl md:text-3xl leading-snug text-on-deep">
            “I used to lose two hours every night chasing deposits and texting
            back-and-forth. Now I close the day at the dock — and my calendar
            is full a month out.”
          </p>
          <div className="mt-8 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-sandy-gold-soft border border-sandy-gold/40 flex items-center justify-center text-sandy-gold text-display">
              JM
            </div>
            <div>
              <p className="text-sm text-on-deep">Capt. Jesse Marquez</p>
              <p className="text-xs text-on-deep-muted">Reel Therapy Charters · Destin, FL</p>
            </div>
          </div>
        </div>
      </section>

      {/* ECOSYSTEM */}
      <section id="ecosystem" className="mx-auto max-w-7xl px-6 py-24">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div>
            <p className="text-label-caps text-sandy-gold">Part of the Fish-X ecosystem</p>
            <h2 className="mt-4 text-display text-4xl md:text-5xl text-on-deep">
              Anglers find you. You run the trip. Everyone keeps fishing.
            </h2>
            <p className="mt-6 text-on-deep-muted">
              Listings, reviews, catch logs and direct messages flow between
              Fish-X and Fish-X Charters automatically — one identity, one
              wallet, one inbox.
            </p>
            <div className="mt-8 flex gap-3">
              <Link to="/auth" search={{ mode: "signup" }} className="btn-gold btn-gold-hover">
                Claim your captain profile
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { i: "explore", t: "Fish-X", s: "Where anglers discover you." },
              { i: "directions_boat", t: "Charters", s: "Where you run the business." },
              { i: "sync_alt", t: "Live sync", s: "Bookings, profile, reviews." },
              { i: "account_balance_wallet", t: "One wallet", s: "Deposits, balances, payouts." },
            ].map((c) => (
              <div key={c.t} className="glass-card p-5 rounded-2xl">
                <span className="material-symbols-outlined text-sandy-gold">{c.i}</span>
                <p className="mt-3 text-display text-lg text-on-deep">{c.t}</p>
                <p className="text-xs text-on-deep-muted">{c.s}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING / Final CTA */}
      <section id="pricing" className="mx-auto max-w-5xl px-6 py-24 text-center">
        <p className="text-label-caps text-sandy-gold">Pricing</p>
        <h2 className="mt-4 text-display text-4xl md:text-5xl text-on-deep">
          Free until you book your first trip.
        </h2>
        <p className="mt-4 text-on-deep-muted max-w-xl mx-auto">
          Then a flat 2% per booking. No monthly fee, no per-seat. You only pay
          when the boat leaves the slip.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link to="/auth" search={{ mode: "signup" }} className="btn-gold btn-gold-hover">
            Start free
          </Link>
          <Link
            to="/auth"
            className="rounded-full border border-white/15 px-6 py-3 text-sm font-medium text-on-deep hover:bg-white/5 transition"
          >
            Captain sign in
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 mt-12">
        <div className="mx-auto max-w-7xl px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-on-deep-muted">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-sandy-gold text-base">anchor</span>
            <span>Fish-X Charters · © {new Date().getFullYear()}</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-on-deep">Privacy</a>
            <a href="#" className="hover:text-on-deep">Terms</a>
            <a href="#" className="hover:text-on-deep">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
