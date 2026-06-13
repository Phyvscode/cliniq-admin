import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Pill, TrendingUp, TrendingDown, RefreshCw, Package, AlertCircle, ShoppingCart, IndianRupee, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

const BASE = (import.meta.env.VITE_API_URL as string) || "http://localhost:5000/api";
const tok  = () => localStorage.getItem("cliniq_token") || "";
const get  = async (path: string) => {
  const r = await fetch(`${BASE}${path}`, { headers: { Authorization: `Bearer ${tok()}` } });
  const d = await r.json();
  if (!r.ok) throw new Error(d.message);
  return d;
};

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

type Period = "today" | "week" | "month";

interface PharmacyStats {
  totalRevenue: number; totalItems: number; totalBills: number;
  avgBillValue: number; revenueChange: number;
}
interface TopMed { name: string; quantity: number; revenue: number; category: string; }
interface LowStock { name: string; stock: number; reorderLevel: number; category: string; }
interface DailyRevenue { date: string; revenue: number; bills: number; }
interface CategoryBreakdown { category: string; revenue: number; items: number; }

export const PharmacyAnalyticsTab = () => {
  const [period,   setPeriod]   = useState<Period>("today");
  const [stats,    setStats]    = useState<PharmacyStats | null>(null);
  const [topMeds,  setTopMeds]  = useState<TopMed[]>([]);
  const [lowStock, setLowStock] = useState<LowStock[]>([]);
  const [daily,    setDaily]    = useState<DailyRevenue[]>([]);
  const [cats,     setCats]     = useState<CategoryBreakdown[]>([]);
  const [loading,  setLoading]  = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [st, tm, ls, dv, cb] = await Promise.allSettled([
        get(`/pharmacy/analytics/stats?period=${period}`),
        get(`/pharmacy/analytics/top-medicines?period=${period}&limit=10`),
        get("/pharmacy/analytics/low-stock"),
        get(`/pharmacy/analytics/daily?period=${period}`),
        get(`/pharmacy/analytics/categories?period=${period}`),
      ]);
      if (st.status === "fulfilled") setStats(st.value.stats || st.value);
      if (tm.status === "fulfilled") setTopMeds(tm.value.medicines || []);
      if (ls.status === "fulfilled") setLowStock(ls.value.items || []);
      if (dv.status === "fulfilled") setDaily(dv.value.data || []);
      if (cb.status === "fulfilled") setCats(cb.value.categories || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [period]);

  const maxRev = Math.max(...daily.map(d => d.revenue), 1);
  const maxCat = Math.max(...cats.map(c => c.revenue), 1);

  const exportCSV = () => {
    const rows = [["Medicine", "Quantity Sold", "Revenue", "Category"], ...topMeds.map(m => [m.name, m.quantity, m.revenue, m.category])];
    const csv  = rows.map(r => r.join(",")).join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    link.download = `pharmacy-${period}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-foreground">Pharmacy Analytics</h2>
          <p className="text-sm text-muted-foreground">Sales, stock, and medicine performance</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2 rounded-xl">
            <Download className="w-4 h-4" /> Export
          </Button>
          <Button variant="outline" size="sm" onClick={load} className="gap-2 rounded-xl">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      {/* Period selector */}
      <div className="flex gap-2 mb-6">
        {(["today","week","month"] as Period[]).map(p => (
          <button key={p} onClick={() => setPeriod(p)} className={`px-5 py-2 rounded-xl text-sm font-medium capitalize border-2 transition-all ${
            period === p ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-primary/40"
          }`}>{p === "today" ? "Today" : p === "week" ? "This Week" : "This Month"}</button>
        ))}
      </div>

      {/* Stats row */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 bg-muted animate-pulse rounded-2xl" />)}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Revenue",      value: fmt(stats.totalRevenue),  icon: IndianRupee,  color: "text-emerald-500", bg: "bg-emerald-500/10", sub: `${stats.revenueChange >= 0 ? "+" : ""}${stats.revenueChange}% vs prev` },
            { label: "Bills Raised", value: stats.totalBills,         icon: ShoppingCart, color: "text-blue-500",    bg: "bg-blue-500/10",    sub: `Avg ${fmt(stats.avgBillValue)}` },
            { label: "Items Sold",   value: stats.totalItems,         icon: Package,      color: "text-violet-500",  bg: "bg-violet-500/10",  sub: "Total quantity" },
            { label: "Avg Bill",     value: fmt(stats.avgBillValue),  icon: Pill,         color: "text-amber-500",   bg: "bg-amber-500/10",   sub: "Per transaction" },
          ].map(s => (
            <div key={s.label} className="bg-card border border-border rounded-2xl p-4">
              <div className={`w-8 h-8 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>
                <s.icon className={`w-4 h-4 ${s.color}`} />
              </div>
              <p className="text-xl font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
              <p className={`text-xs mt-1 font-medium ${stats.revenueChange >= 0 ? "text-emerald-500" : "text-red-500"}`}>{s.sub}</p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Revenue chart */}
        {daily.length > 0 && (
          <div className="bg-card border border-border rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" /> Revenue Trend
            </h3>
            <div className="flex items-end gap-1.5 h-32">
              {daily.map((d, i) => {
                const h = Math.max(4, (d.revenue / maxRev) * 128);
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground text-[10px] px-2 py-1 rounded shadow opacity-0 group-hover:opacity-100 whitespace-nowrap z-10">
                      {fmt(d.revenue)}
                    </div>
                    <div className="w-full bg-primary/80 rounded-t-sm hover:bg-primary transition-colors" style={{ height: h }} />
                    <span className="text-[8px] text-muted-foreground truncate w-full text-center">
                      {new Date(d.date).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit" })}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Category breakdown */}
        {cats.length > 0 && (
          <div className="bg-card border border-border rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Category Breakdown</h3>
            <div className="space-y-3">
              {cats.map(c => {
                const pct = Math.round((c.revenue / maxCat) * 100);
                return (
                  <div key={c.category}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-foreground capitalize">{c.category}</span>
                      <span className="text-sm font-bold text-foreground">{fmt(c.revenue)}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6 }}
                        className="h-full bg-primary rounded-full" />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{c.items} items</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Top medicines */}
        <div className="bg-card border border-border rounded-2xl p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Pill className="w-4 h-4 text-primary" /> Top Selling Medicines
          </h3>
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-10 bg-muted animate-pulse rounded-xl" />)}</div>
          ) : topMeds.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No data available</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {["#", "Medicine", "Category", "Qty Sold", "Revenue", "Trend"].map(h => (
                      <th key={h} className="text-left pb-2 text-xs text-muted-foreground font-semibold pr-4 last:pr-0">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {topMeds.map((m, i) => (
                    <tr key={m.name} className="border-b border-border/50 last:border-0 hover:bg-muted/30">
                      <td className="py-2.5 pr-4 text-muted-foreground font-mono text-xs">{i + 1}</td>
                      <td className="py-2.5 pr-4 font-medium text-foreground">{m.name}</td>
                      <td className="py-2.5 pr-4">
                        <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full capitalize">{m.category}</span>
                      </td>
                      <td className="py-2.5 pr-4 text-foreground">{m.quantity}</td>
                      <td className="py-2.5 pr-4 font-semibold text-foreground">{fmt(m.revenue)}</td>
                      <td className="py-2.5">
                        {i < 3
                          ? <TrendingUp className="w-4 h-4 text-emerald-500" />
                          : <TrendingDown className="w-4 h-4 text-muted-foreground" />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Low stock alerts */}
        {lowStock.length > 0 && (
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-5 lg:col-span-2">
            <h3 className="text-sm font-semibold text-amber-600 mb-4 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> Low Stock Alerts ({lowStock.length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {lowStock.map(item => (
                <div key={item.name} className="bg-background border border-amber-500/20 rounded-xl p-3">
                  <p className="font-medium text-foreground text-sm">{item.name}</p>
                  <p className="text-xs text-muted-foreground capitalize mt-0.5">{item.category}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-red-500 font-bold text-sm">{item.stock} left</span>
                    <span className="text-xs text-muted-foreground">Reorder: {item.reorderLevel}</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-2">
                    <div className="h-full bg-red-500 rounded-full"
                      style={{ width: `${Math.min(100, Math.round((item.stock / item.reorderLevel) * 100))}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Empty state */}
      {!loading && !stats && topMeds.length === 0 && (
        <div className="text-center py-20 text-muted-foreground">
          <Pill className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">No pharmacy analytics data</p>
          <p className="text-sm mt-1">Backend /pharmacy/analytics/* endpoints need to be implemented</p>
          <Button variant="outline" size="sm" className="mt-4 rounded-xl gap-2" onClick={load}>
            <RefreshCw className="w-4 h-4" /> Retry
          </Button>
        </div>
      )}
    </div>
  );
};
