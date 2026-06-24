import { useState, useEffect } from "react";
import { Download } from "lucide-react";
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

const fmtShort = (n: number) =>
  n >= 10000000 ? `₹${(n / 10000000).toFixed(1)}Cr`
  : n >= 100000  ? `₹${(n / 100000).toFixed(1)}L`
  : n >= 1000    ? `₹${(n / 1000).toFixed(0)}K`
  : `₹${n}`;

interface StatCardProps { label: string; value: string | number; sub?: string; }
const StatCard = ({ label, value, sub }: StatCardProps) => (
  <div className="bg-white border border-gray-100 rounded-xl p-4">
    <p className="text-[10px] font-semibold tracking-widest text-gray-400 mb-2">{label}</p>
    <p className="text-3xl font-bold text-gray-900">{value}</p>
    {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
  </div>
);

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
  const [doctors, setDoctors] = useState<any[]>([]);
  const [beds,    setBeds]    = useState<any[]>([]);
  const [graph,   setGraph]   = useState<any[]>([]);
  const [pay,     setPay]     = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [s, r, dc, b, g, p] = await Promise.allSettled([
          get("/overview/today"),
          get("/revenue/stats"),
          get("/revenue/doctor-performance"),
          get("/beds"),
          get("/revenue/daily-graph"),
          get("/revenue/payment-breakdown"),
        ]);
        if (s.status  === "fulfilled") setSnap(s.value.snapshot || s.value);
        if (r.status  === "fulfilled") setRev(r.value);
        if (dc.status === "fulfilled") setDoctors((dc.value.doctors || []).slice(0, 5));
        if (b.status  === "fulfilled") setBeds(b.value.beds || []);
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
    { label: "TOTAL TODAY",  value: snap?.totalPatients ?? 0 },
    { label: "NEW",          value: snap?.newPatients   ?? 0 },
    { label: "EXISTING",     value: snap?.existing      ?? 0 },
    { label: "FOLLOW-UPS DUE",value: snap?.followUps     ?? 0 },
    { label: "FOLLOW-UPS OVERDUE", value: snap?.followUpsOverdue ?? 0 },
    { label: "DOCTORS ACTIVE", value: snap?.doctorsOnline ?? 0 },
  ];

  const revenueCards = [
    { label: "TODAY",     value: fmtShort(rev?.today     ?? 0) },
    { label: "THIS WEEK", value: fmtShort(rev?.week      ?? 0) },
    { label: "THIS MONTH",value: fmtShort(rev?.month     ?? 0) },
    { label: "PENDING",   value: fmtShort(rev?.pending   ?? 0) },
  ];

  const opsCards = [
    { label: "ADMISSIONS TODAY", value: snap?.admissions ?? 0 },
    { label: "DISCHARGES TODAY", value: snap?.discharges ?? 0 },
    { label: "BED OCCUPANCY",    value: `${snap?.bedOccupancyPct ?? 0}%`, sub: `${snap?.bedsOccupied ?? 0}/${snap?.bedsTotal ?? 0} beds` },
    { label: "LAB TESTS TODAY",  value: snap?.labTests ?? 0 },
    { label: "PHARMACY SALES",   value: fmtShort(snap?.pharmacySales ?? 0) },
  ];

  const totalPay   = pay.reduce((s: number, p: any) => s + (p.total || p.count || 0), 0);
  const payPie     = pay.slice(0, 4).map((p: any) => ({
    name: p.method || p._id || "Other",
    value: p.total || p.count || 1,
  }));
  const payLabels  = ["Insurance / TPA", "UPI / Digital", "Cash", "Card"];

  const occupiedBeds  = beds.filter(b => b.status === "occupied").length;
  const availableBeds = beds.filter(b => b.status === "available").length;

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
              {graph.length === 0 ? (
                <div className="h-[140px] flex items-center justify-center text-sm text-gray-400">No revenue recorded yet</div>
              ) : (
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
              )}
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
                <p className="text-xs font-semibold text-gray-400 tracking-widest mb-1">PENDING</p>
                <p className="text-xl font-bold text-gray-900">{fmtShort(rev?.pending ?? 0)}</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Operations Snapshot ────────────────────────────────────── */}
        <section>
          <SectionHeader title="Operations Snapshot" sub="The hospital's pulse — clinicians, beds, lab and pharmacy." />
          <div className="grid grid-cols-5 gap-3 mb-4">
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
              {doctors.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">No revenue recorded yet</p>
              ) : (
                <div className="space-y-3">
                  {doctors.map((d: any, i: number) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                        <span className="text-blue-700 text-xs font-semibold">
                          {(d.name || "D").split(" ").map((w: string) => w[0]).join("").slice(0, 2)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">Dr. {d.name}</p>
                        <p className="text-xs text-gray-400">{d.specialization} · {d.patientCount || 0} patients</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">{fmtShort(d.totalRevenue || 0)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bed occupancy + follow-ups */}
            <div className="space-y-3">
              <div className="bg-white border border-gray-100 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Live Bed Occupancy</p>
                    <p className="text-xs text-gray-400">{occupiedBeds}/{beds.length} beds occupied</p>
                  </div>
                  <button className="text-xs text-blue-600 hover:underline">Open map →</button>
                </div>
                {beds.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">No beds configured yet</p>
                ) : (
                  <>
                    <div className="grid gap-1" style={{ gridTemplateColumns: "repeat(12, 1fr)" }}>
                      {beds.map((b, i) => (
                        <div key={b._id || i} title={`${b.floor} · Bed ${b.bedNumber} · ${b.status}`}
                          className={`aspect-square rounded-sm ${b.status === "occupied" ? "bg-blue-600" : "bg-gray-100"}`} />
                      ))}
                    </div>
                    <div className="flex items-center gap-4 mt-2">
                      {[["bg-blue-600","Occupied"],["bg-gray-100","Available"]].map(([c,l]) => (
                        <div key={l} className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-sm ${c}`} />
                          <span className="text-[11px] text-gray-500">{l}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <div className="bg-white border border-gray-100 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-gray-900">Follow-ups</p>
                  <button className="text-xs text-blue-600 hover:underline">Open queue →</button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] font-semibold tracking-widest text-gray-400">DUE TODAY</p>
                    <p className="text-2xl font-bold text-gray-900">{snap?.followUps ?? 0}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold tracking-widest text-gray-400">OVERDUE</p>
                    <p className="text-2xl font-bold text-red-500">{snap?.followUpsOverdue ?? 0}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
