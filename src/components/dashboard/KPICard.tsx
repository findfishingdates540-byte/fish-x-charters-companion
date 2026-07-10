/**
 * KPI Card Component
 * Reusable stat/metric card for dashboards
 */
import { ReactNode } from "react";

interface KPICardProps {
  label: string;
  value: string | number;
  subtitle: string;
  icon?: ReactNode;
  badge?: {
    text: string;
    color: "green" | "gold" | "cyan" | "red";
  };
  trend?: {
    value: string;
    direction: "up" | "down";
  };
}

export function KPICard({ label, value, subtitle, icon, badge, trend }: KPICardProps) {
  const badgeColors = {
    green: "text-[#1f8a5b] bg-[#e2f2ea]",
    gold: "text-[#a97e3c] bg-[#f4e6cd]",
    cyan: "text-[#1f9fbe] bg-[#e2eef2]",
    red: "text-[#d8514a] bg-[#fde8e8]",
  };

  return (
    <div className="bg-white border border-[rgba(13,34,54,0.1)] rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3.5">
        <span className="text-xs font-bold tracking-wider uppercase text-[#5c6b78]">
          {label}
        </span>
        {badge && (
          <span
            className={`text-xs font-bold rounded-full px-2 py-0.5 ${
              badgeColors[badge.color]
            }`}
          >
            {trend?.direction === "up" ? "↑" : trend?.direction === "down" ? "↓" : ""}{" "}
            {badge.text}
          </span>
        )}
        {icon && <span className="text-[#a97e3c]">{icon}</span>}
      </div>
      <div className="font-serif font-semibold text-[34px] leading-none text-[#0d2236]">
        {value}
      </div>
      <div className="text-xs text-[#5c6b78] mt-1.5">{subtitle}</div>
    </div>
  );
}

interface GlassCardProps {
  children: ReactNode;
  className?: string;
}

export function GlassCard({ children, className = "" }: GlassCardProps) {
  return (
    <div
      className={`bg-white/80 backdrop-blur-sm border border-[rgba(13,34,54,0.1)] rounded-2xl p-6 ${className}`}
    >
      {children}
    </div>
  );
}
