import { useState, useEffect } from "react";
import { RefreshCw, Download, Printer, FileSpreadsheet } from "lucide-react";

const BASE = (import.meta.env.VITE_API_URL as string) || "http://localhost:5000/api";
const tok  = () => localStorage.getItem("cliniq_token") || "";
const get  = async (path: string) => {
  const r = await fetch(`${BASE}${path}`, { headers: { Authorization: `Bearer ${tok()}` } });
  const d = await r.json();
  if (!r.ok) throw new Error(d.message);
  return d;
};

const todayDisplay = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

const todayISO = () => new Date().toISOString().slice(0, 10);
const addDays  = (iso: string, n: number) => {
  const d = new Date(iso); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10);
};

type FuStatus = "Pending" | "Called" | "Confirmed" | "Rescheduled" | "Lost";

interface FuRow {
  id:        string;
  uhid:      string;
  patient:   string;
  doctor:    string;
  dueDate:   string;
  dueLbl:    "Today" | "Tomorrow" | "Overdue" | "Upcoming";
  status:    FuStatus;
}

const STATUS_STYLE: Record<FuStatus, string> = {
  Pending:     "bg-amber-50 text-amber-700",
  Called:      "bg-gray-100 text-gray-600",
  Confirmed:   "bg-emerald-50 text-emerald-700",
  Rescheduled: "bg-gray-100 text-gray-600",
  Lost:        "bg-red-50 text-red-600",
};

const STATUSES: FuStatus[] = ["Pending", "Called", "Confirmed", "Rescheduled", "Lost"];

export default function FollowupsPage() {
  const [rows,    setRows]    = useState<FuRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusMap, setStatusMap] = useState<Record<string, FuStatus>>({});

  const load = async () => {
    setLoading(true);
    try {
      const d = await get("/prescriptions");
      const prescriptions: any[] = d.prescriptions || [];
      const today    = todayISO();
      const tomorrow = addDays(today, 1);

      const built: FuRow[] = prescriptions
        .filter((p: any) => p.medicines?.length > 0)
        .map((p: any): FuRow => {
          const maxDays = Math.max(...(p.medicines as any[]).map((m: any) => m.durationDays || 7));
          const dueDate = addDays(p.date || today, maxDays);
          let dueLbl: FuRow["dueLbl"] = "Upcoming";
          if (dueDate < today)        dueLbl = "Overdue";
          else if (dueDate === today)  dueLbl = "Today";
          else if (dueDate === tomorrow) dueLbl = "Tomorrow";
          return {
            id:      p._id,
            uhid:    p.patient?.permanentCode || "—",
            patient: p.patient?.name || "—",
            doctor:  p.doctorName || p.doctor?.name || "—",
            dueDate,
            dueLbl,
            status:  "Pending",
          };
        })
        .filter((r: FuRow) => r.dueLbl !== "Upcoming")
        .sort((a: FuRow, b: FuRow) => a.dueDate.localeCompare(b.dueDate));

      setRows(built);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const withStatus = rows.map(r => ({ ...r, status: statusMap[r.id] || r.status }));

  const counts = {
    dueToday:   withStatus.filter(r => r.dueLbl === "Today").length,
    dueTomorrow:withStatus.filter(r => r.dueLbl === "Tomorrow").length,
    overdue:    withStatus.filter(r => r.dueLbl === "Overdue").length,
    called:     withStatus.filter(r => statusMap[r.id] === "Called").length,
    confirmed:  withStatus.filter(r => statusMap[r.id] === "Confirmed").length,
    rescheduled:withStatus.filter(r => statusMap[r.id] === "Rescheduled").length,
    lost:       withStatus.filter(r => statusMap[r.id] === "Lost").length,
  };

  const STAT_CARDS = [
    { label: "DUE TODAY",    value: counts.dueToday,    sub: null },
    { label: "DUE TOMORROW", value: counts.dueTomorrow, sub: null },
    { label: "OVERDUE",      value: counts.overdue,     sub: "Action required" },
    { label: "CALLED",       value: counts.called,      sub: null },
    { label: "CONFIRMED",    value: counts.confirmed,   sub: null },
    { label: "RESCHEDULED",  value: counts.rescheduled, sub: null },
    { label: "LOST",         value: counts.lost,        sub: null },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#f8f9fc]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-8 py-4 bg-white border-b border-gray-100">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-gray-900">Follow-ups</h1>
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

      <div className="flex-1 overflow-y-auto p-8 space-y-5">
        {/* Stat cards */}
        <div className="grid grid-cols-7 gap-3">
          {STAT_CARDS.map(c => (
            <div key={c.label} className="bg-white rounded-xl border border-gray-100 px-4 py-4">
              <p className="text-[9px] font-semibold text-gray-400 tracking-wider leading-tight">{c.label}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1.5">{c.value}</p>
              {c.sub && <p className="text-[10px] text-gray-400 mt-0.5">{c.sub}</p>}
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">Follow-up Command Center</h2>
            <p className="text-sm text-gray-500 mt-0.5">Track every patient callback from due to closed.</p>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                {["UHID", "PATIENT", "DOCTOR", "DUE", "STATUS"].map(h => (
                  <th key={h} className="text-left text-[11px] font-semibold text-gray-400 tracking-wider px-6 py-3.5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center py-12 text-gray-400 text-sm">Loading…</td></tr>
              ) : withStatus.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-gray-400 text-sm">No follow-ups pending</td></tr>
              ) : withStatus.map(r => (
                <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-3.5 text-xs font-mono text-gray-500">{r.uhid}</td>
                  <td className="px-6 py-3.5 text-sm font-semibold text-gray-900">{r.patient}</td>
                  <td className="px-6 py-3.5 text-sm text-gray-600">{r.doctor}</td>
                  <td className="px-6 py-3.5">
                    <span className={`text-sm font-medium ${
                      r.dueLbl === "Overdue" ? "text-red-600" :
                      r.dueLbl === "Today"   ? "text-gray-900" : "text-gray-600"
                    }`}>{r.dueLbl}</span>
                  </td>
                  <td className="px-6 py-3.5">
                    <select
                      value={statusMap[r.id] || "Pending"}
                      onChange={e => setStatusMap(prev => ({ ...prev, [r.id]: e.target.value as FuStatus }))}
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full border-0 cursor-pointer outline-none ${STATUS_STYLE[statusMap[r.id] || "Pending"]}`}
                    >
                      {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
