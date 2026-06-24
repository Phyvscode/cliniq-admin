import { useState, useEffect, useCallback } from "react";
import { Search, RefreshCw, Download, Printer, FileSpreadsheet } from "lucide-react";
import { apiGetQueueHistory } from "@/lib/api";

interface VisitEntry {
  _id:       string;
  patient:   { name: string; phone: string; gender?: string; age?: number; permanentCode?: string } | null;
  doctor:    { name: string } | null;
  department?: string;
  date:      string;
  visitType: "new" | "existing";
  payment:   { amount: number; method?: string; type?: string } | null;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const toISO = (d: Date) => d.toISOString().slice(0, 10);
const todayISO = () => toISO(new Date());
const todayDisplay = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

type DateRange = "today" | "yesterday" | "7days" | "30days" | "month";

const METHOD_LABEL: Record<string, string> = {
  cash: "Cash", upi: "UPI", card: "Card", insurance: "Insurance", credit: "Credit",
};

export default function PatientsPage() {
  const [rows,      setRows]      = useState<VisitEntry[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState("");
  const [range,     setRange]     = useState<DateRange>("today");

  const dateParams = useCallback((): { date: string; to: string } => {
    const today = new Date();
    if (range === "today")     return { date: todayISO(), to: todayISO() };
    if (range === "yesterday") { const d = new Date(today); d.setDate(d.getDate() - 1); return { date: toISO(d), to: toISO(d) }; }
    if (range === "7days")     { const d = new Date(today); d.setDate(d.getDate() - 6); return { date: toISO(d), to: todayISO() }; }
    if (range === "30days")    { const d = new Date(today); d.setDate(d.getDate() - 29); return { date: toISO(d), to: todayISO() }; }
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    return { date: toISO(monthStart), to: todayISO() };
  }, [range]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { date, to } = dateParams();
      const d = await apiGetQueueHistory({ date, to });
      setRows(d.entries || []);
    } catch {}
    setLoading(false);
  }, [dateParams]);

  useEffect(() => { load(); }, [range, load]);

  const filtered = search.trim()
    ? rows.filter(r => {
        const q = search.toLowerCase();
        return (
          r.patient?.name?.toLowerCase().includes(q) ||
          r.patient?.phone?.includes(q) ||
          r.patient?.permanentCode?.toLowerCase().includes(q)
        );
      })
    : rows;

  const newCount      = rows.filter(r => r.visitType === "new").length;
  const existingCount = rows.filter(r => r.visitType === "existing").length;
  const maleCount     = rows.filter(r => r.patient?.gender === "Male").length;
  const femaleCount   = rows.filter(r => r.patient?.gender === "Female").length;

  const RANGES: { key: DateRange; label: string }[] = [
    { key: "today",     label: "Today"      },
    { key: "yesterday", label: "Yesterday"  },
    { key: "7days",     label: "Last 7 days"},
    { key: "30days",    label: "Last 30 days"},
    { key: "month",     label: "This Month" },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#f8f9fc]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-8 py-4 bg-white border-b border-gray-100">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-gray-900">Patients</h1>
          <span className="text-sm text-gray-400">·</span>
          <span className="text-sm text-gray-500">{todayDisplay}</span>
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

      <div className="flex-1 overflow-y-auto p-8 space-y-5">
        {/* Stat cards */}
        <div className="grid grid-cols-5 gap-4">
          {[
            { label: "TOTAL",    value: rows.length,     sub: "visits" },
            { label: "NEW",      value: newCount,         sub: `${rows.length ? Math.round(newCount/rows.length*100) : 0}% of total` },
            { label: "EXISTING", value: existingCount,    sub: "returning patients" },
            { label: "MALE",     value: maleCount,        sub: `${rows.length ? Math.round(maleCount/rows.length*100) : 0}%` },
            { label: "FEMALE",   value: femaleCount,      sub: `${rows.length ? Math.round(femaleCount/rows.length*100) : 0}%` },
          ].map(c => (
            <div key={c.label} className="bg-white rounded-xl border border-gray-100 px-5 py-4">
              <p className="text-[10px] font-semibold text-gray-400 tracking-wider">{c.label}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{c.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{c.sub}</p>
            </div>
          ))}
        </div>

        {/* Search + date filters */}
        <div className="bg-white rounded-xl border border-gray-100 px-5 py-4 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search UHID, name or phone..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
          </div>
          <div className="flex items-center gap-1">
            {RANGES.map(r => (
              <button key={r.key} onClick={() => setRange(r.key)}
                className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                  range === r.key
                    ? "bg-gray-900 text-white"
                    : "text-gray-500 hover:bg-gray-100"
                }`}>
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  {["UHID", "PATIENT", "AGE", "SEX", "PHONE", "TYPE", "DOCTOR", "DATE", "PAYMENT", "AMOUNT"].map(h => (
                    <th key={h} className="text-left text-[11px] font-semibold text-gray-400 tracking-wider px-5 py-3.5 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={10} className="text-center py-12 text-gray-400 text-sm">Loading…</td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-12 text-gray-400 text-sm">No records found</td>
                  </tr>
                ) : filtered.map(r => {
                  const isNew = r.visitType === "new";
                  return (
                    <tr key={r._id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-3.5 text-xs font-mono text-gray-500">
                        {r.patient?.permanentCode || "—"}
                      </td>
                      <td className="px-5 py-3.5 text-sm font-semibold text-gray-900 whitespace-nowrap">
                        {r.patient?.name || "—"}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-600">{r.patient?.age ?? "—"}</td>
                      <td className="px-5 py-3.5 text-sm text-gray-600">
                        {r.patient?.gender ? r.patient.gender[0] : "—"}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-600 whitespace-nowrap">
                        {r.patient?.phone ? `+91 ${r.patient.phone.replace(/^\+?91/, "").trim()}` : "—"}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          isNew ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"
                        }`}>
                          {isNew ? "New" : "Existing"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-600 whitespace-nowrap">
                        {r.doctor?.name || r.department || "—"}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-600 whitespace-nowrap">{r.date}</td>
                      <td className="px-5 py-3.5 text-sm text-gray-600">
                        {r.payment ? (METHOD_LABEL[r.payment.method?.toLowerCase() || ""] || r.payment.method || "—") : (
                          <span className="text-amber-600">Pending</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-sm font-semibold text-gray-900">
                        {r.payment ? fmt(r.payment.amount) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
