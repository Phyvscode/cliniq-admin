import { useState, useEffect } from "react";
import { RefreshCw, Download, Printer, FileSpreadsheet } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { apiGetRevenueByDepartment } from "@/lib/api";

interface DeptRow {
  department:  string;
  revenue:     number;
  patientCount:number;
  doctorCount: number;
  avgBill:     number;
  revPct:      number;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const today = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

export default function DepartmentsPage() {
  const [rows,    setRows]    = useState<DeptRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const d = await apiGetRevenueByDepartment();
      setRows(d.departments || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const totalPatients = rows.reduce((s, r) => s + r.patientCount, 0);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#f8f9fc]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-8 py-4 bg-white border-b border-gray-100">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-gray-900">Departments</h1>
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

      <div className="flex-1 overflow-y-auto p-8 space-y-6">
        {/* Chart card */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-gray-900">Department Analytics</h2>
            <p className="text-sm text-gray-500 mt-0.5">Revenue, patients, doctors and average bill across specialties.</p>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rows} barSize={48}>
                <CartesianGrid vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="department" tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false}
                  tickFormatter={v => v >= 100000 ? `${(v / 100000).toFixed(0)}L` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                <Tooltip formatter={(v: any) => [fmt(Number(v)), "Revenue"]} cursor={{ fill: "#f3f4f6" }} />
                <Bar dataKey="revenue" fill="#1e3a6e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Table card */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                {["DEPARTMENT", "REVENUE", "REV %", "PATIENTS", "DOCTORS", "AVG BILL"].map(h => (
                  <th key={h} className="text-left text-[11px] font-semibold text-gray-400 tracking-wider px-6 py-3.5">{h}</th>
                ))}
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
                const ptPct = totalPatients > 0 ? Math.round((r.patientCount / totalPatients) * 100) : 0;
                return (
                  <tr key={r.department} className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${i % 2 === 0 ? "" : ""}`}>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">{r.department}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{fmt(r.revenue)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-600 rounded-full" style={{ width: `${Math.min(100, r.revPct)}%` }} />
                        </div>
                        <span className="text-sm text-gray-500">{r.revPct}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {r.patientCount.toLocaleString("en-IN")}
                      <span className="text-gray-400 ml-1">({ptPct}%)</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{r.doctorCount}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{fmt(r.avgBill)}</td>
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
