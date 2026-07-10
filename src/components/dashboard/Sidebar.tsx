/**
 * Dashboard Sidebar Component
 * Reusable for all business dashboards (Captain, Tackle Shop, Marina, etc.)
 */
import { Link } from "@tanstack/react-router";

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: string | number;
  showDot?: boolean;
}

interface SidebarProps {
  workspaceName: string;
  workspaceIcon?: React.ReactNode;
  navItems: NavItem[];
  activeNav: string;
  onNavClick: (id: string) => void;
  userName: string;
  userRating?: string;
  userAvatar?: string;
  onSignOut: () => void;
}

export function Sidebar({
  workspaceName,
  workspaceIcon,
  navItems,
  activeNav,
  onNavClick,
  userName,
  userRating,
  userAvatar,
  onSignOut,
}: SidebarProps) {
  return (
    <aside className="w-64 flex-none bg-[#0a2236] text-[#eaf1f6] flex flex-col p-4 sticky top-0 h-screen border-r border-white/10">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-2.5 pb-5">
        <span className="w-3 h-3 bg-[#e3c089] rotate-45 rounded-sm" />
        <span className="font-serif font-semibold text-lg tracking-widest">FISH—X</span>
      </div>

      {/* Workspace Selector */}
      <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-3 py-3 mb-4">
        {workspaceIcon || (
          <span className="w-9 h-9 rounded-lg bg-[#e3c089]/20 grid place-items-center text-[#e3c089] flex-none">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M12 3v18M12 21c-4 0-7-3-7-7h14c0 4-3 7-7 7zM5 9l7-3 7 3" />
            </svg>
          </span>
        )}
        <div className="flex-1 min-w-0">
          <div className="text-[9.5px] font-bold tracking-wider uppercase text-[#93a7b7]">
            Workspace
          </div>
          <div className="text-sm font-semibold text-white truncate">{workspaceName}</div>
        </div>
        <span className="text-[#93a7b7] text-xs ml-auto">▾</span>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1">
        {navItems.slice(0, -1).map((item) => (
          <button
            key={item.id}
            onClick={() => onNavClick(item.id)}
            className={`flex items-center gap-3 w-full rounded-lg px-3 py-3 cursor-pointer font-sans text-sm font-semibold text-left transition-all ${
              activeNav === item.id
                ? "bg-white/10 text-white"
                : "bg-transparent text-[#93a7b7] hover:bg-white/5 hover:text-white"
            }`}
          >
            {item.icon}
            {item.label}
            {item.badge && (
              <span className="ml-auto bg-[#e3c089] text-[#1c1303] text-xs font-bold rounded-full px-2 py-0.5">
                {item.badge}
              </span>
            )}
            {item.showDot && (
              <span className="ml-auto w-2 h-2 rounded-full bg-[#1f9fbe]" />
            )}
          </button>
        ))}
      </nav>

      {/* Account Section */}
      <div className="mt-5 pt-4 border-t border-white/10">
        <div className="text-[9.5px] font-bold tracking-wider uppercase text-[#93a7b7] px-3 pb-2">
          Account
        </div>
        {navItems.slice(-1).map((item) => (
          <button
            key={item.id}
            onClick={() => onNavClick(item.id)}
            className="flex items-center gap-3 w-full rounded-lg px-3 py-3 cursor-pointer font-sans text-sm font-semibold text-[#93a7b7] text-left transition-all hover:bg-white/5 hover:text-white"
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </div>

      {/* User Profile */}
      <div className="mt-auto flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5">
        {userAvatar ? (
          <img
            src={userAvatar}
            alt={userName}
            className="w-10 h-10 rounded-full object-cover flex-none"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-[#e3c089]/20 grid place-items-center text-[#e3c089] font-serif text-base font-semibold flex-none">
            {userName.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-white truncate">{userName}</div>
          {userRating && (
            <div className="text-xs text-[#e3c089]">★ {userRating} · Verified</div>
          )}
        </div>
        <button
          onClick={onSignOut}
          className="ml-auto text-[#93a7b7] hover:text-white flex-none"
          title="Sign out"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
            <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H3" />
          </svg>
        </button>
      </div>
    </aside>
  );
}
