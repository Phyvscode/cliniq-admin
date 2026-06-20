import { useState, useEffect } from "react";
import { RefreshCw, Download, Printer, FileSpreadsheet, Plus, Search, X, Check } from "lucide-react";
import { apiGetAllStaff, apiCreateStaff } from "@/lib/api";

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
  reception:     "Receptionist",
  receptionist:  "Receptionist",
  pharmacist:    "Pharmacist",
  lab_staff:     "Lab Technician",
  "lab-tech":    "Lab Technician",
  security:      "Security",
  housekeeping:  "Housekeeping",
  admin:         "Admin",
};

const ADD_ROLES = [
  { value: "doctor",      label: "Doctor"        },
  { value: "reception",   label: "Receptionist"  },
  { value: "pharmacist",  label: "Pharmacist"    },
  { value: "lab_staff",   label: "Lab Technician"},
  { value: "nurse",       label: "Nurse"         },
  { value: "housekeeping",label: "Housekeeping"  },
];

interface AddStaffForm {
  name:        string;
  email:       string;
  pin:         string;
  role:        string;
  gender:      string;
  dateOfBirth: string;
  department:  string;
}

const EMPTY_FORM: AddStaffForm = {
  name: "", email: "", pin: "", role: "reception",
  gender: "", dateOfBirth: "", department: "",
};

function AddStaffModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form,      setForm]      = useState<AddStaffForm>(EMPTY_FORM);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState("");
  const [success,   setSuccess]   = useState("");

  const maxDate = new Date().toISOString().split("T")[0];
  const minDate = `${new Date().getFullYear() - 80}-01-01`;

  const set = (k: keyof AddStaffForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(form.pin)) { setError("PIN must be exactly 6 digits."); return; }
    setSaving(true); setError("");
    try {
      const fd = new FormData();
      (Object.keys(form) as (keyof AddStaffForm)[]).forEach(k => {
        if (form[k]) fd.append(k, form[k]);
      });
      await apiCreateStaff(fd);
      setSuccess(`${form.name} added successfully!`);
      setTimeout(() => { onCreated(); onClose(); }, 1200);
    } catch (e: any) { setError(e.message || "Failed to create staff"); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-md p-6 relative">
        <button onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100">
          <X className="w-4 h-4" />
        </button>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">Add Staff Member</h2>
        <p className="text-sm text-gray-400 mb-5">Create a PIN-based login for a new staff member.</p>

        {success ? (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
            <Check className="w-4 h-4 text-emerald-500" />
            <p className="text-sm text-emerald-700 font-medium">{success}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-500 mb-1 block">Full Name *</label>
                <input required value={form.name} onChange={set("name")} placeholder="e.g. Priya Sharma"
                  className="w-full h-10 border border-gray-200 rounded-xl px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-500 mb-1 block">Email *</label>
                <input required type="email" value={form.email} onChange={set("email")} placeholder="staff@clinic.com"
                  className="w-full h-10 border border-gray-200 rounded-xl px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">6-Digit PIN *</label>
                <input required type="password" inputMode="numeric" maxLength={6} value={form.pin} onChange={set("pin")} placeholder="••••••"
                  className="w-full h-10 border border-gray-200 rounded-xl px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Role *</label>
                <select required value={form.role} onChange={set("role")}
                  className="w-full h-10 border border-gray-200 rounded-xl px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white">
                  {ADD_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Gender *</label>
                <select required value={form.gender} onChange={set("gender")}
                  className="w-full h-10 border border-gray-200 rounded-xl px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white">
                  <option value="">Select…</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Date of Birth *</label>
                <input required type="date" value={form.dateOfBirth} onChange={set("dateOfBirth")} min={minDate} max={maxDate}
                  className="w-full h-10 border border-gray-200 rounded-xl px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-500 mb-1 block">Department (optional)</label>
                <input value={form.department} onChange={set("department")} placeholder="e.g. Pathology, Radiology"
                  className="w-full h-10 border border-gray-200 rounded-xl px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
              </div>
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={onClose}
                className="flex-1 h-10 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={saving}
                className="flex-1 h-10 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition-colors disabled:opacity-40">
                {saving ? "Adding…" : "Add Staff"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

const fmtDate = (s?: string) =>
  s ? new Date(s).toLocaleDateString("en-IN", { day: "numeric", month: "numeric", year: "numeric" }) : "—";

export default function StaffPage() {
  const [staff,      setStaff]      = useState<StaffMember[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [filter,     setFilter]     = useState("All");
  const [search,     setSearch]     = useState("");
  const [showAdd,    setShowAdd]    = useState(false);

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
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 px-4 py-2 text-sm text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors">
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

      {showAdd && <AddStaffModal onClose={() => setShowAdd(false)} onCreated={load} />}
    </div>
  );
}
