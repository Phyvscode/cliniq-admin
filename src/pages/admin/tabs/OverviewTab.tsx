import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Users, Activity, Bed, IndianRupee, FlaskConical, Pill,
  TrendingUp, TrendingDown, RefreshCw, AlertCircle, Bell,
  Stethoscope, LayoutGrid, CheckCircle2, Clock,
} from "lucide-react";
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

interface Snapshot {
  totalPatients: number; opd: number; ipd: number; revenue: number;
  labTests: number; pharmacySales: number;
  bedsOccupied: number; bedsTotal: number;
}
interface DeptPerf { department: string; revenue: number; patients: number; growth: number; }
interface DoctorPerf { name: string; specialization: string; patients: number; revenue: number; avgTime: number; }
interface Alert { type: "danger"|"warning"|"info"; title: string; message: string; }

export const OverviewTab = ({ setTab }: { setTab: (t: string) => void }) => {
  const [snap,    setSnap]    = useState<Snapshot | null>(null);
  const [depts,   setDepts]   = useState<DeptPerf[]>([]);
  const [doctors, setDoctors] = useState<DoctorPerf[]>([]);
  const [alerts,  setAlerts]  = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshedAt, setRefreshedAt] = useState(new Date());

  const load = async () => {
    setLoading(true);
    try {
      const [s, dp, dc, al] = await Promise.allSettled([
        get("/overview/today"),
        get("/overview/departments"),
        get("/overview/doctors"),
        get("/overview/alerts"),
      ]);
      if (s.status  === "fulfilled") setSnap(s.value.snapshot || s.value);
      if (dp.status === "fulfilled") setDepts(dp.value.departments || []);
      if (dc.status === "fulfilled") setDoctors(dc.value.doctors || []);
      if (al.status === "fulfilled") setAlerts(al.value.alerts || []);
    } finally {
      setLoading(false);
      setRefreshedAt(new Date());
    }
  };

  useEffect(() => { load(); }, []);

  const SNAP_CARDS = snap ? [
    { label: "Total Patients", value: snap.totalPatients, icon: Users,        color: "text-blue-500",    bg: "bg-blue-500/10",    onClick: () => setTab("reports") },
    { label: "OPD Today",      value: snap.opd,          icon: Activity,      color: "text-emerald-500", bg: "bg-emerald-500/10", onClick: () => setTab("reports") },
    { label: "IPD Admissions", value: snap.ipd,          icon: Bed,           color: "text-violet-500",  bg: "bg-violet-500/10",  onClick: () => setTab("beds")    },
    { label: "Revenue Today",  value: fmt(snap.revenue), icon: IndianRupee,   color: "text-amber-500",   bg: "bg-amber-500/10",   onClick: () => setTab("revenue") },
    { label: "Lab Tests",      value: snap.labTests,     icon: FlaskConical,  color: "text-cyan-500",    bg: "bg-cyan-500/10",    onClick: () => setTab("lab")     },
    { label: "Pharmacy Sales", value: fmt(snap.pharmacySales), icon: Pill,    color: "text-rose-500",    bg: "bg-rose-500/10",    onClick: () => setTab("pharmacy")},
    {
      label: "Bed Occupancy",
      value: `${snap.bedsOccupied}/${snap.bedsTotal}`,
      icon:  LayoutGrid,
      color: snap.bedsOccupied / (snap.bedsTotal || 1) > 0.8 ? "text-red-500" : "text-emerald-500",
      bg:    snap.bedsOccupied / (snap.bedsTotal || 1) > 0.8 ? "bg-red-500/10" : "bg-emerald-500/10",
      onClick: () => setTab("beds"),
    },
  ] : [];

  const totalDeptRev = depts.reduce((s, d) => s + d.revenue, 0);

  const alertStyle: Record<string, string> = {
    danger:  "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400",
    warning: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400",
    info:    "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400",
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Hospital Overview</h2>
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2 rounded-xl">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Loading..." : `Refreshed ${refreshedAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`}
        </Button>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Bell className="w-4 h-4 text-amber-500" /> Active Alerts
          </h3>
          <div className="grid grid-cols-1 gap-2">
            {alerts.map((a, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                className={`flex items-start gap-3 border rounded-xl px-4 py-3 ${alertStyle[a.type]}`}>
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold">{a.title}</p>
                  <p className="text-xs mt-0.5 opacity-80">{a.message}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Today's Snapshot */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">Today's Snapshot</h3>
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-24 bg-muted animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {SNAP_CARDS.map((c, i) => (
              <motion.button key={c.label} onClick={c.onClick}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                className="bg-card border border-border rounded-2xl p-4 text-left hover:border-primary/30 hover:bg-primary/5 transition-all group">
                <div className={`w-9 h-9 rounded-xl ${c.bg} flex items-center justify-center mb-3`}>
                  <c.icon className={`w-4 h-4 ${c.color}`} />
                </div>
                <p className="text-xl font-bold text-foreground">{c.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{c.label}</p>
              </motion.button>
            ))}
            {!snap && !loading && (
              <div className="col-span-full text-center py-8 text-muted-foreground text-sm">
                No overview data — ensure backend /overview/today endpoint is live
              </div>
            )}
          </div>
        )}
      </div>

      {/* Department Performance */}
      {(depts.length > 0 || loading) && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">Department Performance</h3>
          {loading ? (
            <div className="h-40 bg-muted animate-pulse rounded-2xl" />
          ) : (
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    {["Department", "Revenue", "Revenue %", "Patients", "Growth"].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {depts.map((d, i) => {
                    const pct     = totalDeptRev > 0 ? Math.round((d.revenue / totalDeptRev) * 100) : 0;
                    const growing = d.growth >= 0;
                    return (
                      <tr key={d.department} className={`border-b border-border last:border-0 ${i % 2 === 0 ? "" : "bg-muted/20"}`}>
                        <td className="px-4 py-3 font-medium text-foreground">{d.department}</td>
                        <td className="px-4 py-3 font-semibold text-foreground">{fmt(d.revenue)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs text-muted-foreground">{pct}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{d.patients}</td>
                        <td className="px-4 py-3">
                          <span className={`flex items-center gap-1 text-xs font-semibold ${growing ? "text-emerald-500" : "text-red-500"}`}>
                            {growing ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            {Math.abs(d.growth)}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Doctor Performance */}
      {(doctors.length > 0 || loading) && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">Doctor Performance — Today</h3>
          {loading ? (
            <div className="h-40 bg-muted animate-pulse rounded-2xl" />
          ) : (
            <div className="space-y-3">
              {doctors.map((d, i) => (
                <motion.div key={d.name} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Stethoscope className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground">Dr. {d.name}</p>
                    <p className="text-xs text-muted-foreground">{d.specialization}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-center shrink-0">
                    <div>
                      <p className="text-lg font-bold text-foreground">{d.patients}</p>
                      <p className="text-[10px] text-muted-foreground">Patients</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-foreground">{fmt(d.revenue)}</p>
                      <p className="text-[10px] text-muted-foreground">Revenue</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-foreground flex items-center justify-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-muted-foreground" />{d.avgTime}<span className="text-xs font-normal text-muted-foreground">m</span>
                      </p>
                      <p className="text-[10px] text-muted-foreground">Avg Time</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* No data state */}
      {!loading && !snap && depts.length === 0 && doctors.length === 0 && (
        <div className="text-center py-20 text-muted-foreground">
          <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">Overview data not yet available</p>
          <p className="text-sm mt-1">Backend overview endpoints need to be implemented</p>
          <Button variant="outline" size="sm" className="mt-4 rounded-xl gap-2" onClick={load}>
            <RefreshCw className="w-4 h-4" /> Retry
          </Button>
        </div>
      )}
    </div>
  );
};
