import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Fish-X Charters — Run your charter business from the helm" },
      { name: "description", content: "Bookings, customers, boats, trips, and payouts in one beautiful operator surface for charter captains." },
      { property: "og:title", content: "Fish-X Charters" },
      { property: "og:description", content: "The operating platform for charter captains." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen">
      {/* Nav */}
      <header className="fixed top-0 inset-x-0 z-50">
        <div className="mx-auto max-w-7xl px-6 py-5 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="material-symbols-outlined text-sandy-gold">anchor</span>
            <span className="text-label-caps text-on-deep">Fish-X Charters</span>
          </Link>
          <nav className="flex items-center gap-3">
            <Link to="/auth" className="text-sm text-on-deep-muted hover:text-on-deep">Sign in</Link>
            <Link to="/auth" search={{ mode: "signup" }} className="btn-gold btn-gold-hover text-sm">
              Get started
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <main className="relative">
        <div
          className="absolute inset-0 -z-10 opacity-40"
          style={{
            backgroundImage:
              "url('https://lh3.googleusercontent.com/aida-public/AB6AXuD6e46KF2vf27E9cDL2yivanrPcx5Yim3gEFYLtZPUsKOwbxnRqi9vZyXUFxasvW87z3kT35nUiYs11K-sNCRovfyTnZ7Uy1p3AL3Dy2msKBYalQ5rqgeHCttNBeg0mdqI8NQOnd-rWDiJBhKMMEkIj1fdIICHPi9pjfoqBNC_3c7XQ_gPgwvInojPz_UZmlW0Z47wCQ1ozy9hKWOlxUQKmJ-0upjrSm6-wrpVGdUkWALV1IuKM1ZvDNwmjb8HWMqSaYQrHDAoD8PaW')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            maskImage: "linear-gradient(to bottom, black 30%, transparent 100%)",
          }}
          aria-hidden
        />
        <section className="mx-auto max-w-5xl px-6 pt-40 pb-24 text-center">
          <p className="text-label-caps text-sandy-gold">For charter captains</p>
          <h1 className="mt-6 text-display text-5xl md:text-7xl text-on-deep">
            Run your charter<br />from the helm.
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-lg text-on-deep-muted">
            Bookings, customers, boats, and payouts in one operator surface
            built for the people actually on the water.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link to="/auth" search={{ mode: "signup" }} className="btn-gold btn-gold-hover">
              Start free
            </Link>
            <Link to="/auth" className="rounded-full border border-border px-6 py-3 text-sm font-medium text-on-deep hover:bg-white/5">
              Captain sign in
            </Link>
          </div>
        </section>

        {/* Feature trio */}
        <section className="mx-auto max-w-6xl px-6 pb-24 grid gap-4 md:grid-cols-3">
          {[
            { icon: "event_available", title: "Fill your calendar", body: "Templates for full-day, half-day, and species trips. Confirm with a tap." },
            { icon: "groups", title: "Know your anglers", body: "Repeat-customer roster, notes, and message history — synced with Fish-X." },
            { icon: "payments", title: "Get paid faster", body: "Deposits at booking, balance on the boat, payouts that don't make you chase." },
          ].map((f) => (
            <div key={f.title} className="glass-card p-6">
              <span className="material-symbols-outlined text-sandy-gold text-[28px]">{f.icon}</span>
              <h3 className="mt-4 text-xl text-display">{f.title}</h3>
              <p className="mt-2 text-sm text-on-deep-muted">{f.body}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
