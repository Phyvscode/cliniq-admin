import { useState, useEffect } from "react";
import { RefreshCw, Download, Printer, FileSpreadsheet } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

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

interface LabStats { totalTests: number; revenue: number; pending: number; }
interface TestEntry { name: string; count: number; }
interface DoctorReferral { doctorName: string; tests: number; revenue: number; }

export default function LaboratoryPage() {
  const [stats,      setStats]      = useState<LabStats | null>(null);
  const [tests,      setTests]      = useState<TestEntry[]>([]);
  const [referrals,  setReferrals]  = useState<DoctorReferral[]>([]);
  const [loading,    setLoading]    = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const d = await get("/lab/analytics");
      setStats(d.stats || null);
      setTests(d.tests || []);
      setReferrals(d.referrals || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const STAT_CARDS = [
    { label: "TOTAL TESTS",     value: String(stats?.totalTests || 0) },
    { label: "REVENUE COLLECTED", value: fmt(stats?.revenue || 0) },
    { label: "FEES PENDING",    value: String(stats?.pending || 0) },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#f8f9fc]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-8 py-4 bg-white border-b border-gray-100">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-gray-900">Laboratory</h1>
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
        <div className="grid grid-cols-3 gap-4">
          {STAT_CARDS.map(c => (
            <div key={c.label} className="bg-white rounded-xl border border-gray-100 px-5 py-4">
              <p className="text-[10px] font-semibold text-gray-400 tracking-wider">{c.label}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1.5">{c.value}</p>
            </div>
          ))}
        </div>

        {/* Most Ordered Tests bar chart */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-5">Laboratory Command Center</h2>
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Most Ordered Tests</h3>
          {tests.length === 0 && !loading ? (
            <p className="text-sm text-gray-400 py-8 text-center">No test data available</p>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tests} barSize={52}>
                  <CartesianGrid vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} axisLine={false}
                    angle={-20} textAnchor="end" height={50} />
                  <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(v: any) => [v, "Tests"]} cursor={{ fill: "#f3f4f6" }} />
                  <Bar dataKey="count" fill="#1e3a6e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Doctor-wise Referrals */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700">Doctor-wise Referrals</h3>
          </div>
          {loading ? (
            <div className="text-center py-8 text-gray-400 text-sm">Loading…</div>
          ) : referrals.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">No referral data</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {referrals.map(r => (
                <div key={r.doctorName} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50/50 transition-colors">
                  <p className="text-sm font-semibold text-gray-900">{r.doctorName}</p>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">{r.tests} tests</p>
                    <p className="text-xs text-gray-400">{fmt(r.revenue)} revenue</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
