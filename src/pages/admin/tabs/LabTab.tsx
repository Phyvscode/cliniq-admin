import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FlaskConical, RefreshCw, TrendingUp, TrendingDown, Clock, CheckCircle2, AlertCircle, Download, IndianRupee, Activity } from "lucide-react";
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

interface LabStats {
  totalTests: number; completed: number; pending: number; revenue: number;
  avgTurnaround: number; revenueChange: number;
}
interface TestEntry { name: string; count: number; revenue: number; avgTime: number; category: string; }
interface DailyData  { date: string; tests: number; revenue: number; }
interface CatBreak   { category: string; count: number; revenue: number; }

export const LabTab = () => {
  const [period,  setPeriod]  = useState<Period>("today");
  const [stats,   setStats]   = useState<LabStats | null>(null);
  const [tests,   setTests]   = useState<TestEntry[]>([]);
  const [daily,   setDaily]   = useState<DailyData[]>([]);
  const [cats,    setCats]    = useState<CatBreak[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [st, tt, dv, cb] = await Promise.allSettled([
        get(`/lab/analytics/stats?period=${period}`),
        get(`/lab/analytics/tests?period=${period}&limit=10`),
        get(`/lab/analytics/daily?period=${period}`),
        get(`/lab/analytics/categories?period=${period}`),
      ]);
      if (st.status === "fulfilled") setStats(st.value.stats || st.value);
      if (tt.status === "fulfilled") setTests(tt.value.tests || []);
      if (dv.status === "fulfilled") setDaily(dv.value.data || []);
      if (cb.status === "fulfilled") setCats(cb.value.categories || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [period]);

  const maxRev  = Math.max(...daily.map(d => d.revenue), 1);
  const maxCat  = Math.max(...cats.map(c => c.revenue), 1);

  const exportCSV = () => {
    const rows = [["Test Name", "Count", "Revenue", "Avg Turnaround (min)", "Category"],
      ...tests.map(t => [t.name, t.count, t.revenue, t.avgTime, t.category])];
    const csv  = rows.map(r => r.join(",")).join("\n");
    const link = document.createElement("a");
    link.href  = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    link.download = `lab-${period}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  const completionRate = stats ? Math.round((stats.completed / (stats.totalTests || 1)) * 100) : 0;

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-foreground">Laboratory Analytics</h2>
          <p className="text-sm text-muted-foreground">Test volumes, turnaround, and revenue</p>
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

      {/* Stats */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 bg-muted animate-pulse rounded-2xl" />)}
        </div>
      ) : stats ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: "Total Tests",    value: stats.totalTests,   icon: FlaskConical,  color: "text-primary",      bg: "bg-primary/10"     },
              { label: "Revenue",        value: fmt(stats.revenue), icon: IndianRupee,   color: "text-emerald-500",  bg: "bg-emerald-500/10" },
              { label: "Completed",      value: stats.completed,    icon: CheckCircle2,  color: "text-emerald-500",  bg: "bg-emerald-500/10" },
              { label: "Avg Turnaround", value: `${stats.avgTurnaround}m`, icon: Clock, color: "text-amber-500",    bg: "bg-amber-500/10"   },
            ].map(s => (
              <div key={s.label} className="bg-card border border-border rounded-2xl p-4">
                <div className={`w-8 h-8 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                </div>
                <p className="text-xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Completion rate + Revenue change */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-card border border-border rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-foreground">Completion Rate</p>
                <span className={`text-sm font-bold ${completionRate >= 80 ? "text-emerald-500" : completionRate >= 50 ? "text-amber-500" : "text-red-500"}`}>
                  {completionRate}%
                </span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${completionRate}%` }} transition={{ duration: 0.8 }}
                  className={`h-full rounded-full ${completionRate >= 80 ? "bg-emerald-500" : completionRate >= 50 ? "bg-amber-500" : "bg-red-500"}`} />
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                <span>{stats.completed} completed</span>
                <span>{stats.pending} pending</span>
              </div>
            </div>
            <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stats.revenueChange >= 0 ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
                {stats.revenueChange >= 0
                  ? <TrendingUp className="w-5 h-5 text-emerald-500" />
                  : <TrendingDown className="w-5 h-5 text-red-500" />}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">vs Previous Period</p>
                <p className={`text-xl font-bold ${stats.revenueChange >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                  {stats.revenueChange >= 0 ? "+" : ""}{stats.revenueChange}%
                </p>
              </div>
            </div>
          </div>
        </>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Daily trend */}
        {daily.length > 0 && (
          <div className="bg-card border border-border rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" /> Daily Test Volume &amp; Revenue
            </h3>
            <div className="flex items-end gap-1.5 h-32">
              {daily.map((d, i) => {
                const h = Math.max(4, (d.revenue / maxRev) * 128);
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground text-[10px] px-2 py-1 rounded shadow opacity-0 group-hover:opacity-100 whitespace-nowrap z-10">
                      {d.tests} tests · {fmt(d.revenue)}
                    </div>
                    <div className="w-full bg-cyan-500/80 rounded-t-sm hover:bg-cyan-500 transition-colors" style={{ height: h }} />
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
            <h3 className="text-sm font-semibold text-foreground mb-4">Test Category Breakdown</h3>
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
                        className="h-full bg-cyan-500 rounded-full" />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{c.count} tests</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Top tests table */}
        <div className="bg-card border border-border rounded-2xl p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-cyan-500" /> Top Tests by Volume
          </h3>
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-10 bg-muted animate-pulse rounded-xl" />)}</div>
          ) : tests.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-40" />
              <p className="text-sm text-muted-foreground">No test data available</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {["#", "Test Name", "Category", "Count", "Revenue", "Avg Turnaround"].map(h => (
                      <th key={h} className="text-left pb-2 text-xs text-muted-foreground font-semibold pr-4 last:pr-0">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tests.map((t, i) => (
                    <tr key={t.name} className="border-b border-border/50 last:border-0 hover:bg-muted/30">
                      <td className="py-2.5 pr-4 text-muted-foreground font-mono text-xs">{i + 1}</td>
                      <td className="py-2.5 pr-4 font-medium text-foreground">{t.name}</td>
                      <td className="py-2.5 pr-4">
                        <span className="px-2 py-0.5 bg-cyan-500/10 text-cyan-600 text-xs rounded-full capitalize">{t.category}</span>
                      </td>
                      <td className="py-2.5 pr-4 text-foreground">{t.count}</td>
                      <td className="py-2.5 pr-4 font-semibold text-foreground">{fmt(t.revenue)}</td>
                      <td className="py-2.5">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{t.avgTime} min</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Empty state */}
      {!loading && !stats && tests.length === 0 && (
        <div className="text-center py-20 text-muted-foreground">
          <FlaskConical className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">No lab analytics data</p>
          <p className="text-sm mt-1">Backend /lab/analytics/* endpoints need to be implemented</p>
          <Button variant="outline" size="sm" className="mt-4 rounded-xl gap-2" onClick={load}>
            <RefreshCw className="w-4 h-4" /> Retry
          </Button>
        </div>
      )}
    </div>
  );
};
