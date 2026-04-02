import { useState } from "react";

const THEMES = {
  light: {
    bg: "#f8fafc", surface: "#ffffff", surfaceHover: "#f8fafc",
    border: "#e2e8f0", borderLight: "#f1f5f9",
    text: "#1e293b", textSecondary: "#64748b", textMuted: "#94a3b8",
    accent: "#6366f1", accentLight: "#818cf8", accentBg: "rgba(99,102,241,0.06)",
    success: "#10b981", warning: "#f59e0b", danger: "#ef4444",
    cardShadow: "0 1px 3px rgba(0,0,0,0.04)",
    kpiGradient: "linear-gradient(135deg, #6366f1, #7c3aed)",
    barDefault: "linear-gradient(180deg, #e2e8f0, #cbd5e1)",
    barActive: "linear-gradient(180deg, #6366f1, #818cf8)",
    tabBg: "#f1f5f9", tabActive: "#ffffff", tabShadow: "0 1px 3px rgba(0,0,0,0.08)",
    sidebarBg: "#ffffff",
    toggleBg: "#f1f5f9", toggleIcon: "#64748b",
  },
  dark: {
    bg: "#0f172a", surface: "#1e293b", surfaceHover: "#334155",
    border: "#334155", borderLight: "#293548",
    text: "#f1f5f9", textSecondary: "#94a3b8", textMuted: "#64748b",
    accent: "#818cf8", accentLight: "#a5b4fc", accentBg: "rgba(129,140,248,0.1)",
    success: "#34d399", warning: "#fbbf24", danger: "#f87171",
    cardShadow: "0 1px 3px rgba(0,0,0,0.3)",
    kpiGradient: "linear-gradient(135deg, #4f46e5, #6d28d9)",
    barDefault: "linear-gradient(180deg, #334155, #475569)",
    barActive: "linear-gradient(180deg, #818cf8, #a5b4fc)",
    tabBg: "#1e293b", tabActive: "#334155", tabShadow: "0 1px 3px rgba(0,0,0,0.3)",
    sidebarBg: "#1e293b",
    toggleBg: "#334155", toggleIcon: "#e2e8f0",
  },
};

const MOCK = {
  todayOrders: 12, todayRevenue: 284600,
  weekOrders: 67, weekRevenue: 1523400,
  monthOrders: 234, monthRevenue: 5672300,
  pendingOrders: 3, shippingToday: 5, newMembers: 8,
  conversionRate: 3.2, avgOrderValue: 22730, repeatRate: 34.5,
  orders: [
    { id: "ORD-2026-0412", customer: "田中 太郎", amount: 34800, status: "準備中", time: "14:32" },
    { id: "ORD-2026-0411", customer: "鈴木 花子", amount: 12400, status: "発送済み", time: "13:15" },
    { id: "ORD-2026-0410", customer: "佐藤 次郎", amount: 67200, status: "入金待ち", time: "12:48" },
    { id: "ORD-2026-0409", customer: "山田 美咲", amount: 8900, status: "配達完了", time: "11:20" },
    { id: "ORD-2026-0408", customer: "高橋 健一", amount: 45600, status: "確認済み", time: "10:05" },
  ],
  revenue: [
    { day: "月", value: 198000 }, { day: "火", value: 245000 },
    { day: "水", value: 312000 }, { day: "木", value: 189000 },
    { day: "金", value: 367000 }, { day: "土", value: 425000 },
    { day: "日", value: 287000 },
  ],
  products: [
    { name: "オーガニック美容オイル", sales: 45, revenue: 675000 },
    { name: "天然ハーブティーセット", sales: 38, revenue: 342000 },
    { name: "シルクスリープマスク", sales: 32, revenue: 256000 },
    { name: "アロマディフューザー", sales: 28, revenue: 392000 },
  ],
  statuses: { pending: 3, awaitingPayment: 2, confirmed: 5, preparing: 4, shipped: 8, delivered: 45, cancelled: 1 },
};

const SC = {
  light: {
    "準備中": { bg: "#e0e7ff", text: "#3730a3", dot: "#6366f1" },
    "発送済み": { bg: "#d1fae5", text: "#065f46", dot: "#10b981" },
    "入金待ち": { bg: "#fce7f3", text: "#9d174d", dot: "#ec4899" },
    "配達完了": { bg: "#f0fdf4", text: "#166534", dot: "#22c55e" },
    "確認済み": { bg: "#dbeafe", text: "#1e40af", dot: "#3b82f6" },
    "保留中": { bg: "#fef3c7", text: "#92400e", dot: "#f59e0b" },
    "キャンセル": { bg: "#fee2e2", text: "#991b1b", dot: "#ef4444" },
  },
  dark: {
    "準備中": { bg: "rgba(99,102,241,0.2)", text: "#a5b4fc", dot: "#818cf8" },
    "発送済み": { bg: "rgba(16,185,129,0.2)", text: "#6ee7b7", dot: "#34d399" },
    "入金待ち": { bg: "rgba(236,72,153,0.2)", text: "#f9a8d4", dot: "#f472b6" },
    "配達完了": { bg: "rgba(34,197,94,0.15)", text: "#86efac", dot: "#4ade80" },
    "確認済み": { bg: "rgba(59,130,246,0.2)", text: "#93c5fd", dot: "#60a5fa" },
    "保留中": { bg: "rgba(245,158,11,0.2)", text: "#fcd34d", dot: "#fbbf24" },
    "キャンセル": { bg: "rgba(239,68,68,0.2)", text: "#fca5a5", dot: "#f87171" },
  },
};

const yen = n => "¥" + n.toLocaleString();

function Badge({ status, mode }) {
  const c = SC[mode][status] || { bg: "#f3f4f6", text: "#374151", dot: "#9ca3af" };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 20, background: c.bg, color: c.text, fontSize: 12, fontWeight: 600, letterSpacing: 0.3 }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.dot }} />{status}
    </span>
  );
}

function Bars({ data, t }) {
  const max = Math.max(...data.map(d => d.value));
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 120, padding: "0 4px" }}>
      {data.map((d, i) => {
        const h = (d.value / max) * 100, best = d.value === max;
        return (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 10, color: t.textMuted, fontWeight: 500 }}>{(d.value / 10000).toFixed(0)}万</span>
            <div style={{ width: "100%", height: `${h}%`, minHeight: 4, borderRadius: "6px 6px 3px 3px", background: best ? t.barActive : t.barDefault, transition: "height 0.6s cubic-bezier(0.34,1.56,0.64,1)" }} />
            <span style={{ fontSize: 12, fontWeight: best ? 700 : 500, color: best ? t.accent : t.textMuted }}>{d.day}</span>
          </div>
        );
      })}
    </div>
  );
}

function Donut({ data, t }) {
  const total = Object.values(data).reduce((a, b) => a + b, 0);
  const colors = ["#f59e0b", "#ec4899", "#3b82f6", "#6366f1", "#10b981", "#22c55e", "#ef4444"];
  const labels = ["保留中", "入金待ち", "確認済み", "準備中", "発送済み", "配達完了", "キャンセル"];
  let cum = 0;
  const segs = Object.entries(data).map(([, v], i) => { const s = cum; cum += v; return { s, e: cum, c: colors[i], l: labels[i], v }; });
  const r = 44, cx = 55, cy = 55;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
      <svg viewBox="0 0 110 110" style={{ width: 110, height: 110, flexShrink: 0 }}>
        {segs.map((seg, i) => {
          if (!seg.v) return null;
          const sa = (seg.s / total) * 360 - 90, ea = (seg.e / total) * 360 - 90;
          const la = ea - sa > 180 ? 1 : 0;
          const rad = Math.PI / 180;
          return <path key={i} d={`M ${cx + r * Math.cos(sa * rad)} ${cy + r * Math.sin(sa * rad)} A ${r} ${r} 0 ${la} 1 ${cx + r * Math.cos(ea * rad)} ${cy + r * Math.sin(ea * rad)}`} fill="none" stroke={seg.c} strokeWidth="12" strokeLinecap="round" />;
        })}
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize="18" fontWeight="800" fill={t.text}>{total}</text>
        <text x={cx} y={cy + 12} textAnchor="middle" fontSize="9" fill={t.textMuted} fontWeight="500">全注文</text>
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {segs.filter(s => s.v > 0).map((seg, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: seg.c, flexShrink: 0 }} />
            <span style={{ color: t.textSecondary, minWidth: 56 }}>{seg.l}</span>
            <span style={{ fontWeight: 700, color: t.text }}>{seg.v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const Sun = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>;
const Moon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>;

const I = {
  grid: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  bag: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>,
  tag: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>,
  users: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
  edit: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>,
  award: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>,
  mail: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
  gear: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
};

const NAV = [
  { label: "概要", icon: I.grid, active: true },
  { label: "注文管理", icon: I.bag, badge: 3 },
  { label: "商品", icon: I.tag },
  { label: "顧客", icon: I.users },
  { label: "サイト管理", icon: I.edit },
  { label: "販促", icon: I.award },
  { label: "メルマガ", icon: I.mail },
];

export default function ECDashboard() {
  const [mode, setMode] = useState("light");
  const [period, setPeriod] = useState("today");
  const [hNav, setHNav] = useState(null);
  const t = THEMES[mode];

  const kpi = {
    today: { orders: MOCK.todayOrders, revenue: MOCK.todayRevenue, label: "本日" },
    week: { orders: MOCK.weekOrders, revenue: MOCK.weekRevenue, label: "今週" },
    month: { orders: MOCK.monthOrders, revenue: MOCK.monthRevenue, label: "今月" },
  }[period];

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "'Noto Sans JP',-apple-system,sans-serif", background: t.bg, color: t.text, transition: "background .3s,color .3s" }}>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />

      {/* Sidebar */}
      <nav style={{ width: 220, flexShrink: 0, background: t.sidebarBg, borderRight: `1px solid ${t.border}`, display: "flex", flexDirection: "column", padding: "24px 12px", transition: "background .3s,border-color .3s" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 12px", marginBottom: 32 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 800, fontSize: 14 }}>EC</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, letterSpacing: -0.3 }}>My Store</div>
            <div style={{ fontSize: 10, color: t.textMuted, fontWeight: 500 }}>ダッシュボード</div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {NAV.map((item, i) => (
            <div key={i} onMouseEnter={() => setHNav(i)} onMouseLeave={() => setHNav(null)} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, cursor: "pointer",
              background: item.active ? t.accentBg : hNav === i ? t.surfaceHover : "transparent",
              color: item.active ? t.accent : t.textSecondary,
              fontWeight: item.active ? 600 : 500, fontSize: 13.5, transition: "all .15s",
            }}>
              {item.icon}{item.label}
              {item.badge && <span style={{ marginLeft: "auto", background: t.danger, color: "white", fontSize: 10, fontWeight: 700, borderRadius: 10, padding: "2px 7px" }}>{item.badge}</span>}
            </div>
          ))}
        </div>

        <div style={{ marginTop: "auto", padding: "16px 12px", borderTop: `1px solid ${t.borderLight}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", cursor: "pointer", color: t.textMuted, fontSize: 13, fontWeight: 500 }}>
            {I.gear} 設定
          </div>
        </div>
      </nav>

      {/* Main */}
      <main style={{ flex: 1, padding: "28px 32px", overflow: "auto", maxHeight: "100vh" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5, margin: 0 }}>ダッシュボード</h1>
            <p style={{ fontSize: 13, color: t.textMuted, margin: "4px 0 0" }}>2026年4月1日（火）</p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={() => setMode(m => m === "light" ? "dark" : "light")} style={{
              width: 40, height: 40, borderRadius: 10, border: `1px solid ${t.border}`,
              background: t.toggleBg, cursor: "pointer", color: t.toggleIcon,
              display: "flex", alignItems: "center", justifyContent: "center", transition: "all .3s",
            }}>{mode === "light" ? <Moon /> : <Sun />}</button>
            <button style={{ padding: "8px 16px", borderRadius: 10, border: `1px solid ${t.border}`, background: t.surface, fontSize: 13, fontWeight: 500, cursor: "pointer", color: t.textSecondary, display: "flex", alignItems: "center", gap: 6 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>新規注文
            </button>
            <button style={{ padding: "8px 16px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#6366f1,#818cf8)", fontSize: 13, fontWeight: 600, cursor: "pointer", color: "white", display: "flex", alignItems: "center", gap: 6, boxShadow: "0 2px 8px rgba(99,102,241,.3)" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>商品追加
            </button>
          </div>
        </div>

        {/* Period */}
        <div style={{ display: "inline-flex", background: t.tabBg, borderRadius: 12, padding: 3, marginBottom: 24, transition: "background .3s" }}>
          {[{ key: "today", label: "本日" }, { key: "week", label: "今週" }, { key: "month", label: "今月" }].map(tab => (
            <button key={tab.key} onClick={() => setPeriod(tab.key)} style={{
              padding: "7px 20px", borderRadius: 10, border: "none",
              background: period === tab.key ? t.tabActive : "transparent",
              color: period === tab.key ? t.text : t.textMuted,
              fontWeight: period === tab.key ? 600 : 500, fontSize: 13, cursor: "pointer",
              boxShadow: period === tab.key ? t.tabShadow : "none", transition: "all .2s",
            }}>{tab.label}</button>
          ))}
        </div>

        {/* KPI */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 24 }}>
          {[
            { label: `${kpi.label}の売上`, value: yen(kpi.revenue), sub: "前週比 +12.4%", sc: t.success, ac: t.accent, icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={t.accent} strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg> },
            { label: `${kpi.label}の注文`, value: `${kpi.orders}件`, sub: "前週比 +8.2%", sc: t.success, ac: "#8b5cf6", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/></svg> },
            { label: "要対応", value: `${MOCK.pendingOrders}件`, sub: "保留中 + 入金待ち", sc: t.warning, ac: t.warning, icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={t.warning} strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> },
            { label: "本日の配送", value: `${MOCK.shippingToday}件`, sub: "全日発送可能", sc: t.textSecondary, ac: t.success, icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={t.success} strokeWidth="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg> },
          ].map((c, i) => (
            <div key={i} style={{ background: t.surface, borderRadius: 16, padding: "20px 22px", border: `1px solid ${t.border}`, boxShadow: t.cardShadow, transition: "all .3s" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <span style={{ fontSize: 12, fontWeight: 500, color: t.textMuted }}>{c.label}</span>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: t.accentBg, display: "flex", alignItems: "center", justifyContent: "center" }}>{c.icon}</div>
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: -1, marginBottom: 4 }}>{c.value}</div>
              <span style={{ fontSize: 11, fontWeight: 500, color: c.sc }}>{c.sub}</span>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
          <div style={{ background: t.surface, borderRadius: 16, padding: 24, border: `1px solid ${t.border}`, boxShadow: t.cardShadow, transition: "all .3s" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>売上推移</h3>
                <p style={{ fontSize: 11, color: t.textMuted, margin: "2px 0 0" }}>今週の日別売上</p>
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: t.accent }}>¥2,023k</div>
            </div>
            <Bars data={MOCK.revenue} t={t} />
          </div>
          <div style={{ background: t.surface, borderRadius: 16, padding: 24, border: `1px solid ${t.border}`, boxShadow: t.cardShadow, transition: "all .3s" }}>
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>注文ステータス</h3>
              <p style={{ fontSize: 11, color: t.textMuted, margin: "2px 0 0" }}>ステータス別の注文数</p>
            </div>
            <Donut data={MOCK.statuses} t={t} />
          </div>
        </div>

        {/* Bottom */}
        <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 16 }}>
          <div style={{ background: t.surface, borderRadius: 16, padding: 24, border: `1px solid ${t.border}`, boxShadow: t.cardShadow, transition: "all .3s" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>最近の注文</h3>
                <p style={{ fontSize: 11, color: t.textMuted, margin: "2px 0 0" }}>直近の注文一覧</p>
              </div>
              <button style={{ padding: "6px 14px", borderRadius: 8, border: `1px solid ${t.border}`, background: t.surface, fontSize: 12, fontWeight: 500, color: t.accent, cursor: "pointer" }}>全て見る →</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr .8fr .8fr .7fr", padding: "8px 0", borderBottom: `1px solid ${t.borderLight}`, fontSize: 11, fontWeight: 600, color: t.textMuted, letterSpacing: 0.3, textTransform: "uppercase" }}>
              <span>注文ID</span><span>顧客</span><span>金額</span><span>ステータス</span><span>時刻</span>
            </div>
            {MOCK.orders.map((o, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr .8fr .8fr .7fr", alignItems: "center", padding: "12px 0", borderBottom: i < MOCK.orders.length - 1 ? `1px solid ${t.borderLight}` : "none", fontSize: 13, cursor: "pointer" }}>
                <span style={{ fontWeight: 600, color: t.accent, fontSize: 12 }}>{o.id}</span>
                <span style={{ fontWeight: 500 }}>{o.customer}</span>
                <span style={{ fontWeight: 600 }}>{yen(o.amount)}</span>
                <Badge status={o.status} mode={mode} />
                <span style={{ color: t.textMuted, fontSize: 12 }}>{o.time}</span>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ background: t.surface, borderRadius: 16, padding: 24, border: `1px solid ${t.border}`, boxShadow: t.cardShadow, transition: "all .3s" }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 4px" }}>人気商品</h3>
              <p style={{ fontSize: 11, color: t.textMuted, margin: "0 0 16px" }}>今月の売上トップ</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {MOCK.products.map((p, i) => {
                  const mx = Math.max(...MOCK.products.map(x => x.revenue));
                  return (
                    <div key={i}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                        <span style={{ fontSize: 12.5, fontWeight: 500 }}>{p.name}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: t.accent }}>{p.sales}個</span>
                      </div>
                      <div style={{ height: 6, background: t.borderLight, borderRadius: 4, overflow: "hidden" }}>
                        <div style={{ height: "100%", borderRadius: 4, width: `${(p.revenue / mx) * 100}%`, background: i === 0 ? "linear-gradient(90deg,#6366f1,#818cf8)" : `rgba(99,102,241,${0.5 - i * 0.1})`, transition: "width .8s" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ background: t.kpiGradient, borderRadius: 16, padding: 24, color: "white" }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 16px", opacity: 0.9 }}>クイック指標</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {[
                  { l: "コンバージョン率", v: `${MOCK.conversionRate}%` },
                  { l: "平均注文額", v: yen(MOCK.avgOrderValue) },
                  { l: "リピート率", v: `${MOCK.repeatRate}%` },
                  { l: "今週の新規会員", v: `${MOCK.newMembers}人` },
                ].map((s, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 12.5, opacity: 0.8 }}>{s.l}</span>
                    <span style={{ fontSize: 15, fontWeight: 800 }}>{s.v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
