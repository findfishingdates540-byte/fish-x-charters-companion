/**
 * BusinessDashboard - A flexible dashboard component that adapts to 5 business types:
 * Tackle Shop, Marina, Apparel, Guide Service, Manufacturer
 *
 * Accepts a `businessType` prop and renders type-specific:
 * - Navigation items
 * - KPIs
 * - Quick actions
 * - Tab content (Overview, Orders/Bookings, Calendar, etc.)
 *
 * Reuses shared Sidebar, TopBar, and KPICard components.
 */
import { useState, useCallback } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { KPICard, GlassCard } from "./KPICard";

// ==================== TYPES ====================

export type BusinessType =
  | "tackle_shop"
  | "marina"
  | "apparel"
  | "guide_service"
  | "manufacturer";

interface NavItemConfig {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: string | number;
  showDot?: boolean;
  isAccount?: boolean;
}

interface KPIConfig {
  id: string;
  label: string;
  value: string;
  subtitle: string;
  badge?: { text: string; color: "green" | "gold" | "cyan" | "red" };
  trend?: { value: string; direction: "up" | "down" };
  icon?: React.ReactNode;
}

interface QuickActionConfig {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick?: () => void;
}

interface BusinessConfig {
  businessType: BusinessType;
  workspaceName: string;
  userName: string;
  userRating?: string;
  userRole: string;
  searchPlaceholder: string;
  statusIndicator?: { label: string; type: "green" | "cyan" | "gold" };
  navItems: NavItemConfig[];
  kpis: KPIConfig[];
  quickActions: QuickActionConfig[];
  tabTitles: Record<string, [string, string]>; // view -> [title, subtitle]
  primaryAction?: {
    label: string;
    onClick?: () => void;
  };
}

// ==================== ICON FACTORY ====================

const Icon = {
  overview: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <rect x="3" y="3" width="8" height="8" rx="2" />
      <rect x="13" y="3" width="8" height="8" rx="2" />
      <rect x="3" y="13" width="8" height="8" rx="2" />
      <rect x="13" y="13" width="8" height="8" rx="2" />
    </svg>
  ),
  orders: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M6 2 3 6v14a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V6l-3-4z" />
      <path d="M3 6h18M16 10a4 4 0 0 1-8 0" />
    </svg>
  ),
  products: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M21 8 12 3 3 8l9 5z" />
      <path d="M3 8v8l9 5 9-5V8M12 13v8" />
    </svg>
  ),
  payouts: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <rect x="2" y="5" width="20" height="14" rx="2.5" />
      <path d="M2 10h20M6 15h4" />
    </svg>
  ),
  settings: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" />
    </svg>
  ),
  slips: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M4 20V8l8-4 8 4v12M9 20v-6h6v6" />
    </svg>
  ),
  reservations: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <rect x="3" y="4" width="18" height="17" rx="2.5" />
      <path d="M3 9h18M8 2v4M16 2v4" />
      <path d="m9 15 2 2 4-4" />
    </svg>
  ),
  services: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17v3h3l5.3-5.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-2.4z" />
    </svg>
  ),
  drops: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M12 2v4M12 22a7 7 0 0 0 7-7c0-4-3.5-6.5-7-11-3.5 4.5-7 7-7 11a7 7 0 0 0 7 7z" />
    </svg>
  ),
  trips: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <rect x="3" y="4" width="18" height="17" rx="2.5" />
      <path d="M3 9h18M8 2v4M16 2v4" />
      <path d="m9 15 2 2 4-4" />
    </svg>
  ),
  guides: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <circle cx="9" cy="8" r="3.4" />
      <path d="M2.5 20c.8-3.4 3.4-5.4 6.5-5.4s5.7 2 6.5 5.4" />
      <circle cx="17.5" cy="9" r="2.6" />
      <path d="M15.5 14.4c2.6.2 4.8 1.8 5.6 4.6" />
    </svg>
  ),
  requests: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M4 5h16v11H8l-4 4z" />
    </svg>
  ),
  purchaseOrders: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M21 8 12 3 3 8v8l9 5 9-5zM3 8l9 5M21 8l-9 5M12 21v-8" />
    </svg>
  ),
  catalog: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V4H6.5A2.5 2.5 0 0 0 4 6.5zM4 19.5V6.5M20 17v4H6.5a2.5 2.5 0 0 1 0-4" />
    </svg>
  ),
  retailers: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M4 21v-8M20 21v-8M2 10l2-6h16l2 6c0 1.5-1.2 2.6-2.7 2.6-1.4 0-2.6-1.1-2.6-2.6 0 1.5-1.2 2.6-2.7 2.6S10.4 11.5 10.4 10c0 1.5-1.2 2.6-2.7 2.6S5 11.5 5 10zM4 21h16" />
    </svg>
  ),
  units: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M21 8 12 3 3 8l9 5z" />
      <path d="M3 8v8l9 5 9-5V8" />
    </svg>
  ),
  star: <span className="text-[#e3c089]">★</span>,
  diamond: <span className="text-[#a97e3c]">◆</span>,
  escrowPulse: (
    <span className="relative grid place-items-center w-[18px] h-[18px]">
      <span className="absolute inset-0 rounded-full border border-[#1f9fbe] animate-ping" />
      <span className="w-[7px] h-[7px] rounded-full bg-[#1f9fbe]" />
    </span>
  ),
  sandPulse: (
    <span className="w-2 h-2 rounded-full bg-[#e3c089] animate-pulse" />
  ),
};

// ==================== BUSINESS CONFIGS ====================

const businessConfigs: Record<BusinessType, BusinessConfig> = {
  // ===== TACKLE SHOP =====
  tackle_shop: {
    businessType: "tackle_shop",
    workspaceName: "Tackle shop",
    userName: "Reel Deal Tackle",
    userRating: "4.9",
    userRole: "Verified seller",
    searchPlaceholder: "Search orders, products…",
    navItems: [
      { id: "overview", label: "Overview", icon: Icon.overview },
      { id: "orders", label: "Orders", icon: Icon.orders, badge: 3 },
      { id: "products", label: "Products", icon: Icon.products },
      { id: "payouts", label: "Payouts", icon: Icon.payouts },
      { id: "settings", label: "Settings", icon: Icon.settings, isAccount: true },
    ],
    kpis: [
      { id: "revenue", label: "Revenue", value: "$18,240", subtitle: "This month", badge: { text: "12%", color: "green" }, trend: { value: "12%", direction: "up" } },
      { id: "orders", label: "Orders", value: "142", subtitle: "This month", badge: { text: "8%", color: "green" }, trend: { value: "8%", direction: "up" } },
      { id: "units", label: "Units sold", value: "389", subtitle: "This month", icon: Icon.units },
      { id: "escrow", label: "In escrow", value: "$2,310", subtitle: "Orders in transit", icon: Icon.escrowPulse },
    ],
    quickActions: [
      { id: "add-product", label: "Add product", icon: Icon.products },
      { id: "mark-shipped", label: "Mark shipped", icon: Icon.orders },
      { id: "withdraw", label: "Withdraw", icon: Icon.payouts },
    ],
    tabTitles: {
      overview: ["Overview", "Welcome back, Reel Deal Tackle"],
      orders: ["Orders", "Fulfil and track every order"],
      products: ["Products", "Your catalog and inventory"],
      payouts: ["Payouts", "Balance, escrow and history"],
      settings: ["Settings", "Manage your store"],
    },
    primaryAction: { label: "+ Add product" },
  },

  // ===== MARINA =====
  marina: {
    businessType: "marina",
    workspaceName: "Blue Harbor Marina",
    userName: "Dana Whitfield",
    userRole: "Harbormaster",
    searchPlaceholder: "Search vessels, slips…",
    statusIndicator: { label: "VHF Ch. 16 monitored", type: "green" },
    navItems: [
      { id: "overview", label: "Overview", icon: Icon.overview },
      { id: "slips", label: "Slips", icon: Icon.slips },
      { id: "reservations", label: "Reservations", icon: Icon.reservations, badge: 2 },
      { id: "services", label: "Services", icon: Icon.services },
    ],
    kpis: [
      { id: "occupancy", label: "Occupancy", value: "86%", subtitle: "103 of 120 slips", badge: { text: "4%", color: "green" }, trend: { value: "4%", direction: "up" } },
      { id: "moorage", label: "Moorage MTD", value: "$48,200", subtitle: "Slips, fuel & services", icon: Icon.diamond },
      { id: "escrow", label: "In escrow", value: "$6,940", subtitle: "Released as stays begin", icon: Icon.escrowPulse },
      { id: "rating", label: "Rating", value: "4.9", subtitle: "212 boater reviews", icon: Icon.star },
    ],
    quickActions: [
      { id: "hold-slip", label: "Hold a slip", icon: Icon.slips },
      { id: "check-in", label: "Check in vessel", icon: Icon.reservations },
      { id: "service-request", label: "Log service", icon: Icon.services },
    ],
    tabTitles: {
      overview: ["Overview", "Good morning, Dana — calm seas today"],
      slips: ["Slips", "120 slips across four docks"],
      reservations: ["Reservations", "Moorage bookings — escrow-protected"],
      services: ["Services", "Amenities & dockside requests"],
    },
  },

  // ===== APPAREL =====
  apparel: {
    businessType: "apparel",
    workspaceName: "Tidewater Apparel",
    userName: "Theo Marsh",
    userRole: "Founder",
    searchPlaceholder: "Search styles, orders…",
    navItems: [
      { id: "overview", label: "Overview", icon: Icon.overview },
      { id: "products", label: "Products", icon: Icon.products },
      { id: "orders", label: "Orders", icon: Icon.orders, badge: 3 },
      { id: "drops", label: "Drops", icon: Icon.drops },
    ],
    kpis: [
      { id: "revenue", label: "Revenue MTD", value: "$24,800", subtitle: "1,240 units sold", badge: { text: "22%", color: "green" }, trend: { value: "22%", direction: "up" } },
      { id: "escrow", label: "In escrow", value: "$4,120", subtitle: "Wholesale & pre-orders", icon: Icon.escrowPulse },
      { id: "wholesale", label: "Wholesale share", value: "38%", subtitle: "21 stocking retailers", icon: Icon.diamond },
      { id: "next-drop", label: "Next drop", value: "12 days", subtitle: "“Golden Hour” capsule", icon: Icon.sandPulse },
    ],
    quickActions: [
      { id: "schedule-drop", label: "Schedule drop", icon: Icon.drops },
      { id: "add-style", label: "Add style", icon: Icon.products },
      { id: "fulfill", label: "Fulfill order", icon: Icon.orders },
    ],
    tabTitles: {
      overview: ["Overview", "Morning, Theo — the Golden Hour drop is close"],
      products: ["Products", "Your line — live & draft styles"],
      orders: ["Orders", "Retail & wholesale, escrow-protected"],
      drops: ["Drops", "Capsules & launch calendar"],
    },
    primaryAction: { label: "+ Schedule drop" },
  },

  // ===== GUIDE SERVICE =====
  guide_service: {
    businessType: "guide_service",
    workspaceName: "Backcountry Guides",
    userName: "Wade Coulter",
    userRole: "Owner",
    searchPlaceholder: "Search trips, guides…",
    statusIndicator: { label: "2 guides on the water", type: "green" },
    navItems: [
      { id: "overview", label: "Overview", icon: Icon.overview },
      { id: "trips", label: "Trips", icon: Icon.trips, badge: 2 },
      { id: "guides", label: "Guides", icon: Icon.guides },
      { id: "requests", label: "Requests", icon: Icon.requests, showDot: true },
    ],
    kpis: [
      { id: "revenue", label: "This month", value: "$31,600", subtitle: "Across 64 guided trips", badge: { text: "15%", color: "green" }, trend: { value: "15%", direction: "up" } },
      { id: "trips", label: "This week", value: "18 trips", subtitle: "2 still unassigned", icon: Icon.trips },
      { id: "escrow", label: "In escrow", value: "$7,240", subtitle: "Released as trips complete", icon: Icon.escrowPulse },
      { id: "rating", label: "Team rating", value: "4.95", subtitle: "Across 5 guides", icon: Icon.star },
    ],
    quickActions: [
      { id: "assign-guide", label: "Assign guide", icon: Icon.guides },
      { id: "accept-booking", label: "Accept booking", icon: Icon.requests },
      { id: "add-guide", label: "Invite guide", icon: Icon.guides },
    ],
    tabTitles: {
      overview: ["Overview", "Morning, Wade — three boats out today"],
      trips: ["Trips", "Assignment board — escrow-funded bookings"],
      guides: ["Guides", "Your roster & availability"],
      requests: ["Requests", "New bookings waiting on you"],
    },
  },

  // ===== MANUFACTURER =====
  manufacturer: {
    businessType: "manufacturer",
    workspaceName: "Apex Rod Co.",
    userName: "Nora Castillo",
    userRole: "Sales director",
    searchPlaceholder: "Search POs, SKUs, shops…",
    navItems: [
      { id: "overview", label: "Overview", icon: Icon.overview },
      { id: "orders", label: "Purchase orders", icon: Icon.purchaseOrders, badge: 2 },
      { id: "catalog", label: "Catalog", icon: Icon.catalog },
      { id: "retailers", label: "Retailers", icon: Icon.retailers },
    ],
    kpis: [
      { id: "wholesale", label: "Wholesale MTD", value: "$86,400", subtitle: "Across 41 orders", badge: { text: "12%", color: "green" }, trend: { value: "12%", direction: "up" } },
      { id: "open-pos", label: "Open POs", value: "14", subtitle: "2 awaiting your acceptance", icon: Icon.purchaseOrders },
      { id: "escrow", label: "In escrow", value: "$32,600", subtitle: "Released on delivery", icon: Icon.escrowPulse },
      { id: "retailers", label: "Active retailers", value: "68", subtitle: "12 new this quarter", icon: Icon.diamond },
    ],
    quickActions: [
      { id: "new-offer", label: "New wholesale offer", icon: Icon.purchaseOrders },
      { id: "accept-po", label: "Accept PO", icon: Icon.orders },
      { id: "add-sku", label: "Add SKU", icon: Icon.catalog },
    ],
    tabTitles: {
      overview: ["Overview", "Good morning, Nora — wholesale is moving"],
      orders: ["Purchase orders", "Escrow-backed wholesale POs"],
      catalog: ["Catalog", "Your wholesale line & stock"],
      retailers: ["Retailers", "Shops stocking Apex"],
    },
    primaryAction: { label: "+ New wholesale offer" },
  },
};

// ==================== TAB CONTENT COMPONENTS ====================

/**
 * OverviewTab - renders KPI cards and a two-column layout.
 * The left and right content panels are rendered via renderProps passed
 * from the parent or as inline placeholder content.
 */
function OverviewTab({
  kpis,
  leftPanel,
  rightPanel,
}: {
  kpis: KPIConfig[];
  leftPanel?: React.ReactNode;
  rightPanel?: React.ReactNode;
}) {
  return (
    <div>
      {/* KPI Row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {kpis.map((kpi) => (
          <KPICard
            key={kpi.id}
            label={kpi.label}
            value={kpi.value}
            subtitle={kpi.subtitle}
            icon={kpi.icon}
            badge={kpi.badge}
            trend={kpi.trend}
          />
        ))}
      </div>

      {/* Two-Column Content */}
      <div className="grid grid-cols-[1.5fr_1fr] gap-4">
        {leftPanel || (
          <GlassCard>
            <div className="text-[11px] font-bold tracking-wider uppercase text-[#a97e3c]">
              Activity
            </div>
            <div className="font-serif font-semibold text-xl text-[#0d2236] mt-1 mb-4">
              Recent activity
            </div>
            <div className="text-sm text-[#5c6b78]">
              Connect business-specific content here.
            </div>
          </GlassCard>
        )}
        {rightPanel || (
          <GlassCard>
            <div className="text-[11px] font-bold tracking-wider uppercase text-[#a97e3c]">
              Insights
            </div>
            <div className="font-serif font-semibold text-xl text-[#0d2236] mt-1 mb-4">
              Quick insights
            </div>
            <div className="text-sm text-[#5c6b78]">
              Connect business-specific insights here.
            </div>
          </GlassCard>
        )}
      </div>
    </div>
  );
}

/**
 * TableTab - generic table view for orders, reservations, trips, etc.
 */
function TableTab({
  columns,
  rows,
}: {
  columns: { key: string; label: string; width?: string }[];
  rows: Record<string, React.ReactNode>[];
}) {
  return (
    <div className="bg-white border border-[rgba(13,34,54,0.1)] rounded-2xl overflow-hidden">
      {/* Header */}
      <div
        className="grid gap-4 px-6 py-3.5 border-b border-[rgba(13,34,54,0.1)] text-[11px] font-bold tracking-wider uppercase text-[#5c6b78]"
        style={{
          gridTemplateColumns: columns
            .map((c) => c.width || "1fr")
            .join(" "),
        }}
      >
        {columns.map((col) => (
          <span key={col.key}>{col.label}</span>
        ))}
      </div>
      {/* Rows */}
      {rows.map((row, i) => (
        <div
          key={i}
          className="grid gap-4 px-6 py-4 border-b border-[rgba(13,34,54,0.1)] items-center hover:bg-[#eef2f5] transition-colors"
          style={{
            gridTemplateColumns: columns
              .map((c) => c.width || "1fr")
              .join(" "),
          }}
        >
          {columns.map((col) => (
            <span key={col.key}>{row[col.key]}</span>
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * CardGridTab - grid of cards for products, guides, retailers, slips.
 */
function CardGridTab({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-4">{children}</div>
  );
}

/**
 * PlaceholderTab - shown for tabs not yet wired with business-specific content.
 */
function PlaceholderTab({
  title,
  navId,
}: {
  title: string;
  navId: string;
}) {
  return (
    <GlassCard>
      <div className="font-serif font-semibold text-xl text-[#0d2236] mb-2">
        {title}
      </div>
      <div className="text-sm text-[#5c6b78]">
        The <code className="text-xs bg-[#eef2f5] px-1.5 py-0.5 rounded">
          {navId}
        </code> tab content will be rendered here. Wire business-specific
        content via the <code className="text-xs bg-[#eef2f5] px-1.5 py-0.5 rounded">renderTab</code> prop.
      </div>
    </GlassCard>
  );
}

// ==================== MAIN COMPONENT ====================

export interface BusinessDashboardProps {
  businessType: BusinessType;
  /** Override default config (optional) */
  configOverrides?: Partial<BusinessConfig>;
  /** Custom render function for tab content, keyed by nav id */
  renderTab?: (
    navId: string,
    config: BusinessConfig
  ) => React.ReactNode;
  /** Override the overview left panel */
  overviewLeftPanel?: React.ReactNode;
  /** Override the overview right panel */
  overviewRightPanel?: React.ReactNode;
  /** Called when user clicks sign out */
  onSignOut?: () => void;
}

export function BusinessDashboard({
  businessType,
  configOverrides,
  renderTab,
  overviewLeftPanel,
  overviewRightPanel,
  onSignOut,
}: BusinessDashboardProps) {
  const baseConfig = businessConfigs[businessType];
  const config: BusinessConfig = { ...baseConfig, ...configOverrides };

  const [activeNav, setActiveNav] = useState(
    config.navItems.find((n) => !n.isAccount)?.id || "overview"
  );

  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  }, []);

  const handleNavClick = useCallback((id: string) => {
    setActiveNav(id);
  }, []);

  const handleQuickAction = useCallback(
    (actionId: string, label: string) => {
      showToast(`${label} — action triggered`);
    },
    [showToast]
  );

  // Split nav items: main items vs account item
  const mainNavItems = config.navItems.filter((n) => !n.isAccount);
  const accountNavItems = config.navItems.filter((n) => n.isAccount);
  const sidebarNavItems = [...mainNavItems, ...accountNavItems];

  // Get page title/subtitle for current tab
  const titleInfo = config.tabTitles[activeNav] ||
    config.tabTitles.overview || ["Dashboard", ""];

  // Render primary action button if configured
  const primaryActionButton = config.primaryAction ? (
    <button
      onClick={() => showToast(`${config.primaryAction!.label} — draft created`)}
      className="bg-[#e3c089] text-[#1c1303] border-0 rounded-full px-5 py-2.5 font-sans text-xs font-bold tracking-wide cursor-pointer hover:brightness-105 transition"
    >
      {config.primaryAction.label}
    </button>
  ) : undefined;

  // Render the active tab content
  const renderActiveTab = () => {
    // If custom renderTab is provided, use it
    if (renderTab) {
      const custom = renderTab(activeNav, config);
      if (custom) return custom;
    }

    // Default: Overview tab renders KPIs + panels; others get placeholder
    if (activeNav === "overview") {
      return (
        <OverviewTab
          kpis={config.kpis}
          leftPanel={overviewLeftPanel}
          rightPanel={overviewRightPanel}
        />
      );
    }

    // For non-overview tabs, render a placeholder
    return <PlaceholderTab title={titleInfo[0]} navId={activeNav} />;
  };

  // Render the status indicator (if configured)
  const statusIndicatorContent = config.statusIndicator ? (
    <div className="flex items-center gap-2.5 bg-white border border-[rgba(13,34,54,0.1)] rounded-full px-4 py-2">
      <span
        className={`w-2 h-2 rounded-full animate-pulse ${
          config.statusIndicator.type === "green"
            ? "bg-[#1f8a5b]"
            : config.statusIndicator.type === "cyan"
            ? "bg-[#1f9fbe]"
            : "bg-[#e3c089]"
        }`}
      />
      <span className="text-xs font-semibold text-[#0d2236]">
        {config.statusIndicator.label}
      </span>
    </div>
  ) : undefined;

  return (
    <div className="flex min-h-screen bg-[#eef2f5] text-[#0d2236] font-sans">
      {/* Sidebar */}
      <Sidebar
        workspaceName={config.workspaceName}
        navItems={sidebarNavItems.map((item) => ({
          id: item.id,
          label: item.label,
          icon: item.icon,
          badge: item.badge,
          showDot: item.showDot,
        }))}
        activeNav={activeNav}
        onNavClick={handleNavClick}
        userName={config.userName}
        userRating={config.userRating}
        onSignOut={() => {
          onSignOut?.();
          showToast("Signed out");
        }}
      />

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* TopBar */}
        <TopBar
          title={titleInfo[0]}
          subtitle={titleInfo[1]}
          searchPlaceholder={config.searchPlaceholder}
          showNotifications={true}
          notificationCount={3}
          onNotificationClick={() => showToast("Notifications opened")}
          rightContent={
            <>
              {statusIndicatorContent}
              {primaryActionButton}
            </>
          }
        />

        {/* Main Area */}
        <main className="flex-1 px-8 py-8 max-w-[1180px] w-full">
          {renderActiveTab()}
        </main>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-7 left-1/2 z-60 flex items-center gap-3 bg-[#0a2236] text-white border border-white/12 rounded-full px-6 py-3.5 shadow-[0_20px_44px_-20px_rgba(0,0,0,0.6)]"
          style={{ animation: "fx-toastin 0.35s ease-out" }}
        >
          <span className="w-5.5 h-5.5 rounded-full bg-[#1f8a5b] grid place-items-center text-xs">
            ✓
          </span>
          <span className="text-sm font-semibold">{toast}</span>
        </div>
      )}

      {/* Toast animation keyframes */}
      <style>{`
        @keyframes fx-toastin {
          0% { opacity: 0; transform: translate(-50%, 14px); }
          100% { opacity: 1; transform: translate(-50%, 0); }
        }
        .z-60 { z-index: 60; }
      `}</style>
    </div>
  );
}

// ==================== EXPORTS ====================

export { businessConfigs };
export type { BusinessConfig, NavItemConfig, KPIConfig, QuickActionConfig };
export { OverviewTab, TableTab, CardGridTab, PlaceholderTab };
