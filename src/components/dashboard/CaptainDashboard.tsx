/**
 * CaptainDashboard - Full operator dashboard for charter captains
 * Based on Fish-X Captain Dashboard DC design
 */
import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { KPICard } from "./KPICard";

interface CaptainDashboardProps {
  userName: string;
  userRating?: string;
  businessName?: string;
  onSignOut?: () => void;
}

export function CaptainDashboard({
  userName,
  userRating = "4.98",
  businessName = "Captain",
  onSignOut,
}: CaptainDashboardProps) {
  const [activeNav, setActiveNav] = useState("overview");
  const [bellOpen, setBellOpen] = useState(false);
  const [isAccepting, setIsAccepting] = useState(true);

  const navItems = [
    {
      id: "overview",
      label: "Overview",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
          <rect x="3" y="3" width="8" height="8" rx="2" />
          <rect x="13" y="3" width="8" height="8" rx="2" />
          <rect x="3" y="13" width="8" height="8" rx="2" />
          <rect x="13" y="13" width="8" height="8" rx="2" />
        </svg>
      ),
    },
    {
      id: "bookings",
      label: "Bookings",
      badge: 3,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
          <rect x="3" y="4" width="18" height="17" rx="2.5" />
          <path d="M3 9h18M8 2v4M16 2v4" />
          <path d="m9 15 2 2 4-4" />
        </svg>
      ),
    },
    {
      id: "calendar",
      label: "Calendar",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
          <rect x="3" y="4" width="18" height="17" rx="2.5" />
          <path d="M3 9h18M8 2v4M16 2v4" />
        </svg>
      ),
    },
    {
      id: "messages",
      label: "Messages",
      showDot: true,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
          <path d="M4 5h16v11H8l-4 4z" />
        </svg>
      ),
    },
    {
      id: "earnings",
      label: "Earnings",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
          <path d="M4 19V5M4 19h16M8 15l3-4 3 2 4-6" />
        </svg>
      ),
    },
    {
      id: "settings",
      label: "Settings",
      isAccount: true,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
          <circle cx="12" cy="12" r="3.2" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" />
        </svg>
      ),
    },
  ];

  const kpis = [
    {
      label: "This month",
      value: "$12,450",
      subtitle: "Gross earnings",
      badge: { text: "18%", color: "green" as const },
      trend: { value: "18%", direction: "up" as const },
    },
    {
      label: "Upcoming",
      value: "7",
      subtitle: "Trips booked",
      icon: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
          <path d="M3 12c3-5 8-7 13-7 2 0 3.5 2 3.5 2s2 0 2 1-1.5 2-3 2c0 0-.5 3-3 5-4 3-12 1-15-1 2 0 3-1 3-3z" />
        </svg>
      ),
    },
    {
      label: "In escrow",
      value: "$3,820",
      subtitle: "Held until trips complete",
    },
    {
      label: "Rating",
      value: userRating,
      subtitle: "317 verified reviews",
      icon: <span className="text-[#e3c089]">★</span>,
    },
  ];

  return (
    <div className="flex min-h-screen bg-[#eef2f5] text-[#0d2236] font-sans">
      <Sidebar
        workspaceName={businessName}
        navItems={navItems}
        activeNav={activeNav}
        onNavClick={setActiveNav}
        userName={userName}
        userRating={userRating}
        onSignOut={onSignOut || (() => {})}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar
          title={activeNav === "overview" ? "Overview" : activeNav.charAt(0).toUpperCase() + activeNav.slice(1)}
          subtitle={activeNav === "overview" ? "Your captain workspace at a glance" : ""}
          searchPlaceholder="Search bookings, guests..."
          notificationCount={3}
          onNotificationClick={() => setBellOpen(!bellOpen)}
          showAvailability
          isAccepting={isAccepting}
          onAvailabilityToggle={() => setIsAccepting(!isAccepting)}
        />

        <main className="flex-1 p-8 max-w-7xl w-full">
          {activeNav === "overview" && (
            <div>
              <div className="grid grid-cols-4 gap-5 mb-6">
                {kpis.map((kpi, i) => (
                  <KPICard key={i} {...kpi} />
                ))}
              </div>

              <div className="grid grid-cols-3 gap-5 mb-6">
                <div className="col-span-2 bg-white border border-[rgba(13,34,54,0.1)] rounded-2xl p-6">
                  <div className="mb-5">
                    <div className="text-xs font-bold tracking-wider uppercase text-[#a97e3c]">Earnings</div>
                    <div className="font-serif text-xl font-semibold text-[#0d2236] mt-1">Last 7 months</div>
                  </div>
                  <div className="text-sm text-[#5c6b78] text-center py-20">
                    Chart placeholder - earnings visualization
                  </div>
                </div>

                <div className="bg-gradient-to-br from-[#0c2a42] to-[#0a2236] border border-white/10 rounded-2xl p-6 text-[#eaf1f6]">
                  <div className="text-xs font-bold tracking-wider uppercase text-[#e3c089]">Available to withdraw</div>
                  <div className="font-serif font-semibold text-4xl text-white mt-2">$8,630</div>
                  <div className="text-xs text-[#93a7b7] mt-1">Next auto-payout Fri, Jun 21</div>
                  <div className="my-4 h-px bg-white/10" />
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[#93a7b7]">Held in escrow</span>
                      <span className="text-white font-semibold">$3,820</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#93a7b7]">Lifetime earnings</span>
                      <span className="text-white font-semibold">$284,900</span>
                    </div>
                  </div>
                  <button className="w-full mt-6 bg-[#e3c089] text-[#1c1303] rounded-xl py-3 text-sm font-bold tracking-wide uppercase hover:brightness-105 transition">
                    Withdraw now
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div className="bg-white border border-[rgba(13,34,54,0.1)] rounded-2xl p-6">
                  <div className="flex justify-between items-center mb-5">
                    <div>
                      <div className="text-xs font-bold tracking-wider uppercase text-[#a97e3c]">Action needed</div>
                      <div className="font-serif text-xl font-semibold text-[#0d2236] mt-1">Booking requests</div>
                    </div>
                    <span className="text-xs font-bold text-[#a97e3c] bg-[#f4e6cd] rounded-full px-3 py-1">3 pending</span>
                  </div>
                  <div className="text-center py-12 text-sm text-[#5c6b78]">Booking requests placeholder</div>
                </div>

                <div className="bg-white border border-[rgba(13,34,54,0.1)] rounded-2xl p-6">
                  <div className="flex justify-between items-center mb-5">
                    <div>
                      <div className="text-xs font-bold tracking-wider uppercase text-[#a97e3c]">Next up</div>
                      <div className="font-serif text-xl font-semibold text-[#0d2236] mt-1">Upcoming trips</div>
                    </div>
                  </div>
                  <div className="text-center py-12 text-sm text-[#5c6b78]">Upcoming schedule placeholder</div>
                </div>
              </div>
            </div>
          )}

          {activeNav !== "overview" && (
            <div className="bg-white border border-[rgba(13,34,54,0.1)] rounded-2xl p-12 text-center">
              <div className="text-lg font-serif text-[#0d2236] mb-2">
                {activeNav.charAt(0).toUpperCase() + activeNav.slice(1)} View
              </div>
              <div className="text-sm text-[#5c6b78]">
                This section is ready for full implementation with real data
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
