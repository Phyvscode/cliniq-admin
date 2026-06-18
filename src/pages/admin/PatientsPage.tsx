import { useState, useEffect, useCallback } from "react";
import { Search, RefreshCw, Download, Printer, FileSpreadsheet } from "lucide-react";
import { apiGetTransactions } from "@/lib/api";

interface Payment {
  _id:     string;
  patient: { name: string; phone: string; gender?: string; age?: number; permanentCode?: string } | null;
  doctor:  { name: string } | null;
  amount:  number;
  method?: string;
  type?:   string;
  date:    string;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const todayISO = () => new Date().toISOString().slice(0, 10);
const todayDisplay = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

type DateRange = "today" | "yesterday" | "7days" | "30days" | "month";

const METHOD_LABEL: Record<string, string> = {
  cash: "Cash", upi: "UPI", card: "Card", insurance: "Insurance", credit: "Credit",
};

export default function PatientsPage() {
  const [rows,      setRows]      = useState<Payment[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState("");
  const [range,     setRange]     = useState<DateRange>("today");
  const [page,      setPage]      = useState(1);
  const [total,     setTotal]     = useState(0);
  const LIMIT = 50;

  const dateParam = useCallback(() => {
    const d = new Date();
    if (range === "today")     return todayISO();
    if (range === "yesterday") { d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); }
    return undefined;
  }, [range]);

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params: any = { page: p, limit: LIMIT };
      const dp = dateParam();
      if (dp) params.date = dp;
      const d = await apiGetTransactions(params);
      setRows(d.payments || []);
      setTotal(d.total || 0);
      setPage(p);
    } catch {}
    setLoading(false);
  }, [dateParam]);

  useEffect(() => { load(1); }, [range, load]);

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

  const newCount      = rows.filter(r => r.type === "consultation").length;
  const existingCount = rows.filter(r => r.type === "follow-up").length;
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
          <button onClick={() => load(1)} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
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
            { label: "TOTAL",    value: rows.length,     sub: "visits loaded" },
            { label: "NEW",      value: newCount,         sub: `${rows.length ? Math.round(newCount/rows.length*100) : 0}% of total` },
            { label: "EXISTING", value: existingCount,    sub: "follow-ups" },
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
                  const isNew = r.type === "consultation";
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
                        {r.doctor?.name || "—"}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-600 whitespace-nowrap">{r.date}</td>
                      <td className="px-5 py-3.5 text-sm text-gray-600">
                        {METHOD_LABEL[r.method?.toLowerCase() || ""] || r.method || "—"}
                      </td>
                      <td className="px-5 py-3.5 text-sm font-semibold text-gray-900">{fmt(r.amount)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {total > LIMIT && (
            <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100">
              <p className="text-sm text-gray-500">
                Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total}
              </p>
              <div className="flex gap-2">
                <button onClick={() => load(page - 1)} disabled={page === 1}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors">
                  Prev
                </button>
                <button onClick={() => load(page + 1)} disabled={page * LIMIT >= total}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors">
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
