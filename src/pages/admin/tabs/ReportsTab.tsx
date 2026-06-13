import { useState } from "react";
import { motion } from "framer-motion";
import {
  FileText, Download, RefreshCw, Calendar, Filter,
  IndianRupee, Users, FlaskConical, Pill, Bed, BarChart2,
  Loader2, CheckCircle2, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const BASE = (import.meta.env.VITE_API_URL as string) || "http://localhost:5000/api";
const tok  = () => localStorage.getItem("cliniq_token") || "";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

type ReportType = "revenue" | "patients" | "lab" | "pharmacy" | "ipd" | "staff" | "comprehensive";
type Status = "idle" | "loading" | "success" | "error";

interface ReportMeta { type: ReportType; label: string; icon: any; desc: string; color: string; bg: string; }

const REPORTS: ReportMeta[] = [
  { type: "revenue",       label: "Revenue Report",       icon: IndianRupee, desc: "Billing, collections, dues, department-wise",  color: "text-emerald-500", bg: "bg-emerald-500/10" },
  { type: "patients",      label: "Patient Report",       icon: Users,       desc: "OPD/IPD counts, demographics, return visits",  color: "text-blue-500",    bg: "bg-blue-500/10"    },
  { type: "lab",           label: "Laboratory Report",    icon: FlaskConical,desc: "Test volumes, turnaround, pending status",      color: "text-cyan-500",    bg: "bg-cyan-500/10"    },
  { type: "pharmacy",      label: "Pharmacy Report",      icon: Pill,        desc: "Sales, stock movement, low-stock summary",     color: "text-rose-500",    bg: "bg-rose-500/10"    },
  { type: "ipd",           label: "IPD / Beds Report",    icon: Bed,         desc: "Admissions, discharges, bed occupancy, dues",  color: "text-violet-500",  bg: "bg-violet-500/10"  },
  { type: "staff",         label: "Staff Report",         icon: Users,       desc: "Attendance, salary, performance summary",      color: "text-amber-500",   bg: "bg-amber-500/10"   },
  { type: "comprehensive", label: "Comprehensive Report", icon: BarChart2,   desc: "All modules combined — full hospital report",  color: "text-primary",     bg: "bg-primary/10"     },
];

const toISODate = (d: Date) => d.toISOString().slice(0, 10);
const today     = toISODate(new Date());
const monthStart = toISODate(new Date(new Date().getFullYear(), new Date().getMonth(), 1));

export const ReportsTab = () => {
  const [from,     setFrom]     = useState(monthStart);
  const [to,       setTo]       = useState(today);
  const [selected, setSelected] = useState<ReportType | null>(null);
  const [status,   setStatus]   = useState<Status>("idle");
  const [preview,  setPreview]  = useState<any>(null);
  const [error,    setError]    = useState("");

  const generate = async (type: ReportType, format: "json" | "csv") => {
    setSelected(type);
    setStatus("loading");
    setError("");
    setPreview(null);
    try {
      const url    = `${BASE}/reports/${type}?from=${from}&to=${to}&format=${format}`;
      const resp   = await fetch(url, { headers: { Authorization: `Bearer ${tok()}` } });
      if (!resp.ok) {
        const d = await resp.json().catch(() => ({ message: resp.statusText }));
        throw new Error(d.message);
      }
      if (format === "csv") {
        const blob   = await resp.blob();
        const link   = document.createElement("a");
        link.href    = URL.createObjectURL(blob);
        link.download = `${type}-report-${from}-to-${to}.csv`;
        link.click();
        setStatus("success");
      } else {
        const data = await resp.json();
        setPreview(data);
        setStatus("success");
      }
    } catch (e: any) {
      setError(e.message || "Failed to generate report");
      setStatus("error");
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-foreground">Reports Center</h2>
        <p className="text-sm text-muted-foreground">Generate and export clinic reports for any period</p>
      </div>

      {/* Date range */}
      <div className="bg-card border border-border rounded-2xl p-5 mb-6">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" /> Date Range
        </h3>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground font-medium">From</label>
            <Input type="date" value={from} onChange={e => setFrom(e.target.value)}
              className="w-40 h-9 rounded-xl text-sm" max={to} />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground font-medium">To</label>
            <Input type="date" value={to} onChange={e => setTo(e.target.value)}
              className="w-40 h-9 rounded-xl text-sm" min={from} max={today} />
          </div>
          {/* Quick presets */}
          <div className="flex gap-2 flex-wrap">
            {[
              { label: "Today",     f: today,      t: today                                                                 },
              { label: "This Week", f: toISODate(new Date(Date.now() - 6 * 86400000)), t: today                            },
              { label: "This Month",f: monthStart, t: today                                                                },
              { label: "Last 3M",  f: toISODate(new Date(new Date().getFullYear(), new Date().getMonth() - 3, 1)), t: today},
            ].map(p => (
              <button key={p.label} onClick={() => { setFrom(p.f); setTo(p.t); }}
                className="px-3 py-1.5 text-xs rounded-lg border border-border text-muted-foreground hover:border-primary hover:text-primary transition-all">
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Report cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {REPORTS.map(r => (
          <motion.div key={r.type} whileHover={{ scale: 1.01 }}
            className={`bg-card border-2 rounded-2xl p-4 flex flex-col gap-3 transition-all cursor-default ${
              selected === r.type && status === "loading" ? "border-primary" : "border-border hover:border-primary/30"
            }`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${r.bg} flex items-center justify-center shrink-0`}>
                <r.icon className={`w-5 h-5 ${r.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground text-sm">{r.label}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{r.desc}</p>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button size="sm" variant="outline" onClick={() => generate(r.type, "json")}
                disabled={selected === r.type && status === "loading"}
                className="flex-1 rounded-xl h-8 text-xs gap-1.5">
                {selected === r.type && status === "loading"
                  ? <Loader2 className="w-3 h-3 animate-spin" />
                  : <FileText className="w-3 h-3" />}
                Preview
              </Button>
              <Button size="sm" onClick={() => generate(r.type, "csv")}
                disabled={selected === r.type && status === "loading"}
                className="flex-1 rounded-xl h-8 text-xs gap-1.5">
                <Download className="w-3 h-3" /> CSV
              </Button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Status / Preview */}
      {status === "error" && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-red-700 dark:text-red-400 text-sm">Failed to generate report</p>
            <p className="text-xs text-red-600 dark:text-red-500 mt-0.5">{error}</p>
            <p className="text-xs text-muted-foreground mt-1">Ensure the backend /reports/* endpoints are implemented</p>
          </div>
        </div>
      )}

      {status === "success" && !preview && (
        <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
          <p className="text-sm text-emerald-700 dark:text-emerald-400">CSV downloaded successfully</p>
        </div>
      )}

      {preview && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <p className="text-sm font-semibold text-foreground">
                {REPORTS.find(r => r.type === selected)?.label} — {from} to {to}
              </p>
            </div>
            <button onClick={() => { setPreview(null); setStatus("idle"); setSelected(null); }}
              className="text-xs text-muted-foreground hover:text-foreground">
              Close
            </button>
          </div>
          <div className="p-5 overflow-auto max-h-96">
            {/* Summary stats if present */}
            {preview.summary && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                {Object.entries(preview.summary as Record<string, number | string>).map(([k, v]) => (
                  <div key={k} className="bg-muted/50 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground capitalize">{k.replace(/([A-Z])/g, " $1")}</p>
                    <p className="text-lg font-bold text-foreground mt-1">
                      {typeof v === "number" && k.toLowerCase().includes("revenue") ? fmt(v) : String(v)}
                    </p>
                  </div>
                ))}
              </div>
            )}
            {/* Raw JSON preview */}
            <pre className="text-xs text-muted-foreground bg-muted/40 rounded-xl p-4 overflow-auto max-h-64">
              {JSON.stringify(preview, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* Info note */}
      <div className="mt-6 flex items-start gap-2 text-muted-foreground">
        <Filter className="w-4 h-4 mt-0.5 shrink-0" />
        <p className="text-xs">Reports are generated in real-time from the database. CSV exports download directly to your device.</p>
      </div>
    </div>
  );
};
