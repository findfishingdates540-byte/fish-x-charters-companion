/**
 * Dashboard TopBar Component
 * Sticky header with title, search, notifications, and availability toggle
 */
import { ReactNode } from "react";

interface TopBarProps {
  title: string;
  subtitle?: string;
  showSearch?: boolean;
  searchPlaceholder?: string;
  showNotifications?: boolean;
  notificationCount?: number;
  onNotificationClick?: () => void;
  showAvailability?: boolean;
  isAccepting?: boolean;
  onAvailabilityToggle?: () => void;
  rightContent?: ReactNode;
}

export function TopBar({
  title,
  subtitle,
  showSearch = true,
  searchPlaceholder = "Search...",
  showNotifications = true,
  notificationCount = 0,
  onNotificationClick,
  showAvailability = false,
  isAccepting = true,
  onAvailabilityToggle,
  rightContent,
}: TopBarProps) {
  return (
    <header className="sticky top-0 z-20 bg-[rgba(238,242,245,0.86)] backdrop-blur-xl border-b border-[rgba(13,34,54,0.1)] px-9 py-4 flex items-center gap-6">
      <div className="min-w-0">
        <div className="font-serif font-semibold text-2xl leading-tight text-[#0d2236]">
          {title}
        </div>
        {subtitle && <div className="text-sm text-[#5c6b78] mt-0.5">{subtitle}</div>}
      </div>

      <div className="ml-auto flex items-center gap-3.5">
        {showSearch && (
          <label className="flex items-center gap-2 bg-white border border-[rgba(13,34,54,0.1)] rounded-full px-4 py-2 w-60">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#93a7b7"
              strokeWidth="1.8"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="text"
              placeholder={searchPlaceholder}
              className="border-0 outline-none bg-transparent font-sans text-sm text-[#0d2236] w-full placeholder:text-[#93a7b7]"
            />
          </label>
        )}

        {showNotifications && (
          <button
            onClick={onNotificationClick}
            className="relative w-11 h-11 rounded-full bg-white border border-[rgba(13,34,54,0.1)] cursor-pointer grid place-items-center text-[#0d2236] hover:border-[rgba(13,34,54,0.24)] transition"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
            >
              <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6M10 20a2 2 0 0 0 4 0" />
            </svg>
            {notificationCount > 0 && (
              <span className="absolute top-2 right-2.5 w-2 h-2 rounded-full bg-[#d8514a] border-2 border-white" />
            )}
          </button>
        )}

        {showAvailability && (
          <div className="flex items-center gap-2.5 bg-white border border-[rgba(13,34,54,0.1)] rounded-full px-3.5 py-1.5">
            <span className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  isAccepting ? "bg-[#1f8a5b] animate-pulse" : "bg-[#93a7b7]"
                }`}
              />
              <span className="text-xs font-semibold text-[#0d2236]">
                {isAccepting ? "Accepting" : "Paused"}
              </span>
            </span>
            <button
              onClick={onAvailabilityToggle}
              role="switch"
              aria-checked={isAccepting}
              className={`relative w-10 h-6 rounded-full border-0 cursor-pointer transition-colors ${
                isAccepting ? "bg-[#1f8a5b]" : "bg-[#93a7b7]"
              }`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all shadow-sm ${
                  isAccepting ? "left-[18px]" : "left-0.5"
                }`}
              />
            </button>
          </div>
        )}

        {rightContent}
      </div>
    </header>
  );
}
