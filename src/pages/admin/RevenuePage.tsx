import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, Download } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, CartesianGrid,
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
  n >= 10000000 ? `₹${(n / 10000000).toFixed(2)}Cr`
  : n >= 100000  ? `₹${(n / 100000).toFixed(2)}L`
  : n >= 1000    ? `₹${(n / 1000).toFixed(0)}K`
  : `₹${n}`;

const PIE_COLORS = ["#3b5bdb", "#748ffc", "#bac8ff", "#e7f5ff"];
const PIE_LABELS = ["Insurance / TPA", "UPI / Digital", "Cash", "Card"];

interface HeadlineCardProps {
  label: string; value: string; sub?: string; change?: number;
}
const HeadlineCard = ({ label, value, sub, change }: HeadlineCardProps) => {
  const up = change === undefined || change >= 0;
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4">
      <p className="text-[10px] font-semibold tracking-widest text-gray-400 mb-2">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mb-1">{value}</p>
      <div className="flex items-center gap-1">
        {change !== undefined && (
          <span className={`flex items-center gap-1 text-xs font-semibold ${up ? "text-emerald-500" : "text-red-500"}`}>
            {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {up ? "+" : ""}{change.toFixed(1)}%
          </span>
        )}
        {sub && <span className="text-xs text-gray-400">{sub}</span>}
      </div>
    </div>
  );
};

export default function RevenuePage() {
  const today = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

  const [rev,    setRev]    = useState<any>(null);
  const [graph,  setGraph]  = useState<any[]>([]);
  const [hourly, setHourly] = useState<any[]>([]);
  const [depts,  setDepts]  = useState<any[]>([]);
  const [doctors,setDoctors]= useState<any[]>([]);
  const [pay,    setPay]    = useState<any[]>([]);
  const [loading,setLoading]= useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [r, g, h, dp, dc, p] = await Promise.allSettled([
          get("/revenue/stats"),
          get("/revenue/daily-graph"),
          get("/revenue/peak-hours"),
          get("/revenue/by-department"),
          get("/revenue/doctor-performance"),
          get("/revenue/payment-breakdown"),
        ]);
        if (r.status  === "fulfilled") setRev(r.value);
        if (g.status  === "fulfilled") setGraph(g.value.data || g.value.graph || []);
        if (h.status  === "fulfilled") setHourly(h.value.data || h.value.hours || []);
        if (dp.status === "fulfilled") setDepts(dp.value.departments || dp.value.data || []);
        if (dc.status === "fulfilled") setDoctors((dc.value.doctors || dc.value.data || []).slice(0, 8));
        if (p.status  === "fulfilled") setPay(p.value.breakdown || p.value.data || []);
      } finally { setLoading(false); }
    })();
  }, []);

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
    </div>
  );

  const headlines = [
    { label: "TODAY",      value: fmtShort(rev?.today  ?? 0) },
    { label: "THIS WEEK",  value: fmtShort(rev?.week   ?? 0) },
    { label: "THIS MONTH", value: fmtShort(rev?.month  ?? 0) },
    { label: "THIS YEAR",  value: fmtShort(rev?.year   ?? 0) },
    { label: "PENDING",    value: fmtShort(rev?.pending ?? 0) },
  ];

  const totalPay = pay.reduce((s: number, p: any) => s + (p.total || p.count || 1), 0);
  const payPie   = pay.slice(0, 4).map((p: any, i: number) => ({
    name: PIE_LABELS[i] || p.method || p._id,
    value: Math.max(p.total || p.count || 1, 1),
    pct: Math.round((p.total || p.count || 1) / (totalPay || 1) * 100),
  }));

  const monthlyData = graph;
  const hourlyData  = hourly;
  const deptList    = depts;
  const doctorList  = doctors;

  const maxDeptRev = Math.max(...deptList.map((d: any) => d.revenue || 0), 1);
  const totalDept  = deptList.reduce((s: number, d: any) => s + (d.revenue || 0), 0);

  return (
    <div className="flex-1 overflow-y-auto bg-[#f8f9fc]">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-gray-900">Revenue</h1>
          <span className="text-sm text-gray-400">{today} · Today</span>
        </div>
        <div className="flex items-center gap-3">
          <input placeholder="Search patients, doctors, UHID..." className="w-64 h-9 bg-gray-50 border border-gray-200 rounded-lg pl-4 pr-4 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none" />
          <button className="flex items-center gap-1.5 h-9 px-4 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </div>

      <div className="px-8 py-6 space-y-6">
        {/* Revenue Headlines */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">Revenue Headlines</h2>
            <div className="flex gap-2">
              <button className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 text-gray-600 hover:bg-gray-50">Excel</button>
              <button className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 text-gray-600 hover:bg-gray-50">Print</button>
              <button className="text-xs bg-blue-600 text-white rounded-lg px-3 py-1.5 hover:bg-blue-700">PDF</button>
            </div>
          </div>
          <div className="grid grid-cols-5 gap-3">
            {headlines.map(h => <HeadlineCard key={h.label} {...h} />)}
          </div>
        </section>

        {/* Monthly Trend + Payment Modes */}
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 bg-white border border-gray-100 rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-semibold text-gray-900">Monthly Trend</p>
                <p className="text-xs text-gray-400">Gross revenue by month, current FY</p>
              </div>
              <div className="flex gap-2">
                <button className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 text-gray-600">Print</button>
                <button className="text-xs bg-blue-600 text-white rounded-lg px-3 py-1.5">PDF</button>
              </div>
            </div>
            {monthlyData.length === 0 ? (
              <div className="h-[200px] flex items-center justify-center text-sm text-gray-400">No revenue recorded yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={monthlyData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} axisLine={false}
                    tickFormatter={(v: string) => {
                      try { return new Date(v).toLocaleDateString("en-IN", { month: "short" }); } catch { return v; }
                    }} />
                  <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} axisLine={false}
                    tickFormatter={(v: number) => `${(v / 100000).toFixed(0)}L`} />
                  <Tooltip formatter={(v: any) => [fmtShort(v), "Revenue"]} />
                  <Line type="monotone" dataKey="revenue" stroke="#3b5bdb" strokeWidth={2} dot={{ r: 3, fill: "#3b5bdb" }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="bg-white border border-gray-100 rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-semibold text-gray-900">Payment Modes</p>
                <p className="text-xs text-gray-400">Mix across today's collections</p>
              </div>
            </div>
            <div className="flex justify-center mb-3">
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie data={payPie.length ? payPie : [{ name: "None", value: 1, pct: 0 }]}
                    innerRadius={50} outerRadius={72} dataKey="value" startAngle={90} endAngle={-270}>
                    {(payPie.length ? payPie : [{ name: "None", value: 1, pct: 0 }]).map((_: any, i: number) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1.5">
              {PIE_LABELS.map((l, i) => (
                <div key={l} className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PIE_COLORS[i] }} />
                  <span className="text-xs text-gray-600 flex-1">{l}</span>
                  <span className="text-xs font-medium text-gray-500">
                    {payPie[i] ? `${fmtShort(payPie[i].value)} · ${payPie[i].pct}%` : "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Hourly Revenue */}
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold text-gray-900">Hourly Revenue · Today</p>
              <p className="text-xs text-gray-400">Click any bar to drill into transactions for that hour.</p>
            </div>
            <div className="flex gap-2">
              <button className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 text-gray-600">Excel</button>
              <button className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 text-gray-600">Print</button>
              <button className="text-xs bg-blue-600 text-white rounded-lg px-3 py-1.5">PDF</button>
            </div>
          </div>
          {hourlyData.length === 0 ? (
            <div className="h-[180px] flex items-center justify-center text-sm text-gray-400">No revenue recorded yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={hourlyData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <XAxis dataKey="hour" tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} axisLine={false}
                  tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: any) => [fmtShort(v), "Revenue"]} />
                <Bar dataKey="revenue" fill="#3b5bdb" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Department Revenue + Doctor Revenue */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white border border-gray-100 rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-gray-900">Department Revenue</p>
              <div className="flex gap-2">
                <button className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 text-gray-600">Excel</button>
                <button className="text-xs bg-blue-600 text-white rounded-lg px-3 py-1.5">PDF</button>
              </div>
            </div>
            {deptList.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No revenue recorded yet</p>
            ) : (
              <div className="space-y-3">
                {deptList.map((d: any) => {
                  const pct = Math.round((d.revenue || 0) / maxDeptRev * 100);
                  const share = Math.round((d.revenue || 0) / (totalDept || 1) * 100);
                  return (
                    <div key={d.department}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-gray-700">{d.department}</span>
                        <span className="text-sm font-medium text-gray-900">
                          {fmtShort(d.revenue || 0)} · <span className="text-gray-400">{share}%</span>
                        </span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-white border border-gray-100 rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-gray-900">Doctor Revenue</p>
              <div className="flex gap-2">
                <button className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 text-gray-600">Excel</button>
                <button className="text-xs bg-blue-600 text-white rounded-lg px-3 py-1.5">PDF</button>
              </div>
            </div>
            {doctorList.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No revenue recorded yet</p>
            ) : (
              <div className="space-y-3">
                {(() => {
                  const totalDoc = doctorList.reduce((s: number, d: any) => s + (d.totalRevenue || d.revenue || 0), 0);
                  return doctorList.map((d: any, i: number) => {
                    const rev = d.totalRevenue || d.revenue || 0;
                    const share = Math.round(rev / (totalDoc || 1) * 100);
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                          <span className="text-blue-700 text-xs font-semibold">
                            {(d.name || "D").split(" ").map((w: string) => w[0]).join("").slice(0, 2)}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">Dr. {d.name}</p>
                          <p className="text-xs text-gray-400">{d.specialization}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-gray-900">{fmtShort(rev)}</p>
                          <p className="text-xs text-emerald-500">{share}%</p>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
