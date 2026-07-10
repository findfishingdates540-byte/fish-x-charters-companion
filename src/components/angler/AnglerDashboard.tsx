/**
 * AnglerDashboard - Consumer/Angler main dashboard view
 * Based on Fish-X Angler Dashboard DC design
 */
import { KPICard } from "../dashboard/KPICard";

interface AnglerDashboardProps {
  userName: string;
  userEmail?: string;
}

export function AnglerDashboard({ userName, userEmail }: AnglerDashboardProps) {
  return (
    <div className="px-6 md:px-12 py-10 max-w-6xl">
      <p className="text-xs font-bold tracking-wider uppercase text-[#e3c089]">Angler Dashboard</p>
      <h1 className="mt-3 font-serif text-4xl md:text-5xl text-[#0d2236]">
        Welcome aboard, {userName}
      </h1>
      <p className="mt-3 text-[#5c6b78] max-w-xl">
        Your angler workspace. Find charters, manage bookings, and explore gear.
      </p>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        <KPICard
          label="Upcoming trips"
          value="0"
          subtitle="Next 30 days"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <rect x="3" y="4" width="18" height="17" rx="2.5" />
              <path d="M3 9h18M8 2v4M16 2v4" />
            </svg>
          }
        />
        <KPICard
          label="Followed operators"
          value="0"
          subtitle="Charters, guides, shops"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          }
        />
        <KPICard
          label="Past bookings"
          value="0"
          subtitle="Completed trips"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M3 12c3-5 8-7 13-7 2 0 3.5 2 3.5 2s2 0 2 1-1.5 2-3 2c0 0-.5 3-3 5-4 3-12 1-15-1 2 0 3-1 3-3z" />
            </svg>
          }
        />
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <div className="bg-white/80 backdrop-blur-sm border border-[rgba(13,34,54,0.1)] rounded-2xl p-8">
          <h2 className="font-serif text-2xl text-[#0d2236] mb-4">Find your next adventure</h2>
          <p className="text-sm text-[#5c6b78] mb-6">
            Browse verified charters and operators. Book with confidence—every transaction is secured by escrow.
          </p>
          <a
            href="/discover"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#e3c089] text-[#1c1303] font-semibold rounded-lg hover:brightness-105 transition"
          >
            Discover charters
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </a>
        </div>

        <div className="bg-white/80 backdrop-blur-sm border border-[rgba(13,34,54,0.1)] rounded-2xl p-8">
          <h2 className="font-serif text-2xl text-[#0d2236] mb-4">Latest from operators</h2>
          <div className="space-y-4">
            <div className="text-sm text-[#5c6b78] text-center py-8">
              Follow operators to see their latest posts, trips, and offers here.
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 bg-white/80 backdrop-blur-sm border border-[rgba(13,34,54,0.1)] rounded-2xl p-8">
        <h2 className="font-serif text-2xl text-[#0d2236] mb-4">How Fish-X works</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              step: "1",
              title: "Browse & Book",
              desc: "Search verified operators, check availability, and book online.",
            },
            {
              step: "2",
              title: "Secure Payment",
              desc: "Your payment is held in escrow until the trip is completed.",
            },
            {
              step: "3",
              title: "Go Fishing",
              desc: "Enjoy your trip. Rate your experience when you're back.",
            },
          ].map((item) => (
            <div key={item.step} className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-[#e3c089]/20 text-[#a97e3c] font-serif text-lg font-semibold grid place-items-center flex-none">
                {item.step}
              </div>
              <div>
                <div className="font-semibold text-[#0d2236] mb-1">{item.title}</div>
                <div className="text-sm text-[#5c6b78]">{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
