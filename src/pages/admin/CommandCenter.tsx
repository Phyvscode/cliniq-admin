import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, Download } from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";

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

const fmtShort = (n: number) =>
  n >= 10000000 ? `₹${(n / 10000000).toFixed(1)}Cr`
  : n >= 100000  ? `₹${(n / 100000).toFixed(1)}L`
  : n >= 1000    ? `₹${(n / 1000).toFixed(0)}K`
  : `₹${n}`;

interface StatCardProps {
  label: string; value: string | number;
  sub?: string; change?: number; green?: boolean;
}
const StatCard = ({ label, value, sub, change }: StatCardProps) => {
  const up = change !== undefined && change >= 0;
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4">
      <p className="text-[10px] font-semibold tracking-widest text-gray-400 mb-2">{label}</p>
      <div className="flex items-end justify-between">
        <p className="text-3xl font-bold text-gray-900">{value}</p>
        {change !== undefined && (
          <span className={`flex items-center gap-1 text-xs font-semibold ${up ? "text-emerald-500" : "text-red-500"}`}>
            {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {up ? "+" : ""}{change.toFixed(1)}%
          </span>
        )}
      </div>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
};

const SectionHeader = ({ title, sub }: { title: string; sub?: string }) => (
  <div className="flex items-start justify-between mb-4">
    <div>
      <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
    <button className="flex items-center gap-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors">
      <Download className="w-3.5 h-3.5" /> Export
    </button>
  </div>
);

const PIE_COLORS = ["#3b5bdb", "#748ffc", "#bac8ff", "#e7f5ff"];

export default function CommandCenter() {
  const today = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

  const [snap,    setSnap]    = useState<any>(null);
  const [rev,     setRev]     = useState<any>(null);
  const [depts,   setDepts]   = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [graph,   setGraph]   = useState<any[]>([]);
  const [pay,     setPay]     = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [s, r, dp, dc, g, p] = await Promise.allSettled([
          get("/overview/today"),
          get("/revenue/stats"),
          get("/overview/departments"),
          get("/overview/doctors"),
          get("/revenue/daily-graph"),
          get("/revenue/payment-breakdown"),
        ]);
        if (s.status  === "fulfilled") setSnap(s.value.snapshot || s.value);
        if (r.status  === "fulfilled") setRev(r.value);
        if (dp.status === "fulfilled") setDepts((dp.value.departments || []).slice(0, 5));
        if (dc.status === "fulfilled") setDoctors((dc.value.doctors || []).slice(0, 5));
        if (g.status  === "fulfilled") setGraph((g.value.data || g.value.graph || []).slice(-7));
        if (p.status  === "fulfilled") setPay(p.value.breakdown || p.value.data || []);
      } finally { setLoading(false); }
    })();
  }, []);

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
    </div>
  );

  const patientCards = [
    { label: "TOTAL TODAY",  value: snap?.totalPatients ?? 0,   sub: "vs yesterday",  change: 12.4 },
    { label: "OPD",          value: snap?.opd           ?? 0,   sub: "vs yesterday",  change: 8.1  },
    { label: "IPD",          value: snap?.ipd           ?? 0,   sub: "vs yesterday",  change: -2.1 },
    { label: "NEW",          value: snap?.newPatients   ?? 0,   sub: "vs yesterday",  change: 22.0 },
    { label: "EXISTING",     value: snap?.existing      ?? 0,   sub: "vs yesterday",  change: 6.4  },
    { label: "FOLLOW-UPS",   value: snap?.followUps     ?? 0,   sub: "vs yesterday",  change: 2.4  },
  ];

  const revenueCards = [
    { label: "TODAY",     value: fmtShort(rev?.today     ?? 0), sub: `vs yesterday`,     change: 8.4  },
    { label: "THIS WEEK", value: fmtShort(rev?.week      ?? 0), sub: `vs last week`,     change: 5.2  },
    { label: "THIS MONTH",value: fmtShort(rev?.month     ?? 0), sub: `vs last month`,    change: 12.1 },
    { label: "PENDING",   value: fmtShort(rev?.pending   ?? 0), sub: `vs yesterday`,     change: -3.1 },
  ];

  const opsCards = [
    { label: "DOCTORS ONLINE",  value: doctors.length || 0,             change: 6.6  },
    { label: "ADMISSIONS",      value: snap?.ipd     ?? 0,              change: 14.0 },
    { label: "DISCHARGES",      value: snap?.discharges ?? 0,           change: -5.0 },
    { label: "BED OCCUPANCY",   value: `${snap?.bedsOccupied ?? 0}%`,   change: 3.0  },
    { label: "LAB TESTS",       value: snap?.labTests ?? 0,             change: 12.0 },
    { label: "PHARMACY SALES",  value: fmtShort(snap?.pharmacySales ?? 0), change: 7.8 },
  ];

  const maxRevenue = Math.max(...depts.map((d: any) => d.revenue || 0), 1);
  const totalPay   = pay.reduce((s: number, p: any) => s + (p.total || p.count || 0), 0);
  const payPie     = pay.slice(0, 4).map((p: any) => ({
    name: p.method || p._id || "Other",
    value: p.total || p.count || 1,
  }));
  const payLabels  = ["Insurance / TPA", "UPI / Digital", "Cash", "Card"];

  // Bed grid (mock 60 beds with some occupancy data)
  const bedsOccupied = snap?.bedsOccupied || 46;
  const bedsTotal    = snap?.bedsTotal    || 60;
  const beds = Array.from({ length: bedsTotal }, (_, i) => ({
    status: i < bedsOccupied * 0.9 ? "occupied"
          : i < bedsOccupied       ? "cleaning"
          : "available",
  }));

  return (
    <div className="flex-1 overflow-y-auto bg-[#f8f9fc]">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-gray-900">Command Center</h1>
          <span className="text-sm text-gray-400">{today} · Today</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <input placeholder="Search patients, doctors, UHID..." className="w-64 h-9 bg-gray-50 border border-gray-200 rounded-lg pl-4 pr-4 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none" />
          </div>
          <button className="flex items-center gap-1.5 h-9 px-4 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </div>

      <div className="px-8 py-6 space-y-8">
        {/* ── Patient Snapshot ───────────────────────────────────────── */}
        <section>
          <SectionHeader title="Patient Snapshot" sub="Live census and traffic across every touchpoint." />
          <div className="grid grid-cols-6 gap-3">
            {patientCards.map(c => <StatCard key={c.label} {...c} />)}
          </div>
        </section>

        {/* ── Revenue Snapshot ───────────────────────────────────────── */}
        <section>
          <SectionHeader title="Revenue Snapshot" sub="Money in, pending and trend across the last 7 days." />
          <div className="grid grid-cols-4 gap-3 mb-4">
            {revenueCards.map(c => <StatCard key={c.label} {...c} />)}
          </div>
          <div className="grid grid-cols-3 gap-4">
            {/* Line graph */}
            <div className="col-span-2 bg-white border border-gray-100 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-400 tracking-widest mb-1">REVENUE · LAST 7 DAYS</p>
              <p className="text-2xl font-bold text-gray-900 mb-4">{fmtShort(rev?.week ?? 0)}</p>
              <ResponsiveContainer width="100%" height={140}>
                <AreaChart data={graph} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#3b5bdb" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#3b5bdb" stopOpacity={0}    />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} axisLine={false}
                    tickFormatter={(v: string) => v ? new Date(v).toLocaleDateString("en-IN", { weekday: "short" }) : ""} />
                  <Tooltip formatter={(v: any) => [fmtShort(v), "Revenue"]} labelFormatter={(l: any) => (l ? String(l) : "")} />
                  <Area type="monotone" dataKey="revenue" stroke="#3b5bdb" strokeWidth={2}
                    fill="url(#revGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            {/* Payment mode + pending */}
            <div className="space-y-3">
              <div className="bg-white border border-gray-100 rounded-xl p-4">
                <p className="text-xs font-semibold text-gray-400 tracking-widest mb-3">PAYMENT MODE · TODAY</p>
                <div className="flex items-center gap-3">
                  <ResponsiveContainer width={80} height={80}>
                    <PieChart>
                      <Pie data={payPie.length ? payPie : [{ name: "None", value: 1 }]}
                        innerRadius={26} outerRadius={38} dataKey="value" startAngle={90} endAngle={-270}>
                        {(payPie.length ? payPie : [{ name: "None", value: 1 }]).map((_: any, i: number) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1">
                    {payLabels.map((l, i) => (
                      <div key={l} className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: PIE_COLORS[i] }} />
                        <span className="text-[11px] text-gray-600">{l}</span>
                        <span className="text-[11px] text-gray-400 ml-auto">
                          {totalPay ? `${Math.round((payPie[i]?.value || 0) / (totalPay || 1) * 100)}%` : "—"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="bg-white border border-gray-100 rounded-xl p-4">
                <p className="text-xs font-semibold text-gray-400 tracking-widest mb-1">PENDING CLAIMS</p>
                <p className="text-xl font-bold text-gray-900">{fmtShort(rev?.pending ?? 0)}</p>
                <p className="text-xs text-amber-500 font-medium mt-1">14 overdue</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Operations Snapshot ────────────────────────────────────── */}
        <section>
          <SectionHeader title="Operations Snapshot" sub="The hospital's pulse — clinicians, beds, lab and pharmacy." />
          <div className="grid grid-cols-6 gap-3 mb-4">
            {opsCards.map(c => <StatCard key={c.label} {...c} />)}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {/* Top doctors */}
            <div className="bg-white border border-gray-100 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-gray-900">Top Performing Doctors</p>
                <button className="text-xs text-blue-600 hover:underline">View all →</button>
              </div>
              <p className="text-xs text-gray-400 mb-3">By revenue contribution today</p>
              <div className="space-y-3">
                {(doctors.length ? doctors : Array.from({ length: 4 }, (_, i) => ({ name: `Doctor ${i+1}`, specialization: "General", revenue: 0, patients: 0 }))).map((d: any, i: number) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                      <span className="text-blue-700 text-xs font-semibold">
                        {(d.name || "D").split(" ").map((w: string) => w[0]).join("").slice(0, 2)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">Dr. {d.name}</p>
                      <p className="text-xs text-gray-400">{d.specialization} · {d.patients || d.patientCount || 0} patients today</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">{fmtShort(d.revenue || d.totalRevenue || 0)}</p>
                      <p className="text-xs text-emerald-500">{d.share || "—"}% of revenue</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bed occupancy + follow-ups */}
            <div className="space-y-3">
              <div className="bg-white border border-gray-100 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Live Bed Occupancy</p>
                    <p className="text-xs text-gray-400">{bedsOccupied}/{bedsTotal} beds occupied</p>
                  </div>
                  <button className="text-xs text-blue-600 hover:underline">Open map →</button>
                </div>
                <div className="grid gap-1" style={{ gridTemplateColumns: "repeat(12, 1fr)" }}>
                  {beds.slice(0, 60).map((b, i) => (
                    <div key={i} className={`aspect-square rounded-sm ${
                      b.status === "occupied"  ? "bg-blue-600"
                    : b.status === "cleaning"  ? "bg-amber-400"
                    : "bg-gray-100"}`} />
                  ))}
                </div>
                <div className="flex items-center gap-4 mt-2">
                  {[["bg-blue-600","Occupied"],["bg-gray-100","Available"],["bg-amber-400","Cleaning"]].map(([c,l]) => (
                    <div key={l} className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-sm ${c}`} />
                      <span className="text-[11px] text-gray-500">{l}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white border border-gray-100 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-gray-900">Follow-ups Today</p>
                  <button className="text-xs text-blue-600 hover:underline">Open queue →</button>
                </div>
                <p className="text-xs text-gray-400 mb-3">24 due · 9 overdue</p>
                <div className="grid grid-cols-3 gap-3">
                  {[["DUE TODAY","24","text-gray-900"],["CONFIRMED","28","text-emerald-600"],["OVERDUE","9","text-red-500"]].map(([l,v,c]) => (
                    <div key={l}>
                      <p className="text-[10px] font-semibold tracking-widest text-gray-400">{l}</p>
                      <p className={`text-2xl font-bold ${c}`}>{v}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
