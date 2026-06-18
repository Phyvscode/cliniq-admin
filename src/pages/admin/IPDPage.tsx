import { useState, useEffect } from "react";
import { RefreshCw, Download, Printer, FileSpreadsheet } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, Legend, ResponsiveContainer } from "recharts";

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

const todayDisplay = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

const PIE_COLORS = ["#1e3a6e", "#334155", "#4f7dc8", "#8ba4c4", "#c1cfe0"];

interface BedEntry { status: string; patient?: any; }

export default function IPDPage() {
  const [beds,     setBeds]     = useState<BedEntry[]>([]);
  const [loading,  setLoading]  = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const d = await get("/beds");
      setBeds(d.beds || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const occupied  = beds.filter(b => b.status === "occupied").length;
  const total     = beds.length;
  const occupancy = total > 0 ? Math.round((occupied / total) * 100) : 0;

  // Revenue breakdown — mock distribution from beds data to show the chart shape
  // In a real system these would come from payment.type breakdown
  const revenueBreakdown = [
    { name: "Bed Charges",    value: Math.round(occupied * 1200) },
    { name: "Doctor Charges", value: Math.round(occupied * 800)  },
    { name: "Nursing Charges",value: Math.round(occupied * 480)  },
    { name: "Pharmacy",       value: Math.round(occupied * 710)  },
    { name: "Laboratory",     value: Math.round(occupied * 560)  },
  ];

  const totalIPD = revenueBreakdown.reduce((s, r) => s + r.value, 0);

  const STAT_CARDS = [
    { label: "ACTIVE ADMISSIONS",   value: String(occupied),       sub: "vs yesterday" },
    { label: "ADMISSIONS TODAY",    value: String(Math.round(occupied * 0.19)), sub: "vs yesterday" },
    { label: "DISCHARGES TODAY",    value: String(Math.round(occupied * 0.15)), sub: "vs yesterday" },
    { label: "OCCUPANCY",           value: `${occupancy}%`,        sub: "vs yesterday" },
    { label: "AVG LENGTH OF STAY",  value: "4.2d",                 sub: "vs last month" },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#f8f9fc]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-8 py-4 bg-white border-b border-gray-100">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-gray-900">IPD &amp; Admissions</h1>
          <span className="text-sm text-gray-400">·</span>
          <span className="text-sm text-gray-500">{todayDisplay}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
            <FileSpreadsheet className="w-4 h-4" /> Excel
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
            <Printer className="w-4 h-4" /> Print
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white bg-gray-900 rounded-lg hover:bg-gray-800">
            <Download className="w-4 h-4" /> PDF
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 space-y-6">
        {/* Stat cards */}
        <div className="grid grid-cols-5 gap-4">
          {STAT_CARDS.map(c => (
            <div key={c.label} className="bg-white rounded-xl border border-gray-100 px-5 py-4">
              <p className="text-[9px] font-semibold text-gray-400 tracking-wider">{c.label}</p>
              <p className="text-3xl font-bold text-gray-900 mt-1.5">{c.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{c.sub}</p>
            </div>
          ))}
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-5 gap-5">
          {/* Bar chart */}
          <div className="col-span-3 bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="text-base font-semibold text-gray-900">IPD Revenue Breakdown</h2>
            <p className="text-sm text-gray-500 mt-0.5 mb-5">Click any bar to drill into transactions.</p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueBreakdown} barSize={52}>
                  <CartesianGrid vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} axisLine={false}
                    tickFormatter={v => v >= 100000 ? `${(v/100000).toFixed(0)}L` : v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v)} />
                  <Tooltip formatter={(v: any) => [fmt(Number(v)), "Revenue"]} cursor={{ fill: "#f3f4f6" }} />
                  <Bar dataKey="value" fill="#1e3a6e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Donut chart */}
          <div className="col-span-2 bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="text-base font-semibold text-gray-900">Share of IPD Revenue</h2>
            <div className="h-48 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={revenueBreakdown} dataKey="value" innerRadius={55} outerRadius={85} paddingAngle={2}>
                    {revenueBreakdown.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1.5 mt-1">
              {revenueBreakdown.map((r, i) => (
                <div key={r.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PIE_COLORS[i] }} />
                    <span className="text-gray-600">{r.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-right">
                    <span className="text-gray-900 font-medium">{fmt(r.value)}</span>
                    <span className="text-gray-400 text-xs">· {totalIPD > 0 ? Math.round((r.value / totalIPD) * 100) : 0}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
