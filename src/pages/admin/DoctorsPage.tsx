import { useState, useEffect } from "react";
import { RefreshCw, Download, Printer, FileSpreadsheet, ArrowUpRight } from "lucide-react";
import { apiGetDoctorPerformance } from "@/lib/api";

interface DoctorRow {
  doctorId:       string;
  name:           string;
  specialization: string;
  totalRevenue:   number;
  patientCount:   number;
  estimatedPayout:number;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const today = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

const initials = (name: string) =>
  name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

const AVATAR_COLORS = [
  "bg-blue-500", "bg-violet-500", "bg-emerald-500", "bg-amber-500",
  "bg-rose-500",  "bg-cyan-500",   "bg-indigo-500",  "bg-teal-500",
];

export default function DoctorsPage() {
  const [rows,    setRows]    = useState<DoctorRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const d = await apiGetDoctorPerformance();
      const sorted = [...(d.doctors || [])].sort((a: DoctorRow, b: DoctorRow) => b.totalRevenue - a.totalRevenue);
      setRows(sorted);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const totalRevenue  = rows.reduce((s, r) => s + r.totalRevenue,  0);
  const totalPatients = rows.reduce((s, r) => s + r.patientCount,  0);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#f8f9fc]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-8 py-4 bg-white border-b border-gray-100">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-gray-900">Doctors</h1>
          <span className="text-sm text-gray-400">·</span>
          <span className="text-sm text-gray-500">{today}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <FileSpreadsheet className="w-4 h-4" /> Excel
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <Printer className="w-4 h-4" /> Print
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors">
            <Download className="w-4 h-4" /> PDF
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">Doctor Leaderboard</h2>
            <p className="text-sm text-gray-500 mt-0.5">Sorted by revenue this month.</p>
          </div>

          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-[11px] font-semibold text-gray-400 tracking-wider px-6 py-3.5 w-12">#</th>
                <th className="text-left text-[11px] font-semibold text-gray-400 tracking-wider px-6 py-3.5">DOCTOR</th>
                <th className="text-left text-[11px] font-semibold text-gray-400 tracking-wider px-6 py-3.5">PATIENTS (M)</th>
                <th className="text-left text-[11px] font-semibold text-gray-400 tracking-wider px-6 py-3.5">REVENUE (M)</th>
                <th className="text-left text-[11px] font-semibold text-gray-400 tracking-wider px-6 py-3.5">PAYOUT</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400 text-sm">Loading…</td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400 text-sm">No data for this month</td>
                </tr>
              ) : rows.map((r, i) => {
                const ptPct  = totalPatients > 0 ? Math.round((r.patientCount  / totalPatients) * 100) : 0;
                const revPct = totalRevenue  > 0 ? Math.round((r.totalRevenue  / totalRevenue)  * 100) : 0;
                const color  = AVATAR_COLORS[i % AVATAR_COLORS.length];
                return (
                  <tr key={r.doctorId} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer">
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-gray-100 text-xs font-semibold text-gray-500">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full ${color} flex items-center justify-center shrink-0`}>
                          <span className="text-white text-xs font-semibold">{initials(r.name)}</span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{r.name}</p>
                          <p className="text-xs text-gray-400">{r.specialization}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-gray-900">{r.patientCount.toLocaleString("en-IN")}</p>
                      <p className="text-xs text-gray-400">{ptPct}% of total</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-gray-900">{fmt(r.totalRevenue)}</p>
                      <p className="text-xs text-emerald-600">{revPct}% of revenue</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-900">{fmt(r.estimatedPayout)}</p>
                    </td>
                    <td className="px-4 py-4">
                      <ArrowUpRight className="w-4 h-4 text-gray-300" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
