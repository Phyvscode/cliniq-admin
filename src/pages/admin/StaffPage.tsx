import { useState, useEffect } from "react";
import { RefreshCw, Download, Printer, FileSpreadsheet, Plus, Search } from "lucide-react";
import { apiGetAllStaff } from "@/lib/api";

interface StaffMember {
  _id:            string;
  name:           string;
  role:           string;
  phone?:         string;
  email?:         string;
  department?:    string;
  specialization?:string;
  shift?:         string;
  consultationFee?:number;
  createdAt?:     string;
  salary?:        number;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const todayDisplay = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

const ROLE_FILTERS = ["All", "Doctor", "Nurse", "Receptionist", "Pharmacist", "Lab Technician", "Security", "Housekeeping"];

const ROLE_LABELS: Record<string, string> = {
  doctor:        "Doctor",
  nurse:         "Nurse",
  receptionist:  "Receptionist",
  pharmacist:    "Pharmacist",
  "lab-tech":    "Lab Technician",
  security:      "Security",
  housekeeping:  "Housekeeping",
  admin:         "Admin",
};

const fmtDate = (s?: string) =>
  s ? new Date(s).toLocaleDateString("en-IN", { day: "numeric", month: "numeric", year: "numeric" }) : "—";

export default function StaffPage() {
  const [staff,   setStaff]   = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState("All");
  const [search,  setSearch]  = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const d = await apiGetAllStaff();
      setStaff(d.staff || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = staff
    .filter(s => {
      if (filter === "All") return true;
      const roleLabel = ROLE_LABELS[s.role] || s.role;
      return roleLabel.toLowerCase() === filter.toLowerCase();
    })
    .filter(s => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return s.name?.toLowerCase().includes(q) || s.phone?.includes(q) || s.role?.toLowerCase().includes(q);
    });

  const totalPayroll = filtered.reduce((sum, s) => sum + (s.salary || s.consultationFee || 0), 0);
  const onLeave      = 0; // would need attendance model

  const STAT_CARDS = [
    { label: "TOTAL STAFF",      value: String(staff.length),      sub: null },
    { label: "ACTIVE",           value: String(staff.length - onLeave), sub: `${staff.length > 0 ? Math.round(((staff.length - onLeave)/staff.length)*100) : 0}% on shift` },
    { label: "ON LEAVE",         value: String(onLeave),           sub: null },
    { label: "MONTHLY PAYROLL",  value: fmt(totalPayroll),         sub: "vs approx" },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#f8f9fc]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-8 py-4 bg-white border-b border-gray-100">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-gray-900">Staff</h1>
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
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
            <Download className="w-4 h-4" /> PDF
          </button>
          <button className="flex items-center gap-1.5 px-4 py-2 text-sm text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors">
            <Plus className="w-4 h-4" /> Add Staff
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 space-y-5">
        {/* Stat cards */}
        <div className="grid grid-cols-4 gap-4">
          {STAT_CARDS.map(c => (
            <div key={c.label} className="bg-white rounded-xl border border-gray-100 px-5 py-4">
              <p className="text-[10px] font-semibold text-gray-400 tracking-wider">{c.label}</p>
              <p className="text-3xl font-bold text-gray-900 mt-1.5">{c.value}</p>
              {c.sub && <p className="text-xs text-gray-400 mt-0.5">{c.sub}</p>}
            </div>
          ))}
        </div>

        {/* Filter + search */}
        <div className="bg-white rounded-xl border border-gray-100 px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-1 flex-wrap">
            {ROLE_FILTERS.map(r => (
              <button key={r} onClick={() => setFilter(r)}
                className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                  filter === r ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-100"
                }`}>
                {r}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or role..."
              className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg w-52 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">Staff Management</h2>
            <p className="text-sm text-gray-500 mt-0.5">Doctors, nurses, technicians and support staff in one register.</p>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                {["NAME", "ROLE", "PHONE", "DEPT / SPEC", "SHIFT", "JOINED", "SALARY", "STATUS"].map(h => (
                  <th key={h} className="text-left text-[11px] font-semibold text-gray-400 tracking-wider px-6 py-3.5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400 text-sm">Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400 text-sm">No staff found</td></tr>
              ) : filtered.map(s => (
                <tr key={s._id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-3.5 text-sm font-semibold text-gray-900">{s.name}</td>
                  <td className="px-6 py-3.5 text-sm text-gray-600">{ROLE_LABELS[s.role] || s.role}</td>
                  <td className="px-6 py-3.5 text-sm text-gray-600">
                    {s.phone ? `+91 ${s.phone.replace(/^\+?91/, "").trim()}` : "—"}
                  </td>
                  <td className="px-6 py-3.5 text-sm text-gray-600">
                    {s.specialization || s.department || "—"}
                  </td>
                  <td className="px-6 py-3.5 text-sm text-gray-600">
                    {s.shift
                      ? s.shift.charAt(0).toUpperCase() + s.shift.slice(1)
                      : "Morning"}
                  </td>
                  <td className="px-6 py-3.5 text-sm text-gray-600">{fmtDate(s.createdAt)}</td>
                  <td className="px-6 py-3.5 text-sm text-gray-900">
                    {s.salary ? fmt(s.salary) : s.consultationFee ? fmt(s.consultationFee) : "—"}
                  </td>
                  <td className="px-6 py-3.5">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700">
                      Active
                    </span>
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
