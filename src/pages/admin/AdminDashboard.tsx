import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, Pill, Stethoscope, UserCheck, Plus, Eye, EyeOff,
  Copy, RefreshCw, Check, X, Upload, FileText, Trash2,
  ChevronDown, Activity, LogOut, User, Clock, Calendar,
  MapPin, BadgeCheck, Building2, List, UserPlus,
  IndianRupee, BarChart3, TrendingUp, Wallet, Banknote,
  CreditCard, Smartphone, BadgePercent, Star, AlertCircle,
  CheckCircle2, Lock, KeyRound, Filter, ArrowUpDown, PieChart,
  Bell, TrendingDown, Award, Clock as ClockIcon, Download, Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import {
  apiAddMedicine, apiDeleteMedicine as apiDeleteMed,
  apiGetRevenueStats, apiGetDoctorRevStats, apiGetAllStaffStats, apiGetTransactions,
  apiUpsertSalaryConfig, apiDeleteSalaryConfig,
  apiGetTier, apiSetTier,
  apiGetDailyGraph, apiGetRevenueByDepartment,
  apiGetDoctorPerformance, apiGetPaymentBreakdown,
  apiGetWeeklyTrend, apiGetPeakHours, apiGetDeptGrowth,
  apiGetPending, apiGetAlerts,
} from "@/lib/api";
import ChangePasswordModal from "@/components/ChangePasswordModal";

const BASE_URL = (import.meta.env.VITE_API_URL as string) || "http://localhost:5000/api";
const getToken = () => localStorage.getItem("cliniq_token");

const apiFetch = async (path: string, opts: RequestInit = {}) => {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...opts,
    headers: { Authorization: `Bearer ${getToken()}`, ...opts.headers },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data;
};

const apiCreateStaff = async (formData: FormData) => {
  const res = await fetch(`${BASE_URL}/admin/staff`, {
    method:  "POST",
    headers: { Authorization: `Bearer ${getToken()}` },
    body:    formData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to create staff");
  return data;
};

const apiDeleteStaff    = (userId: string) => apiFetch(`/admin/staff/${userId}`, { method: "DELETE" });
const apiDeleteMedicine = (id: string) => apiDeleteMed(id);

// ─── Types ────────────────────────────────────────────────────────────────────
type Tab = "overview" | "staff"
         | "revenue" | "analytics" | "enterprise" | "salary" | "transactions" | "settings";
type SubView = "list" | "add";

interface StaffForm {
  name: string; dob: string; email: string; address: string;
  gender: "Male" | "Female" | "Other" | "";
  photo: File | null; photoPreview: string;
  specialization: string; qualification: string; licenseNumber: string;
  pdfFile: File | null; pdfName: string;
  signatureFile: File | null; signaturePreview: string;
  availableDays: string[]; timeStart: string; timeEnd: string;
  room: string; department: string; pin: string;
  consultationFee: string;
}

interface RevenueStats {
  today: number; month: number; year: number; allTime: number;
  patientsToday: number;
  revenueByMethod: { _id: string; total: number }[];
}

interface DoctorStat {
  staffId:          string;
  doctorId:         string;
  name:             string;
  role:             string;
  department:       string;
  revenueGenerated: number;
  patientsCount:    number;
  salaryType:       "fixed" | "percentage" | "mixed" | null;
  fixedAmount:      number | null;
  percentage:       number | null;
  mixedFixed:       number | null;
  consultationPct:  number | null;
  procedurePct:     number | null;
  estimatedPayout:  number;
}

interface DoctorPerf {
  doctorId: string; name: string; specialization: string;
  totalRevenue: number; patientCount: number;
  cashRevenue: number; upiRevenue: number; cardRevenue: number; insuranceRevenue: number;
  salaryType: string | null; percentage: number | null; fixedAmount: number | null;
  estimatedPayout: number; clinicEarnings: number;
}

interface Transaction {
  _id: string;
  patient: { name: string; phone: string };
  doctor?: { name: string };
  amount: number; type: string; method: string;
  date: string; createdAt: string;
  collectedBy: { name: string };
}

interface DailyPoint    { date: string; revenue: number; patients: number; }
interface DeptRevenue   { department: string; revenue: number; }
interface PayBreakdown  { method: string; total: number; count: number; percentage: number; }

// ─── Constants ────────────────────────────────────────────────────────────────
const EMPTY_STAFF: StaffForm = {
  name: "", dob: "", email: "", address: "", gender: "",
  photo: null, photoPreview: "",
  specialization: "", qualification: "", licenseNumber: "",
  pdfFile: null, pdfName: "",
  signatureFile: null, signaturePreview: "",
  availableDays: [], timeStart: "09:00", timeEnd: "17:00",
  room: "", department: "", pin: "",
  consultationFee: "",
};

const DAYS            = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const SPECIALIZATIONS = [
  "General Physician","Cardiology","Neurology","Orthopedics",
  "Pediatrics","Gynecology","Dermatology","ENT","Ophthalmology",
  "Psychiatry","Radiology","Anesthesiology","Oncology","Urology",
];
const QUALIFICATIONS  = ["MBBS","MD","MS","BDS","MDS","DNB","DM","MCh","FRCS","Other"];
const DEPARTMENTS     = [
  "General Medicine","Pediatrics","Gynecology","Orthopedics",
  "Dermatology","ENT","Cardiology","Neurology","Ophthalmology","Dentistry",
];
const MEDICINE_TYPES  = ["Tablet","Capsule","Syrup","Injection","Cream","Drops","Inhaler","Patch","Other"];

const METHOD_ICON: Record<string, React.ElementType> = {
  cash: Banknote, card: CreditCard, upi: Smartphone, insurance: Shield, other: Wallet,
};
const METHOD_COLOR: Record<string, string> = {
  cash: "text-emerald-500", card: "text-blue-500",
  upi:  "text-violet-500",  insurance: "text-orange-500", other: "text-muted-foreground",
};
const TYPE_LABEL: Record<string, string> = {
  consultation:"Consult", procedure:"Procedure",
  "follow-up":"Follow-up", emergency:"Emergency", other:"Other",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const generatePin = () => String(Math.floor(100000 + Math.random() * 900000));

const formatDate = (d: any) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" });
};

const calcAge = (dob: any) => {
  if (!dob) return null;
  const today = new Date(); const birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
};

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { style:"currency", currency:"INR", maximumFractionDigits:0 }).format(n);

const fmtShort = (n: number) =>
  n >= 100000 ? `₹${(n/100000).toFixed(1)}L`
  : n >= 1000  ? `₹${(n/1000).toFixed(1)}K`
  : fmt(n);

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-IN", { day:"2-digit", month:"short" });

// ─── Locked Feature ───────────────────────────────────────────────────────────
const LockedFeature = ({
  label, minTier = 1, setTab,
}: { label: string; minTier?: number; setTab?: (t: Tab) => void }) => (
  <div className="max-w-2xl mx-auto flex flex-col items-center justify-center py-24 text-center">
    <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
      <Lock className="w-8 h-8 text-muted-foreground/40" />
    </div>
    <h3 className="font-semibold text-foreground mb-1">{label} requires Tier {minTier}</h3>
    <p className="text-sm text-muted-foreground mb-4">
      Enable Tier {minTier} in Settings to unlock this feature.
    </p>
    {setTab && (
      <Button variant="outline" size="sm" onClick={() => setTab("settings")}>
        Go to Settings
      </Button>
    )}
  </div>
);

// ─── Staff Card ───────────────────────────────────────────────────────────────
const StaffCard = ({ member, onDelete }: { member: any; onDelete: () => void }) => {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const user     = member.user || {};
  const photoUrl = member.photoUrl    ? `${BASE_URL.replace("/api","")}/${member.photoUrl}`    : null;
  const docUrl   = member.documentUrl ? `${BASE_URL.replace("/api","")}/${member.documentUrl}` : null;
  const age      = calcAge(member.dateOfBirth);

  const handleDelete = async () => {
    if (!confirm(`Remove ${user.name} from the system? This cannot be undone.`)) return;
    setDeleting(true);
    // Use staff's own _id as the delete key — most reliable
    const staffId = member._id || member.id;
    if (!staffId) { alert('Could not find staff ID. Please refresh and try again.'); setDeleting(false); return; }
    try { await apiDeleteStaff(staffId); onDelete(); }
    catch (e: any) { alert(e.message); }
    finally { setDeleting(false); }
  };

  return (
    <motion.div layout initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
      className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="flex items-center gap-4 p-4">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
          {photoUrl
            ? <img src={photoUrl} alt={user.name} className="w-full h-full object-cover" />
            : <User className="w-6 h-6 text-primary" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground truncate">{user.name}</p>
          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {member.specialization && (
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                {member.specialization}
              </span>
            )}
            {member.consultationFee > 0 && (
              <span className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full font-medium">
                {fmt(member.consultationFee)} fee
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => setExpanded(!expanded)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted transition-all">
            <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
          </button>
          <button onClick={handleDelete} disabled={deleting}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all">
            {deleting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height:0, opacity:0 }} animate={{ height:"auto", opacity:1 }}
            exit={{ height:0, opacity:0 }} className="overflow-hidden">
            <div className="border-t border-border mx-4" />
            <div className="p-4 grid grid-cols-2 gap-3">
              {age !== null && (
                <div className="flex items-start gap-2">
                  <User className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Age</p>
                    <p className="text-sm font-medium text-foreground">{age} yrs · {member.gender}</p>
                  </div>
                </div>
              )}
              {member.dateOfBirth && (
                <div className="flex items-start gap-2">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Date of Birth</p>
                    <p className="text-sm font-medium text-foreground">{formatDate(member.dateOfBirth)}</p>
                  </div>
                </div>
              )}
              {member.consultationFee > 0 && (
                <div className="flex items-start gap-2">
                  <IndianRupee className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Consultation Fee</p>
                    <p className="text-sm font-medium text-foreground">{fmt(member.consultationFee)}</p>
                  </div>
                </div>
              )}
              {member.qualification && (
                <div className="flex items-start gap-2">
                  <BadgeCheck className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Qualification</p>
                    <p className="text-sm font-medium text-foreground">{member.qualification}</p>
                  </div>
                </div>
              )}
              {member.licenseNumber && (
                <div className="flex items-start gap-2">
                  <BadgeCheck className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">License No.</p>
                    <p className="text-sm font-medium text-foreground">{member.licenseNumber}</p>
                  </div>
                </div>
              )}
              {member.department && (
                <div className="flex items-start gap-2">
                  <Building2 className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Department</p>
                    <p className="text-sm font-medium text-foreground">{member.department}</p>
                  </div>
                </div>
              )}
              {member.room && (
                <div className="flex items-start gap-2">
                  <Building2 className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Room</p>
                    <p className="text-sm font-medium text-foreground">{member.room}</p>
                  </div>
                </div>
              )}
              {(member.timeStart || member.timeEnd) && (
                <div className="flex items-start gap-2">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Working Hours</p>
                    <p className="text-sm font-medium text-foreground">{member.timeStart} – {member.timeEnd}</p>
                  </div>
                </div>
              )}
              {member.address && (
                <div className="flex items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Address</p>
                    <p className="text-sm font-medium text-foreground">{member.address}</p>
                  </div>
                </div>
              )}
              {member.availableDays?.length > 0 && (
                <div className="col-span-2 flex items-start gap-2">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground mb-1.5">Available Days</p>
                    <div className="flex flex-wrap gap-1.5">
                      {member.availableDays.map((d: string) => (
                        <span key={d} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{d}</span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {docUrl && (
                <div className="col-span-2">
                  <a href={docUrl} target="_blank" rel="noreferrer"
                    className="flex items-center gap-2 text-xs text-primary hover:underline">
                    <FileText className="w-3.5 h-3.5" /> View uploaded document (PDF)
                  </a>
                </div>
              )}
              <div className="col-span-2 pt-1">
                <p className="text-xs text-muted-foreground">Added {formatDate(user.createdAt)}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ─── Medicines Tab ────────────────────────────────────────────────────────────
const MedicinesTab = () => {
  const [subView,   setSubView]   = useState<SubView>("list");
  const [medicines, setMedicines] = useState<any[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [name,      setName]      = useState("");
  const [type,      setType]      = useState("");
  const [error,     setError]     = useState("");
  const [success,   setSuccess]   = useState("");
  const [adding,    setAdding]    = useState(false);

  const fetchMedicines = async () => {
    setLoading(true);
    try { const res = await apiFetch("/medicines"); setMedicines(res.medicines || []); }
    catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchMedicines(); }, []);

  const handleAdd = async () => {
    if (!name.trim() || !type) { setError("Both name and type are required."); return; }
    setError(""); setAdding(true);
    try {
      await apiAddMedicine({ name: name.trim(), type });
      setName(""); setType("");
      setSuccess("Medicine added!"); setTimeout(() => setSuccess(""), 3000);
      await fetchMedicines(); setSubView("list");
    } catch (err: any) { setError(err.message || "Failed"); }
    finally { setAdding(false); }
  };

  const handleDelete = async (id: string, mName: string) => {
    if (!confirm(`Delete "${mName}"?`)) return;
    try { await apiDeleteMedicine(id); await fetchMedicines(); }
    catch (e: any) { alert(e.message); }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-foreground">Medicines</h2>
          <p className="text-sm text-muted-foreground">{medicines.length} medicines available</p>
        </div>
        <div className="flex gap-2">
          <Button variant={subView==="list"?"default":"outline"} size="sm" onClick={() => setSubView("list")} className="rounded-xl gap-1.5">
            <List className="w-3.5 h-3.5" /> View All
          </Button>
          <Button variant={subView==="add"?"default":"outline"} size="sm" onClick={() => setSubView("add")} className="rounded-xl gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Add New
          </Button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {subView === "list" && (
          <motion.div key="list" initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}>
            {success && (
              <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl px-4 py-3 mb-4">
                <Check className="w-4 h-4 text-emerald-500" />
                <p className="text-sm text-emerald-700 dark:text-emerald-300">{success}</p>
              </div>
            )}
            {loading ? (
              <div className="text-center py-16 text-muted-foreground">
                <RefreshCw className="w-8 h-8 mx-auto mb-3 animate-spin opacity-40" />
                <p className="text-sm">Loading medicines...</p>
              </div>
            ) : medicines.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Pill className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No medicines yet</p>
                <p className="text-sm">Click "Add New" to add the first medicine</p>
              </div>
            ) : (
              <div className="space-y-2">
                {medicines.map((med, i) => (
                  <motion.div key={med._id} initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }}
                    transition={{ delay: i * 0.03 }}
                    className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Pill className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{med.name}</p>
                      <p className="text-xs text-muted-foreground">{med.type}</p>
                    </div>
                    <button onClick={() => handleDelete(med._id, med.name)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {subView === "add" && (
          <motion.div key="add" initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
            className="bg-card border border-border rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Add New Medicine</h3>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Name</label>
                <Input placeholder="e.g. Paracetamol" value={name} onChange={e => setName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleAdd()} className="h-11 rounded-xl" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Type</label>
                <div className="relative">
                  <select value={type} onChange={e => setType(e.target.value)}
                    className="w-full h-11 rounded-xl border border-border bg-background text-foreground px-3 pr-9 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-ring">
                    <option value="">Select type...</option>
                    {MEDICINE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>
            </div>
            {error && <p className="text-sm text-destructive mb-3">{error}</p>}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setSubView("list")} className="flex-1 h-11 rounded-xl">Cancel</Button>
              <Button onClick={handleAdd} disabled={adding} className="flex-1 h-11 rounded-xl gap-2">
                {adding ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {adding ? "Adding..." : "Add Medicine"}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Staff role definitions ──────────────────────────────────────────────────
const STAFF_ROLE_LIST = [
  { key: "doctor",       label: "Doctor",            emoji: "🩺", color: "text-blue-500",    bg: "bg-blue-500/10",    medical: true  },
  { key: "reception",    label: "Receptionist",       emoji: "👩‍💼", color: "text-violet-500",  bg: "bg-violet-500/10",  medical: false },
  { key: "lab_staff",    label: "Lab Staff",          emoji: "🔬", color: "text-cyan-500",    bg: "bg-cyan-500/10",    medical: false },
  { key: "radiologist",  label: "Radiologist",        emoji: "🩻", color: "text-indigo-500",  bg: "bg-indigo-500/10",  medical: true  },
  { key: "nurse",        label: "Nurse",              emoji: "💊", color: "text-emerald-500", bg: "bg-emerald-500/10", medical: false },
  { key: "housekeeping", label: "Housekeeping Staff", emoji: "🧹", color: "text-amber-500",   bg: "bg-amber-500/10",   medical: false },
  { key: "pharmacist",   label: "Pharmacist",         emoji: "💊", color: "text-rose-500",    bg: "bg-rose-500/10",    medical: false },
] as const;
type StaffRoleKey = typeof STAFF_ROLE_LIST[number]["key"];

// ─── Staff Tab ────────────────────────────────────────────────────────────────
const StaffTab = () => {
  const [subView,    setSubView]  = useState<SubView>("list");
  const [activeRole, setRole]     = useState<StaffRoleKey>("doctor");
  const [staffList,  setStaff]    = useState<any[]>([]);
  const [loading,    setLoading]  = useState(true);
  const [form,       setForm]     = useState<StaffForm>({ ...EMPTY_STAFF });
  const [showPwd,    setShowPwd]  = useState(false);
  const [copied,     setCopied]   = useState(false);
  const [error,      setError]    = useState("");
  const [success,    setSuccess]  = useState("");
  const [submitting, setSub]      = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);
  const pdfRef   = useRef<HTMLInputElement>(null);
  const sigRef   = useRef<HTMLInputElement>(null);
  const roleInfo = STAFF_ROLE_LIST.find(r => r.key === activeRole)!;

  const loadStaff = async () => {
    setLoading(true);
    try { const res = await apiFetch(`/admin/staff/${activeRole}`); setStaff(res.staff || []); }
    catch {} finally { setLoading(false); }
  };
  useEffect(() => { loadStaff(); }, [activeRole]);

  const set = (k: keyof StaffForm, v: any) => setForm(p => ({ ...p, [k]: v }));

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    set("photo", f); set("photoPreview", URL.createObjectURL(f));
  };
  const handleSignatureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    if (!["image/png","image/jpeg","image/jpg","image/webp"].includes(f.type)) { setError("Signature must be PNG, JPG or WebP"); return; }
    set("signatureFile", f); set("signaturePreview", URL.createObjectURL(f)); setError("");
  };
  const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    if (f.type !== "application/pdf") { setError("Only PDF allowed"); return; }
    set("pdfFile", f); set("pdfName", f.name); setError("");
  };
  const toggleDay = (d: string) =>
    set("availableDays", form.availableDays.includes(d)
      ? form.availableDays.filter((x: string) => x !== d) : [...form.availableDays, d]);

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.dob || !form.gender) {
      setError("Name, email, date of birth and gender are required."); return;
    }
    if (!form.pin) { setError("Please generate a PIN first."); return; }
    setError(""); setSub(true);
    try {
      const fd = new FormData();
      fd.append("name",           form.name.trim());
      fd.append("email",          form.email.trim());
      fd.append("pin",            form.pin);
      fd.append("role",           activeRole);
      fd.append("dateOfBirth",    form.dob);
      fd.append("gender",         form.gender);
      fd.append("address",        form.address);
      fd.append("specialization", form.specialization);
      fd.append("qualification",  form.qualification);
      fd.append("licenseNumber",  form.licenseNumber);
      fd.append("availableDays",  JSON.stringify(form.availableDays));
      fd.append("timeStart",      form.timeStart);
      fd.append("timeEnd",        form.timeEnd);
      fd.append("room",           form.room);
      fd.append("department",     form.department);
      fd.append("consultationFee",form.consultationFee || "0");
      if (form.photo)         fd.append("photo",     form.photo);
      if (form.pdfFile)       fd.append("document",  form.pdfFile);
      if (form.signatureFile) fd.append("signature", form.signatureFile);
      const res = await apiCreateStaff(fd);
      await loadStaff();
      setSuccess(res.message || "Staff member created successfully!");
      setForm({ ...EMPTY_STAFF });
    } catch (e: any) {
      const raw = e.message || "Failed to create staff member";
      // Convert technical errors to friendly messages
      const friendly = raw.includes("already exists") ? "This email is already registered. Please use a different email address."
        : raw.includes("valid enum") ? "Something went wrong with the role. Please refresh the page and try again."
        : raw.includes("required") ? "Please fill in all required fields."
        : raw.includes("PIN") ? "Please generate a 6-digit PIN before saving."
        : raw;
      setError(friendly);
    }
    finally { setSub(false); }
  };

  const maxDate = new Date().toISOString().split("T")[0];
  const minDate = `${new Date().getFullYear() - 80}-01-01`;
  const hasMedical = roleInfo.medical;
  const hasSig     = activeRole === "doctor" || activeRole === "radiologist";
  const hasFee     = activeRole === "doctor";

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-bold text-foreground">Staff Management</h2>
          <p className="text-sm text-muted-foreground">{staffList.length} {roleInfo.label.toLowerCase()}(s)</p>
        </div>
        <div className="flex gap-2">
          <Button variant={subView==="list"?"default":"outline"} size="sm" onClick={() => setSubView("list")} className="rounded-xl gap-1.5">
            <List className="w-3.5 h-3.5" /> View
          </Button>
          <Button variant={subView==="add"?"default":"outline"} size="sm" onClick={() => { setSubView("add"); setError(""); setSuccess(""); }} className="rounded-xl gap-1.5">
            <UserPlus className="w-3.5 h-3.5" /> Add
          </Button>
          <Button variant="ghost" size="sm" onClick={async () => {
            try {
              const r = await apiFetch("/admin/cleanup-orphans", { method: "DELETE" });
              setSuccess(r.message);
              await loadStaff();
            } catch {}
          }} className="rounded-xl gap-1.5 text-muted-foreground hover:text-destructive" title="Remove ghost accounts">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Role selector — 3 columns */}
      <div className="grid grid-cols-3 gap-2 mb-6">
        {STAFF_ROLE_LIST.map(r => (
          <button key={r.key} onClick={() => { setRole(r.key as StaffRoleKey); setSubView("list"); }}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all text-left ${
              activeRole === r.key
                ? "border-primary bg-primary/5 text-primary"
                : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
            }`}>
            <span className="text-base shrink-0">{r.emoji}</span>
            <span className="truncate text-xs">{r.label}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* ── List view ── */}
        {subView === "list" && (
          <motion.div key={`list-${activeRole}`} initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}>
            {loading ? (
              <div className="text-center py-16 text-muted-foreground">
                <RefreshCw className="w-8 h-8 mx-auto mb-3 animate-spin opacity-40" />
                <p className="text-sm">Loading...</p>
              </div>
            ) : staffList.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <span className="text-5xl mb-4 block">{roleInfo.emoji}</span>
                <p className="font-medium">No {roleInfo.label.toLowerCase()}s yet</p>
                <p className="text-sm mt-1">Click "Add" to register the first {roleInfo.label.toLowerCase()}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {staffList.map((member, i) => (
                  <motion.div key={member._id} initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay: i*0.04 }}>
                    <StaffCard member={member} onDelete={loadStaff} />
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ── Add view ── */}
        {subView === "add" && (
          <motion.div key="add" initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }} className="space-y-6">
            {false && (
              <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}
                className="flex items-start gap-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
                <Check className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
                <p className="text-sm text-emerald-700 dark:text-emerald-300 font-medium flex-1">{success}</p>
                <button onClick={() => setSuccess("")}><X className="w-4 h-4 text-emerald-500" /></button>
              </motion.div>
            )}

            {/* Role banner */}
            <div className={`flex items-center gap-3 ${roleInfo.bg} rounded-xl px-4 py-3`}>
              <span className="text-2xl">{roleInfo.emoji}</span>
              <div>
                <p className={`font-semibold text-sm ${roleInfo.color}`}>Adding {roleInfo.label}</p>
                <p className="text-xs text-muted-foreground">Fill in the details below</p>
              </div>
            </div>

            {/* Personal Details */}
            <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Personal Details</h3>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">Profile Photo</label>
                <div className="flex items-center gap-4">
                  <div onClick={() => photoRef.current?.click()}
                    className="w-20 h-20 rounded-2xl border-2 border-dashed border-border bg-muted flex items-center justify-center cursor-pointer hover:border-primary/50 transition-all overflow-hidden shrink-0">
                    {form.photoPreview
                      ? <img src={form.photoPreview} alt="" className="w-full h-full object-cover" />
                      : <Upload className="w-6 h-6 text-muted-foreground" />}
                  </div>
                  <div>
                    <Button variant="outline" size="sm" onClick={() => photoRef.current?.click()} className="rounded-xl gap-2 mb-1">
                      <Upload className="w-3.5 h-3.5" /> Upload Photo
                    </Button>
                    <p className="text-xs text-muted-foreground">JPG, PNG — max 10MB</p>
                  </div>
                  <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Full Name</label>
                <Input placeholder="Full name" value={form.name} onChange={e => set("name", e.target.value)} className="h-11 rounded-xl" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Email</label>
                <Input type="email" placeholder="email@example.com" value={form.email} onChange={e => set("email", e.target.value)} className="h-11 rounded-xl" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Date of Birth</label>
                  <Input type="date" value={form.dob} min={minDate} max={maxDate} onChange={e => set("dob", e.target.value)} className="h-11 rounded-xl" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Gender</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(["Male","Female","Other"] as const).map(g => (
                      <button key={g} type="button" onClick={() => set("gender", g)}
                        className={`h-11 rounded-xl border-2 text-xs font-medium transition-all ${
                          form.gender === g ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-primary/40"
                        }`}>{g}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Address</label>
                <textarea value={form.address} onChange={e => set("address", e.target.value)} placeholder="Full address..."
                  className="w-full bg-background border border-border rounded-xl p-3 text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground" />
              </div>
            </div>

            {/* Professional Details — for medical/qualified roles */}
            {hasMedical && (
              <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Professional Details</h3>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Specialization</label>
                  <div className="relative">
                    <select value={form.specialization} onChange={e => set("specialization", e.target.value)}
                      className="w-full h-11 rounded-xl border border-border bg-background text-foreground px-3 pr-9 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-ring">
                      <option value="">Select...</option>
                      {SPECIALIZATIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Qualification</label>
                  <div className="relative">
                    <select value={form.qualification} onChange={e => set("qualification", e.target.value)}
                      className="w-full h-11 rounded-xl border border-border bg-background text-foreground px-3 pr-9 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-ring">
                      <option value="">Select...</option>
                      {QUALIFICATIONS.map(q => <option key={q} value={q}>{q}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">License / Registration No.</label>
                  <Input placeholder="Reg. number" value={form.licenseNumber} onChange={e => set("licenseNumber", e.target.value)} className="h-11 rounded-xl" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Documents (PDF)</label>
                  <div onClick={() => pdfRef.current?.click()}
                    className="border-2 border-dashed border-border rounded-xl p-4 flex items-center gap-3 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all">
                    <FileText className={`w-5 h-5 shrink-0 ${form.pdfName ? "text-primary" : "text-muted-foreground"}`} />
                    <div className="flex-1 min-w-0">
                      {form.pdfName
                        ? <><p className="text-sm font-medium text-foreground truncate">{form.pdfName}</p><p className="text-xs text-emerald-600">Uploaded ✓</p></>
                        : <><p className="text-sm text-foreground">Click to upload PDF</p><p className="text-xs text-muted-foreground">Degree, license, etc.</p></>}
                    </div>
                    {form.pdfName && (
                      <button type="button" onClick={e => { e.stopPropagation(); set("pdfFile",null); set("pdfName",""); }}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10"><X className="w-3.5 h-3.5" /></button>
                    )}
                  </div>
                  <input ref={pdfRef} type="file" accept="application/pdf" className="hidden" onChange={handlePdfChange} />
                </div>
                {/* Signature — doctors and radiologists only */}
                {hasSig && (
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                      Signature <span className="font-normal text-muted-foreground">(appears on prescription PDF)</span>
                    </label>
                    <div onClick={() => sigRef.current?.click()}
                      className="border-2 border-dashed border-border rounded-xl p-4 flex items-center gap-4 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all">
                      {form.signaturePreview ? (
                        <>
                          <img src={form.signaturePreview} alt="sig" className="h-12 object-contain bg-white rounded-lg px-2 border border-border shrink-0" />
                          <div className="flex-1"><p className="text-sm font-medium text-foreground">Signature uploaded ✓</p><p className="text-xs text-emerald-600">Click to replace</p></div>
                          <button type="button" onClick={e=>{ e.stopPropagation(); set("signatureFile",null); set("signaturePreview",""); }}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10"><X className="w-3.5 h-3.5" /></button>
                        </>
                      ) : (
                        <>
                          <div className="w-16 h-12 rounded-lg border border-border bg-muted flex items-center justify-center shrink-0"><Upload className="w-5 h-5 text-muted-foreground" /></div>
                          <div><p className="text-sm text-foreground">Upload signature image</p><p className="text-xs text-muted-foreground">PNG recommended (transparent bg)</p></div>
                        </>
                      )}
                    </div>
                    <input ref={sigRef} type="file" accept="image/png,image/jpeg,image/jpg,image/webp" className="hidden" onChange={handleSignatureChange} />
                  </div>
                )}
              </div>
            )}

            {/* Work Details */}
            <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Work Details</h3>
              {hasFee && (
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Consultation Fee (₹)</label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input type="number" min="0" placeholder="e.g. 500" value={form.consultationFee} onChange={e => set("consultationFee", e.target.value)} className="pl-9 h-11 rounded-xl" />
                  </div>
                </div>
              )}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">Available Days</label>
                <div className="flex gap-2 flex-wrap">
                  {DAYS.map(d => (
                    <button key={d} type="button" onClick={() => toggleDay(d)}
                      className={`px-4 py-2 rounded-xl border-2 text-sm font-medium transition-all ${
                        form.availableDays.includes(d) ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-primary/40"
                      }`}>{d}</button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Start Time</label>
                  <Input type="time" value={form.timeStart} onChange={e => set("timeStart", e.target.value)} className="h-11 rounded-xl" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">End Time</label>
                  <Input type="time" value={form.timeEnd} onChange={e => set("timeEnd", e.target.value)} className="h-11 rounded-xl" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Room / Station</label>
                  <Input placeholder="e.g. Lab 3, Room 204" value={form.room} onChange={e => set("room", e.target.value)} className="h-11 rounded-xl" />
                </div>
                {["doctor","lab_staff","radiologist","nurse"].includes(activeRole) && (
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Department</label>
                  <div className="relative">
                    <select value={form.department} onChange={e => set("department", e.target.value)}
                      className="w-full h-11 rounded-xl border border-border bg-background text-foreground px-3 pr-9 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-ring">
                      <option value="">Select...</option>
                      {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
                )}
              </div>
            </div>

            {/* PIN */}
            <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Login PIN</h3>
              <p className="text-xs text-muted-foreground">Generate a 6-digit PIN — it will be emailed to the staff member automatically.</p>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input type={showPwd ? "text" : "password"} value={form.pin} readOnly placeholder="Click Generate..." className="h-11 rounded-xl pr-10 font-mono text-sm" />
                  {form.pin && (
                    <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  )}
                </div>
                <Button variant="outline" onClick={() => set("pin", generatePin())} className="h-11 rounded-xl gap-2 shrink-0">
                  <RefreshCw className="w-4 h-4" /> Generate
                </Button>
                {form.pin && (
                  <Button variant="outline" onClick={() => { navigator.clipboard.writeText(form.pin); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="h-11 rounded-xl gap-2 shrink-0">
                    {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    {copied ? "Copied" : "Copy"}
                  </Button>
                )}
              </div>
              {form.pin && (/^[0-9]{6}$/.test(form.pin)
                ? <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400"><Check className="w-3 h-3" /> Valid 6-digit PIN</span>
                : <span className="text-xs text-muted-foreground">PIN must be exactly 6 digits</span>
              )}
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex gap-3 pb-4">
              <Button variant="outline" onClick={() => { setSubView("list"); setError(""); }} className="flex-1 h-12 rounded-xl">Cancel</Button>
              <Button onClick={handleSubmit} disabled={submitting} className="flex-1 h-12 rounded-xl gap-2">
                {submitting
                  ? <><RefreshCw className="w-4 h-4 animate-spin" /> Creating...</>
                  : `Add ${roleInfo.label} & Send Credentials`}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Revenue Tab (Tier 1) ─────────────────────────────────────────────────────
const RevenueTab = ({ tier }: { tier: number }) => {
  const [stats,   setStats]   = useState<RevenueStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (tier < 1) return;
    apiGetRevenueStats().then(setStats).catch(() => {}).finally(() => setLoading(false));
  }, [tier]);

  if (tier < 1) return <LockedFeature label="Revenue Dashboard" minTier={1} />;

  const cards = [
    { label:"Today",    value: stats?.today   ?? 0, icon: Calendar,   color:"text-emerald-500", bg:"bg-emerald-500/10" },
    { label:"Month",    value: stats?.month   ?? 0, icon: TrendingUp,  color:"text-blue-500",    bg:"bg-blue-500/10"   },
    { label:"Year",     value: stats?.year    ?? 0, icon: BarChart3,   color:"text-violet-500",  bg:"bg-violet-500/10" },
    { label:"All Time", value: stats?.allTime ?? 0, icon: IndianRupee, color:"text-amber-500",   bg:"bg-amber-500/10"  },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Revenue</h2>
        <p className="text-sm text-muted-foreground">Clinic earnings overview</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {cards.map((card, i) => (
          <motion.div key={card.label} initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}
            transition={{ delay: i * 0.07 }} className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{card.label}</span>
              <div className={`w-8 h-8 rounded-lg ${card.bg} flex items-center justify-center`}>
                <card.icon className={`w-4 h-4 ${card.color}`} />
              </div>
            </div>
            {loading
              ? <div className="h-7 w-24 bg-muted animate-pulse rounded-lg" />
              : <p className="text-2xl font-bold text-foreground">{fmt(card.value)}</p>}
          </motion.div>
        ))}
      </div>

      {!loading && stats?.patientsToday !== undefined && (
        <div className="bg-card border border-border rounded-2xl p-5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Patients Today</p>
          <p className="text-3xl font-bold text-foreground">{stats.patientsToday}</p>
        </div>
      )}

      {!loading && (stats?.revenueByMethod?.length ?? 0) > 0 && (
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Today by Payment Method</h3>
          <div className="space-y-3">
            {stats!.revenueByMethod.map(m => {
              const Icon  = METHOD_ICON[m._id] ?? Wallet;
              const total = stats!.revenueByMethod.reduce((s, x) => s + x.total, 0);
              const pct   = total ? Math.round((m.total / total) * 100) : 0;
              return (
                <div key={m._id} className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${METHOD_COLOR[m._id] ?? "text-muted-foreground"}`} />
                  <span className="text-sm capitalize text-foreground flex-1">{m._id}</span>
                  <div className="flex-1 max-w-[120px] bg-muted rounded-full h-1.5 overflow-hidden">
                    <div className="bg-primary h-full rounded-full" style={{ width:`${pct}%` }} />
                  </div>
                  <span className="text-sm font-medium text-foreground w-20 text-right">{fmt(m.total)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Revenue Line Chart (SVG, interactive) ───────────────────────────────────
const RevenueLineChart = ({ data, days }: { data: DailyPoint[]; days: number }) => {
  const [hovered, setHovered] = useState<number | null>(null);

  if (data.length === 0) return (
    <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
      No revenue data for this period
    </div>
  );

  const W = 600; const H = 260;
  const padL = 56; const padR = 16; const padT = 16; const padB = 40;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const maxVal  = Math.max(...data.map(d => d.revenue), 1);
  const n       = data.length;

  // Map data to SVG coords
  const ptX = (i: number) => padL + (i / (n - 1)) * plotW;
  const ptY = (v: number) => padT + plotH - (v / maxVal) * plotH;

  // Build smooth cubic-bezier path
  const buildPath = () => {
    if (n < 2) return `M ${ptX(0)} ${ptY(data[0].revenue)}`;
    const pts = data.map((d, i) => ({ x: ptX(i), y: ptY(d.revenue) }));
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1];
      const curr = pts[i];
      const cpx  = (prev.x + curr.x) / 2;
      d += ` C ${cpx} ${prev.y} ${cpx} ${curr.y} ${curr.x} ${curr.y}`;
    }
    return d;
  };

  // Area fill path (close to bottom)
  const buildArea = () => {
    const linePath = buildPath();
    const lastX = ptX(n - 1);
    const firstX = ptX(0);
    return `${linePath} L ${lastX} ${padT + plotH} L ${firstX} ${padT + plotH} Z`;
  };

  const labelEvery = days >= 30 ? 5 : days >= 14 ? 2 : 1;
  const yTicks     = [0, 0.25, 0.5, 0.75, 1].map(f => ({ val: maxVal * f, y: ptY(maxVal * f) }));

  const total   = data.reduce((s, d) => s + d.revenue, 0);
  const avg     = Math.round(total / (n || 1));
  const peak    = Math.max(...data.map(d => d.revenue));
  const peakIdx = data.findIndex(d => d.revenue === peak);

  const hovX = hovered !== null ? ptX(hovered) : null;
  const hovY = hovered !== null ? ptY(data[hovered].revenue) : null;
  const hovRev = hovered !== null ? data[hovered].revenue : null;
  const hovDate = hovered !== null ? data[hovered].date : null;

  // Tooltip X clamping
  const tooltipX = (x: number) => Math.min(Math.max(x - 40, padL), W - padR - 80);

  return (
    <div className="w-full select-none" style={{ overflow: "visible" }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ height: 300, overflow: "visible" }}
        overflow="visible"
      >
        <defs>
          {/* Gradient fill under line */}
          <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#3b82f6" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.01" />
          </linearGradient>
          {/* Glow for peak dot */}
          <filter id="glow">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Y gridlines */}
        {yTicks.map((t, i) => (
          <g key={i}>
            <line x1={padL} y1={t.y} x2={W - padR} y2={t.y}
              stroke="#e2e8f0" strokeWidth="0.8"
              strokeDasharray={i === 0 ? "none" : "4,4"} />
            <text x={padL - 6} y={t.y + 4} textAnchor="end"
              fontSize="10" fill="#94a3b8" fontFamily="system-ui">
              {t.val >= 100000
                ? `₹${(t.val/100000).toFixed(1)}L`
                : t.val >= 1000
                  ? `₹${(t.val/1000).toFixed(0)}K`
                  : t.val === 0 ? "₹0" : `₹${Math.round(t.val)}`}
            </text>
          </g>
        ))}

        {/* X axis line */}
        <line x1={padL} y1={padT + plotH} x2={W - padR} y2={padT + plotH}
          stroke="#e2e8f0" strokeWidth="1" />

        {/* Hover vertical line */}
        {hovX !== null && (
          <line x1={hovX} y1={padT} x2={hovX} y2={padT + plotH}
            stroke="#3b82f6" strokeWidth="1" strokeDasharray="4,3" opacity="0.5" />
        )}

        {/* Area fill */}
        <path d={buildArea()} fill="url(#lineGrad)" />

        {/* Main line */}
        <path d={buildPath()} fill="none" stroke="#3b82f6" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round" />

        {/* Peak highlight dot */}
        {peakIdx >= 0 && peak > 0 && (
          <circle cx={ptX(peakIdx)} cy={ptY(peak)} r="5"
            fill="#3b82f6" filter="url(#glow)" opacity="0.6" />
        )}

        {/* Interactive hit areas + dots */}
        {data.map((d, i) => (
          <g key={i}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
            style={{ cursor: "crosshair" }}
          >
            {/* Wide invisible hit zone */}
            <rect x={ptX(i) - plotW / n / 2} y={padT}
              width={plotW / n} height={plotH} fill="transparent" />

            {/* Dot — shown on hover or on peak */}
            {(hovered === i || i === peakIdx) && d.revenue > 0 && (
              <g>
                <circle cx={ptX(i)} cy={ptY(d.revenue)} r="6"
                  fill="#3b82f6" opacity="0.15" />
                <circle cx={ptX(i)} cy={ptY(d.revenue)} r="4"
                  fill="white" stroke="#3b82f6" strokeWidth="2" />
              </g>
            )}

            {/* X label */}
            {i % labelEvery === 0 && (
              <text x={ptX(i)} y={H - 10} textAnchor="middle"
                fontSize="10" fill={hovered === i ? "#3b82f6" : "#94a3b8"}
                fontFamily="system-ui" fontWeight={hovered === i ? "600" : "400"}>
                {fmtDate(d.date)}
              </text>
            )}
          </g>
        ))}

        {/* Tooltip */}
        {hovered !== null && hovX !== null && hovY !== null && hovRev !== null && hovRev > 0 && (
          <g>
            <rect x={tooltipX(hovX)} y={hovY - 44}
              width={80} height={34} rx="6"
              fill="#1e293b" opacity="0.92" />
            <text x={tooltipX(hovX) + 40} y={hovY - 27}
              textAnchor="middle" fontSize="11" fill="white"
              fontFamily="system-ui" fontWeight="700">
              {fmtShort(hovRev)}
            </text>
            <text x={tooltipX(hovX) + 40} y={hovY - 14}
              textAnchor="middle" fontSize="9" fill="#94a3b8"
              fontFamily="system-ui">
              {hovDate ? fmtDate(hovDate) : ""}
            </text>
          </g>
        )}
      </svg>

      {/* Summary stats */}
      <div className="flex items-center justify-between mt-3 px-1">
        {[
          { label: "Total",    val: fmt(total) },
          { label: "Avg/day",  val: fmt(avg)   },
          { label: "Peak day", val: fmt(peak)  },
        ].map(s => (
          <div key={s.label} className="text-center">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="text-sm font-bold text-foreground">{s.val}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Analytics Tab (Tier 2) ───────────────────────────────────────────────────
const AnalyticsTab = ({ tier }: { tier: number }) => {
  const [dailyPeriod, setDailyPeriod] = useState<"days"|"week"|"month"|"year"|"day">("days");
  const [dailyDays,   setDailyDays]   = useState<7|14|30>(7);
  const [dailyDate,   setDailyDate]   = useState("");
  const [dailyData,   setDailyData]   = useState<DailyPoint[]>([]);
  const [dailyLoading,setDailyLoading]= useState(false);
  const [deptData,    setDeptData]    = useState<DeptRevenue[]>([]);
  const [perfData,    setPerfData]    = useState<DoctorPerf[]>([]);
  const [breakdown,   setBreakdown]   = useState<PayBreakdown[]>([]);
  const [loading,     setLoading]     = useState(true);

  const loadDaily = useCallback(async (
    period: "days"|"week"|"month"|"year"|"day",
    days: 7|14|30 = 7,
    date?: string
  ) => {
    setDailyLoading(true);
    try {
      const r = await apiGetDailyGraph({ period, days, date });
      setDailyData(r.data || []);
    } catch {}
    finally { setDailyLoading(false); }
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([
        apiGetDailyGraph({ period: "days", days: 7 }).then(r => setDailyData(r.data || [])),
        apiGetRevenueByDepartment().then(r => setDeptData(r.departments || [])),
        apiGetDoctorPerformance().then(r => setPerfData(r.doctors || [])),
        apiGetPaymentBreakdown().then(r => setBreakdown(r.breakdown || [])),
      ]);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (tier < 2) return;
    loadAll();
  }, [tier]);

  if (tier < 2) return <LockedFeature label="Revenue Analytics" minTier={2} />;

  const METHOD_FILL: Record<string, string> = {
    cash:"#10b981", upi:"#8b5cf6", card:"#3b82f6", insurance:"#f59e0b", other:"#6b7280",
  };

  // Smart X-axis label based on period
  const dailyTotal = dailyData.reduce((s, d) => s + d.revenue, 0);
  const dailyPeak  = dailyData.reduce((best, d) => d.revenue > best.revenue ? d : best, dailyData[0] ?? { revenue: 0, date: "" });

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Revenue Insights</h2>
        <p className="text-sm text-muted-foreground">Detailed analytics — Tier 2</p>
      </div>

      {/* ── Daily Revenue Graph ── */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
          <div>
            <h3 className="font-semibold text-foreground">Daily Revenue</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {dailyData.length > 0
                ? `Total: ${fmt(dailyTotal)} · Peak: ${fmt(dailyPeak.revenue)}`
                : "Revenue collected over time"}
            </p>
          </div>

          {/* Period selector */}
          <div className="flex flex-col gap-2 shrink-0">
            <div className="flex gap-1 bg-muted rounded-xl p-1">
              {/* Quick N-days buttons */}
              {([7, 14, 30] as const).map(d => (
                <button key={d} onClick={() => {
                  setDailyPeriod("days"); setDailyDays(d);
                  loadDaily("days", d);
                }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    dailyPeriod === "days" && dailyDays === d
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}>{d}d</button>
              ))}
              {/* Period buttons */}
              {(["week","month","year","day"] as const).map(p => (
                <button key={p} onClick={() => {
                  setDailyPeriod(p);
                  if (p !== "day") loadDaily(p, dailyDays);
                  else loadDaily("day", dailyDays, dailyDate || new Date().toISOString().split("T")[0]);
                }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${
                    dailyPeriod === p
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}>{p === "week" ? "Wk" : p === "month" ? "Mo" : p === "year" ? "Yr" : "Day"}</button>
              ))}
            </div>

            {/* Date picker for specific day */}
            {dailyPeriod === "day" && (
              <input type="date"
                value={dailyDate || new Date().toISOString().split("T")[0]}
                max={new Date().toISOString().split("T")[0]}
                onChange={e => {
                  setDailyDate(e.target.value);
                  loadDaily("day", dailyDays, e.target.value);
                }}
                className="h-8 px-3 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring"
              />
            )}
          </div>
        </div>

        {dailyLoading ? (
          <div className="h-64 bg-muted animate-pulse rounded-xl" />
        ) : (
          <RevenueLineChart data={dailyData} days={dailyPeriod === "year" ? 12 : dailyDays} />
        )}
      </div>

      {/* ── Revenue by Department ── */}
      {!loading && deptData.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="mb-5">
            <h3 className="font-semibold text-foreground">Revenue by Department</h3>
            <p className="text-xs text-muted-foreground mt-0.5">This month's revenue split by department</p>
          </div>
          <div className="space-y-4">
            {deptData.map((d, i) => {
              const total = deptData.reduce((s, x) => s + x.revenue, 0);
              const pct   = total ? Math.round((d.revenue / total) * 100) : 0;
              const colors = ["bg-indigo-500","bg-blue-500","bg-emerald-500","bg-violet-500","bg-amber-500","bg-rose-500"];
              const color  = colors[i % colors.length];
              return (
                <div key={d.department}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-foreground">{d.department}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-foreground">{fmt(d.revenue)}</span>
                      <span className="text-xs text-muted-foreground w-8 text-right">{pct}%</span>
                    </div>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                      className={`h-full ${color} rounded-full`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Payment Method Breakdown ── */}
      {!loading && breakdown.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="mb-5">
            <h3 className="font-semibold text-foreground">Payment Breakdown</h3>
            <p className="text-xs text-muted-foreground mt-0.5">This month — how patients paid</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            {breakdown.map(b => {
              const Icon  = METHOD_ICON[b.method] ?? Wallet;
              const color = METHOD_COLOR[b.method] ?? "text-muted-foreground";
              const fill  = METHOD_FILL[b.method]  ?? "#6b7280";
              return (
                <div key={b.method}
                  className="rounded-2xl p-4 flex flex-col gap-2"
                  style={{ background: `${fill}15`, border: `1px solid ${fill}30` }}>
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${color}`} />
                    <span className="text-xs font-semibold capitalize text-foreground">{b.method}</span>
                  </div>
                  <p className="text-xl font-bold text-foreground">{fmt(b.total)}</p>
                  <p className="text-xs text-muted-foreground">{b.count} txns · {b.percentage}%</p>
                  {/* Mini progress */}
                  <div className="h-1.5 bg-black/10 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width:`${b.percentage}%`, background: fill }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Doctor Performance ── */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-border">
          <h3 className="font-semibold text-foreground">Doctor Performance</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Revenue, patients, and earnings this month</p>
        </div>

        {loading ? (
          <div className="h-32 m-6 bg-muted animate-pulse rounded-xl" />
        ) : perfData.filter(d => d.totalRevenue > 0).length === 0 ? (
          <div className="p-12 text-center">
            <Stethoscope className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No revenue data yet this month</p>
          </div>
        ) : (
          perfData.filter(d => d.totalRevenue > 0).map((d, idx) => (
            <div key={d.doctorId} className={`px-6 py-5 ${idx > 0 ? "border-t border-border" : ""}`}>
              {/* Header row */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Stethoscope className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Dr. {d.name}</p>
                    <p className="text-xs text-muted-foreground">{d.specialization}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-foreground">{fmt(d.totalRevenue)}</p>
                  <p className="text-xs text-muted-foreground">{d.patientCount} patients</p>
                </div>
              </div>

              {/* Payment method breakdown */}
              <div className="grid grid-cols-4 gap-2 mb-4">
                {[
                  { label:"Cash",      val:d.cashRevenue,      icon:Banknote,   color:"text-emerald-500", bg:"bg-emerald-500/10" },
                  { label:"UPI",       val:d.upiRevenue,       icon:Smartphone, color:"text-violet-500",  bg:"bg-violet-500/10"  },
                  { label:"Card",      val:d.cardRevenue,      icon:CreditCard, color:"text-blue-500",    bg:"bg-blue-500/10"    },
                  { label:"Insurance", val:d.insuranceRevenue, icon:Shield,     color:"text-orange-500",  bg:"bg-orange-500/10"  },
                ].map(m => (
                  <div key={m.label} className={`${m.bg} rounded-xl p-3 text-center`}>
                    <m.icon className={`w-4 h-4 ${m.color} mx-auto mb-1`} />
                    <p className="text-sm font-bold text-foreground">{fmtShort(m.val)}</p>
                    <p className="text-[10px] text-muted-foreground">{m.label}</p>
                  </div>
                ))}
              </div>

              {/* Earnings split */}
              {d.salaryType ? (
                <div className="bg-muted/40 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <BadgePercent className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs font-medium text-muted-foreground">
                        {d.salaryType === "percentage"
                          ? `${d.percentage}% revenue share model`
                          : `Fixed salary model — ${fmt(d.fixedAmount ?? 0)}/month`}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">Revenue: {fmt(d.totalRevenue)}</span>
                  </div>
                  {/* Visual split bar */}
                  <div className="h-4 bg-background rounded-full overflow-hidden flex mb-3">
                    <div
                      className="h-full bg-amber-400 transition-all"
                      style={{ width: `${d.totalRevenue > 0 ? (d.estimatedPayout / d.totalRevenue) * 100 : 0}%` }}
                    />
                    <div className="h-full bg-emerald-500 flex-1" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-sm bg-amber-400" />
                      <span className="text-xs text-muted-foreground">Doctor payout</span>
                      <span className="text-xs font-bold text-amber-600 dark:text-amber-400 ml-1">{fmt(d.estimatedPayout)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{fmt(d.clinicEarnings)}</span>
                      <span className="text-xs text-muted-foreground">Clinic earns</span>
                      <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    No salary configured — set one in the Salary tab
                  </p>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// ─── Salary Tab (Tier 1) ──────────────────────────────────────────────────────
const SalaryTab = ({ tier }: { tier: number }) => {
  const [doctorStats,    setDoctorStats]    = useState<DoctorStat[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [salaryRoleFilter, setSalaryRoleFilter] = useState<string>("all");
  const [editingId,      setEditingId]      = useState<string | null>(null);
  const [salaryType,     setSalaryType]     = useState<"fixed"|"percentage"|"mixed">("fixed");
  const [salaryFixed,    setSalaryFixed]    = useState("");
  const [salaryPct,      setSalaryPct]      = useState("");
  const [mixedFixed,     setMixedFixed]     = useState("");
  const [consultPct,     setConsultPct]     = useState("");
  const [procedurePct,   setProcedurePct]   = useState("");
  const [saving,         setSaving]         = useState(false);
  const [saveError,      setSaveError]      = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await apiGetAllStaffStats(); setDoctorStats(r.staff || []); }
    catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { if (tier >= 1) load(); }, [tier]);

  if (tier < 1) return <LockedFeature label="Salary Management" minTier={1} />;

  const openEdit = (d: DoctorStat) => {
    setEditingId(d.staffId || d.doctorId);
    const t = (d as any).mixedFixed !== null && (d as any).mixedFixed !== undefined
      ? "mixed" : (d.salaryType ?? "fixed");
    setSalaryType(t as any);
    setSalaryFixed(d.fixedAmount     ? String(d.fixedAmount)              : "");
    setSalaryPct(d.percentage        ? String(d.percentage)               : "");
    setMixedFixed((d as any).mixedFixed      ? String((d as any).mixedFixed)     : "");
    setConsultPct((d as any).consultationPct ? String((d as any).consultationPct): "");
    setProcedurePct((d as any).procedurePct  ? String((d as any).procedurePct)   : "");
    setSaveError("");
  };

  const save = async (doctorId: string) => {
    setSaveError(""); setSaving(true);
    try {
      await apiUpsertSalaryConfig(doctorId, {
        type:             salaryType,
        fixedAmount:      salaryType === "fixed"      ? Number(salaryFixed)  : undefined,
        percentage:       salaryType === "percentage" ? Number(salaryPct)    : undefined,
        mixedFixed:       salaryType === "mixed"      ? Number(mixedFixed)   : undefined,
        consultationPct:  salaryType === "mixed"      ? Number(consultPct)   : undefined,
        procedurePct:     salaryType === "mixed"      ? Number(procedurePct) : undefined,
      });
      setEditingId(null);
      await load();
    } catch (e: any) { setSaveError(e.message || "Failed to save"); }
    finally { setSaving(false); }
  };

  const typeInfo = [
    { key:"fixed"      as const, label:"Fixed",    icon:Banknote,    color:"text-blue-500",   desc:"Fixed monthly amount" },
    { key:"percentage" as const, label:"% Revenue", icon:BadgePercent, color:"text-violet-500", desc:"% of total revenue" },
    { key:"mixed"      as const, label:"Mixed",    icon:TrendingUp,   color:"text-emerald-500", desc:"Base + % per type" },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div>
        <h2 className="text-xl font-bold text-foreground">Salary Configuration</h2>
        <p className="text-sm text-muted-foreground">Set compensation for all staff members</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {typeInfo.map(c => (
          <div key={c.key} className="bg-card border border-border rounded-xl p-3 flex gap-2.5">
            <div className={`w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0`}>
              <c.icon className={`w-4 h-4 ${c.color}`} />
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">{c.label}</p>
              <p className="text-xs text-muted-foreground">{c.desc}</p>
            </div>
          </div>
        ))}
      </div>


      <div className="bg-card border border-border rounded-2xl divide-y divide-border overflow-hidden">
        {/* Role filter tabs */}
        <div className="flex gap-1 flex-wrap p-3 border-b border-border bg-muted/30">
          {[
            { key: "all",          label: "All Staff"    },
            { key: "doctor",       label: "Doctors"      },
            { key: "reception",    label: "Reception"    },
            { key: "nurse",        label: "Nurses"       },
            { key: "lab_staff",    label: "Lab Staff"    },
            { key: "radiologist",  label: "Radiologists" },
            { key: "housekeeping", label: "Housekeeping" },
            { key: "pharmacist",   label: "Pharmacists"  },
          ].map(r => (
            <button key={r.key} onClick={() => setSalaryRoleFilter(r.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                salaryRoleFilter === r.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:text-foreground border border-border"
              }`}>
              {r.label}
            </button>
          ))}
        </div>
        {loading
          ? <div className="h-24 m-4 bg-muted animate-pulse rounded-xl" />
          : doctorStats.filter(d => salaryRoleFilter === "all" || d.role === salaryRoleFilter).length === 0
            ? <div className="p-8 text-center text-sm text-muted-foreground">No staff found</div>
            : doctorStats.filter(d => salaryRoleFilter === "all" || d.role === salaryRoleFilter).map(d => (
              <div key={d.staffId || d.doctorId} className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Stethoscope className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-foreground">{d.role === "doctor" ? "Dr. " : ""}{d.name}</p>
                      <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full capitalize">{d.role?.replace("_"," ")}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {(d as any).mixedFixed !== null && (d as any).mixedFixed !== undefined
                        ? `Mixed · ₹${(d as any).mixedFixed}/mo base + ${(d as any).consultationPct ?? 0}% consult / ${(d as any).procedurePct ?? 0}% procedure`
                        : d.salaryType === "fixed"
                          ? `Fixed · ${fmt(d.fixedAmount ?? 0)}/month`
                          : d.salaryType === "percentage"
                            ? `${d.percentage}% of revenue · Est. ${fmt(d.estimatedPayout)} this month`
                            : "No salary configured"}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" variant="outline" className="rounded-xl text-xs h-8"
                      onClick={() => editingId === (d.staffId || d.doctorId) ? setEditingId(null) : openEdit(d)}>
                      {editingId === (d.staffId || d.doctorId) ? "Cancel" : d.salaryType ? "Edit" : "Set"}
                    </Button>
                    {d.salaryType && (
                      <Button size="sm" variant="ghost"
                        className="rounded-xl text-xs text-destructive hover:text-destructive h-8 w-8 p-0"
                        onClick={async () => { await apiDeleteSalaryConfig(d.staffId || d.doctorId); await load(); }}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>

                <AnimatePresence>
                  {editingId === (d.staffId || d.doctorId) && (
                    <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:"auto" }}
                      exit={{ opacity:0, height:0 }} className="overflow-hidden">
                      <div className="mt-4 pt-4 border-t border-border space-y-3">
                        {/* Type selector */}
                        <div className={`grid gap-2 ${tier >= 3 ? "grid-cols-3" : "grid-cols-2"}`}>
                          {typeInfo.filter(t => tier >= 3 || t.key !== "mixed").map(t => (
                            <button key={t.key} onClick={() => setSalaryType(t.key)}
                              className={`py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${
                                salaryType === t.key ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground"
                              }`}>
                              <t.icon className="w-4 h-4 inline mr-1" />{t.label}
                            </button>
                          ))}
                        </div>

                        {/* Fixed */}
                        {salaryType === "fixed" && (
                          <div className="relative">
                            <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input type="number" placeholder="Monthly salary (₹)"
                              value={salaryFixed} onChange={e => setSalaryFixed(e.target.value)}
                              className="pl-9 h-11 rounded-xl" />
                          </div>
                        )}

                        {/* Percentage — slider */}
                        {salaryType === "percentage" && (
                          <>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                  Revenue Share
                                </label>
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="number" min="0" max="100"
                                    value={salaryPct}
                                    onChange={e => {
                                      const v = Math.min(100, Math.max(0, Number(e.target.value)));
                                      setSalaryPct(isNaN(v) ? "" : String(v));
                                    }}
                                    className="w-16 h-9 rounded-lg border border-border bg-background text-foreground text-center text-lg font-bold focus:outline-none focus:ring-2 focus:ring-ring"
                                    placeholder="0"
                                  />
                                  <span className="text-xl font-bold text-primary">%</span>
                                </div>
                              </div>
                              <input
                                type="range"
                                min="0"
                                max="100"
                                step="1"
                                value={salaryPct || "0"}
                                onChange={e => setSalaryPct(e.target.value)}
                                className="w-full h-2 rounded-full appearance-none cursor-pointer accent-primary bg-muted"
                              />
                              <div className="flex justify-between text-[10px] text-muted-foreground">
                                <span>0%</span>
                                <span>25%</span>
                                <span>50%</span>
                                <span>75%</span>
                                <span>100%</span>
                              </div>
                            </div>
                            {salaryPct && d.revenueGenerated > 0 && (
                              <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">
                                  {Number(salaryPct)}% of {fmt(d.revenueGenerated)} this month
                                </span>
                                <span className="text-sm font-bold text-primary">
                                  {fmt(Math.round(d.revenueGenerated * Number(salaryPct) / 100))}
                                </span>
                              </div>
                            )}
                          </>
                        )}

                        {/* Mixed model — Tier 3 */}
                        {salaryType === "mixed" && (
                          <div className="space-y-4">

                            {/* Base fixed salary */}
                            <div>
                              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                                Base Monthly Fixed Salary (₹)
                              </label>
                              <div className="relative">
                                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input type="number" min="0" placeholder="e.g. 20000"
                                  value={mixedFixed} onChange={e => setMixedFixed(e.target.value)}
                                  className="pl-9 h-10 rounded-xl" />
                              </div>
                            </div>

                            {/* Consultation % — slider + input */}
                            <div className="bg-muted/40 rounded-xl p-4 space-y-2">
                              <div className="flex items-center justify-between">
                                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                  Consultation %
                                </label>
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="number" min="0" max="100"
                                    value={consultPct}
                                    onChange={e => {
                                      const v = Math.min(100, Math.max(0, Number(e.target.value)));
                                      setConsultPct(isNaN(v) ? "" : String(v));
                                    }}
                                    className="w-16 h-8 rounded-lg border border-border bg-background text-foreground text-center text-sm font-bold focus:outline-none focus:ring-2 focus:ring-ring"
                                    placeholder="0"
                                  />
                                  <span className="text-sm font-bold text-violet-500">%</span>
                                </div>
                              </div>
                              <input
                                type="range" min="0" max="100" step="1"
                                value={consultPct || "0"}
                                onChange={e => setConsultPct(e.target.value)}
                                className="w-full h-2 rounded-full appearance-none cursor-pointer accent-violet-500 bg-muted"
                              />
                              <div className="flex justify-between text-[10px] text-muted-foreground">
                                <span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
                              </div>
                              {consultPct && (d as any).consultRevenue > 0 && (
                                <div className="flex items-center justify-between pt-1 border-t border-border/50">
                                  <span className="text-xs text-muted-foreground">
                                    {consultPct}% of {fmt((d as any).consultRevenue || 0)}
                                  </span>
                                  <span className="text-xs font-semibold text-violet-600 dark:text-violet-400">
                                    {fmt(Math.round(((d as any).consultRevenue || 0) * Number(consultPct) / 100))}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Procedure % — slider + input */}
                            <div className="bg-muted/40 rounded-xl p-4 space-y-2">
                              <div className="flex items-center justify-between">
                                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                  Procedure %
                                </label>
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="number" min="0" max="100"
                                    value={procedurePct}
                                    onChange={e => {
                                      const v = Math.min(100, Math.max(0, Number(e.target.value)));
                                      setProcedurePct(isNaN(v) ? "" : String(v));
                                    }}
                                    className="w-16 h-8 rounded-lg border border-border bg-background text-foreground text-center text-sm font-bold focus:outline-none focus:ring-2 focus:ring-ring"
                                    placeholder="0"
                                  />
                                  <span className="text-sm font-bold text-emerald-500">%</span>
                                </div>
                              </div>
                              <input
                                type="range" min="0" max="100" step="1"
                                value={procedurePct || "0"}
                                onChange={e => setProcedurePct(e.target.value)}
                                className="w-full h-2 rounded-full appearance-none cursor-pointer accent-emerald-500 bg-muted"
                              />
                              <div className="flex justify-between text-[10px] text-muted-foreground">
                                <span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
                              </div>
                              {procedurePct && (d as any).procedureRevenue > 0 && (
                                <div className="flex items-center justify-between pt-1 border-t border-border/50">
                                  <span className="text-xs text-muted-foreground">
                                    {procedurePct}% of {fmt((d as any).procedureRevenue || 0)}
                                  </span>
                                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                    {fmt(Math.round(((d as any).procedureRevenue || 0) * Number(procedurePct) / 100))}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Total payout summary */}
                            {(mixedFixed || consultPct || procedurePct) && (
                              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-2">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                                  Estimated Payout Breakdown
                                </p>
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-muted-foreground">Base salary</span>
                                  <span className="font-medium text-foreground">{fmt(Number(mixedFixed) || 0)}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-muted-foreground">Consultation ({consultPct || 0}%)</span>
                                  <span className="font-medium text-violet-600 dark:text-violet-400">
                                    {fmt(Math.round(((d as any).consultRevenue || 0) * Number(consultPct || 0) / 100))}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-muted-foreground">Procedures ({procedurePct || 0}%)</span>
                                  <span className="font-medium text-emerald-600 dark:text-emerald-400">
                                    {fmt(Math.round(((d as any).procedureRevenue || 0) * Number(procedurePct || 0) / 100))}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-sm border-t border-border pt-2 mt-1">
                                  <span className="font-semibold text-foreground">Total payout</span>
                                  <span className="font-bold text-primary">
                                    {fmt(
                                      (Number(mixedFixed) || 0) +
                                      Math.round(((d as any).consultRevenue || 0) * Number(consultPct || 0) / 100) +
                                      Math.round(((d as any).procedureRevenue || 0) * Number(procedurePct || 0) / 100)
                                    )}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {saveError && <p className="text-xs text-destructive">{saveError}</p>}
                        <Button className="w-full h-10 rounded-xl" disabled={saving} onClick={() => save(d.staffId || d.doctorId)}>
                          {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : "Save Salary Config"}
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))
        }
      </div>
    {/* Success Modal */}
    {success && (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <motion.div initial={{ opacity:0, scale:.95 }} animate={{ opacity:1, scale:1 }}
          className="bg-card border border-border rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4 text-center">
          <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto">
            <Check className="w-7 h-7 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-lg">Staff Added!</h3>
            <p className="text-sm text-muted-foreground mt-1">{success}</p>
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1 h-11 rounded-xl" onClick={() => { setSuccess(""); setSubView("list"); }}>
              Done
            </Button>
            <Button className="flex-1 h-11 rounded-xl" onClick={() => { setSuccess(""); }}>
              Add Another
            </Button>
          </div>
        </motion.div>
      </div>
    )}
    </div>
  );
};

// ─── Transactions Tab (Tier 1 + filters in Tier 2) ────────────────────────────
const TransactionsTab = ({ tier }: { tier: number }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [filterDate,   setFilterDate]   = useState("");
  const [filterDoc,    setFilterDoc]    = useState("");
  const [doctors,      setDoctors]      = useState<{ doctorId: string; name: string }[]>([]);
  const [total,        setTotal]        = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { limit: 100 };
      if (tier >= 2 && filterDate) params.date     = filterDate;
      if (tier >= 2 && filterDoc)  params.doctorId = filterDoc;
      const r = await apiGetTransactions(params);
      setTransactions(r.payments || []);
      setTotal(r.total || 0);
    } catch {} finally { setLoading(false); }
  }, [filterDate, filterDoc, tier]);

  useEffect(() => {
    if (tier < 1) return;
    load();
    if (tier >= 2) apiGetDoctorRevStats().then(r => setDoctors(r.doctors || []));
  }, [tier]);

  if (tier < 1) return <LockedFeature label="Transaction History" minTier={1} />;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Transactions</h2>
          <p className="text-sm text-muted-foreground">{total} total payments</p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5 rounded-xl" onClick={load}>
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </Button>
      </div>

      {/* Filters — only shown in Tier 2 */}
      {tier >= 2 && (
        <div className="bg-card border border-border rounded-xl p-4 flex gap-3 flex-wrap items-end">
          <div className="flex items-center gap-1.5 w-full mb-1">
            <Filter className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Filters</span>
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="text-xs text-muted-foreground mb-1 block">Date</label>
            <Input type="date" value={filterDate}
              onChange={e => setFilterDate(e.target.value)}
              className="h-9 rounded-xl text-sm" />
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="text-xs text-muted-foreground mb-1 block">Doctor</label>
            <div className="relative">
              <select value={filterDoc} onChange={e => setFilterDoc(e.target.value)}
                className="w-full h-9 rounded-xl border border-border bg-background text-foreground px-3 pr-8 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">All Doctors</option>
                {doctors.map(d => <option key={d.doctorId} value={d.doctorId}>Dr. {d.name}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            </div>
          </div>
          <Button size="sm" onClick={load} className="h-9 rounded-xl gap-1.5 shrink-0">
            <ArrowUpDown className="w-3.5 h-3.5" /> Apply
          </Button>
          {(filterDate || filterDoc) && (
            <Button size="sm" variant="ghost"
              onClick={() => { setFilterDate(""); setFilterDoc(""); }}
              className="h-9 rounded-xl text-muted-foreground">
              Clear
            </Button>
          )}
        </div>
      )}

      <div className="bg-card border border-border rounded-2xl divide-y divide-border overflow-hidden">
        {loading ? (
          <div className="h-32 m-4 bg-muted animate-pulse rounded-xl" />
        ) : transactions.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No transactions found</div>
        ) : (
          transactions.map(tx => {
            const Icon = METHOD_ICON[tx.method] ?? Wallet;
            return (
              <div key={tx._id} className="flex items-center gap-3 px-5 py-3.5">
                <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                  <Icon className={`w-4 h-4 ${METHOD_COLOR[tx.method] ?? "text-muted-foreground"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{tx.patient?.name ?? "Unknown"}</p>
                  <p className="text-xs text-muted-foreground">
                    {TYPE_LABEL[tx.type] ?? tx.type}
                    {tx.doctor ? ` · Dr. ${tx.doctor.name}` : ""}
                    {` · ${tx.collectedBy?.name ?? ""}`}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-foreground">{fmt(tx.amount)}</p>
                  <p className="text-xs text-muted-foreground capitalize">{tx.method} · {tx.date}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

// ─── Weekly Chart sub-component ─────────────────────────────────────────────
interface WeeklyChartProps { data: any[]; maxRev: number; }
const WeeklyChart = ({ data, maxRev }: WeeklyChartProps) => {
  if (data.length < 2) return null;
  const W=560, H=200, pL=50, pR=16, pT=16, pB=40;
  const pw=W-pL-pR, ph=H-pT-pB, n=data.length;
  const ptX = (i: number) => pL + (i / (n - 1)) * pw;
  const ptY = (v: number) => pT + ph - (v / maxRev) * ph;
  let linePath = `M ${ptX(0)} ${ptY(data[0].revenue)}`;
  for (let i = 1; i < n; i++) {
    const cx = (ptX(i-1) + ptX(i)) / 2;
    linePath += ` C ${cx} ${ptY(data[i-1].revenue)} ${cx} ${ptY(data[i].revenue)} ${ptX(i)} ${ptY(data[i].revenue)}`;
  }
  const areaPath = `${linePath} L ${ptX(n-1)} ${pT+ph} L ${ptX(0)} ${pT+ph} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 200 }} overflow="visible">
      <defs>
        <linearGradient id="wkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#f59e0b" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.01" />
        </linearGradient>
      </defs>
      {[0, 0.25, 0.5, 0.75, 1].map((f, i) => (
        <g key={i}>
          <line x1={pL} y1={ptY(maxRev*f)} x2={W-pR} y2={ptY(maxRev*f)}
            stroke="#e2e8f0" strokeWidth="0.8" strokeDasharray={i === 0 ? "none" : "4,4"} />
          <text x={pL-6} y={ptY(maxRev*f)+4} textAnchor="end" fontSize="9" fill="#94a3b8">
            {maxRev*f >= 100000 ? `₹${((maxRev*f)/100000).toFixed(1)}L`
              : maxRev*f >= 1000 ? `₹${((maxRev*f)/1000).toFixed(0)}K`
              : `₹${Math.round(maxRev*f)}`}
          </text>
        </g>
      ))}
      <path d={areaPath} fill="url(#wkGrad)" />
      <path d={linePath} fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
      {data.map((w: any, i: number) => (
        <g key={i}>
          <circle cx={ptX(i)} cy={ptY(w.revenue)} r="4" fill="white" stroke="#f59e0b" strokeWidth="2" />
          <text x={ptX(i)} y={H-10} textAnchor="middle" fontSize="9" fill="#94a3b8">{w.label}</text>
          {w.growth !== 0 && (
            <text x={ptX(i)} y={ptY(w.revenue)-8} textAnchor="middle" fontSize="8"
              fill={w.growth >= 0 ? "#10b981" : "#ef4444"} fontWeight="600">
              {w.growth >= 0 ? "+" : ""}{w.growth}%
            </text>
          )}
        </g>
      ))}
    </svg>
  );
};

// ─── Peak Hours Chart sub-component ──────────────────────────────────────────
interface PeakChartProps { hours: any[]; maxCount: number; peakHour: any; peakByCount: any; }
const PeakChart = ({ hours, maxCount, peakHour, peakByCount }: PeakChartProps) => {
  const [hovered, setHovered] = useState<number | null>(null);

  const W=560, H=220, pL=44, pR=12, pT=16, pB=44;
  const plotW=W-pL-pR, plotH=H-pT-pB;
  const n = hours.length;

  if (n < 2) return null;

  const ptX = (i: number) => pL + (i / (n - 1)) * plotW;
  const ptY = (v: number) => pT + plotH - (maxCount > 0 ? (v / maxCount) * plotH : 0);

  // Smooth cubic bezier path
  let linePath = `M ${ptX(0)} ${ptY(hours[0].count)}`;
  for (let i = 1; i < n; i++) {
    const cx = (ptX(i-1) + ptX(i)) / 2;
    linePath += ` C ${cx} ${ptY(hours[i-1].count)} ${cx} ${ptY(hours[i].count)} ${ptX(i)} ${ptY(hours[i].count)}`;
  }
  const areaPath = `${linePath} L ${ptX(n-1)} ${pT+plotH} L ${ptX(0)} ${pT+plotH} Z`;

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(f => ({
    val: Math.round(maxCount * f),
    y:   ptY(maxCount * f),
  }));

  // Time-of-day background bands
  const bands = [
    { start:0,  end:6,  color:"#1e293b", opacity:0.05, label:"Night"     },
    { start:6,  end:12, color:"#fbbf24", opacity:0.04, label:"Morning"   },
    { start:12, end:17, color:"#3b82f6", opacity:0.04, label:"Afternoon" },
    { start:17, end:21, color:"#f97316", opacity:0.05, label:"Evening"   },
    { start:21, end:24, color:"#1e293b", opacity:0.05, label:"Night"     },
  ];

  // Hour labels every 3 hrs
  const showLabels = hours.filter((h: any) => h.hour % 3 === 0);

  const hovH = hovered !== null ? hours[hovered] : null;
  const hovX = hovered !== null ? ptX(hovered) : null;
  const hovY = hovered !== null ? ptY(hours[hovered].count) : null;
  const tipX = (x: number) => Math.min(Math.max(x - 30, pL), W - pR - 64);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 260 }} overflow="visible">
      <defs>
        <linearGradient id="peakGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#3b82f6" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.01" />
        </linearGradient>
      </defs>

      {/* Day/night background bands */}
      {bands.map((b, i) => (
        <rect key={i}
          x={pL + (b.start / 24) * plotW}
          y={pT}
          width={(b.end - b.start) / 24 * plotW}
          height={plotH}
          fill={b.color}
          opacity={b.opacity}
        />
      ))}

      {/* Y gridlines + labels */}
      {yTicks.map((t, i) => (
        <g key={i}>
          <line x1={pL} y1={t.y} x2={W-pR} y2={t.y}
            stroke="#e2e8f0" strokeWidth="0.8" strokeDasharray={i === 0 ? "none" : "3,3"} />
          <text x={pL-5} y={t.y+4} textAnchor="end" fontSize="9" fill="#94a3b8" fontFamily="system-ui">
            {t.val}
          </text>
        </g>
      ))}

      {/* Y axis label */}
      <text x={10} y={pT+plotH/2} textAnchor="middle" fontSize="9" fill="#94a3b8" fontFamily="system-ui"
        transform={`rotate(-90,10,${pT+plotH/2})`}>Patients</text>

      {/* X axis */}
      <line x1={pL} y1={pT+plotH} x2={W-pR} y2={pT+plotH} stroke="#e2e8f0" strokeWidth="1" />

      {/* Hover vertical guide */}
      {hovX !== null && (
        <line x1={hovX} y1={pT} x2={hovX} y2={pT+plotH}
          stroke="#3b82f6" strokeWidth="1" strokeDasharray="4,3" opacity="0.4" />
      )}

      {/* Area fill */}
      <path d={areaPath} fill="url(#peakGrad)" />

      {/* Line */}
      <path d={linePath} fill="none" stroke="#3b82f6" strokeWidth="2.5"
        strokeLinecap="round" strokeLinejoin="round" />

      {/* Peak dot highlight */}
      {peakByCount && hours[peakByCount.hour] && (
        <circle cx={ptX(peakByCount.hour)} cy={ptY(peakByCount.count)} r="5"
          fill="#3b82f6" opacity="0.25" />
      )}

      {/* Hover dots + hit areas */}
      {hours.map((h: any, i: number) => (
        <g key={h.hour}
          onMouseEnter={() => setHovered(i)}
          onMouseLeave={() => setHovered(null)}
          style={{ cursor: "crosshair" }}>
          <rect x={ptX(i) - plotW/n/2} y={pT} width={plotW/n} height={plotH} fill="transparent" />
          {(hovered === i || h.hour === peakByCount?.hour) && h.count > 0 && (
            <g>
              <circle cx={ptX(i)} cy={ptY(h.count)} r="5" fill="#3b82f6" opacity="0.15" />
              <circle cx={ptX(i)} cy={ptY(h.count)} r="3.5"
                fill="white" stroke="#3b82f6" strokeWidth="2" />
            </g>
          )}
        </g>
      ))}

      {/* X-axis hour labels */}
      {showLabels.map((h: any) => (
        <text key={h.hour} x={ptX(h.hour)} y={H-28}
          textAnchor="middle" fontSize="9"
          fill={hovered !== null && hours[hovered].hour === h.hour ? "#3b82f6" : "#94a3b8"}
          fontFamily="system-ui">
          {h.label}
        </text>
      ))}

      {/* Period labels */}
      {bands.map((b, i) => (
        <text key={i} x={pL + ((b.start + b.end) / 2 / 24) * plotW} y={H-12}
          textAnchor="middle" fontSize="8" fill="#94a3b8" fontFamily="system-ui">
          {b.label}
        </text>
      ))}

      {/* Tooltip */}
      {hovered !== null && hovX !== null && hovY !== null && hovH !== null && hovH.count > 0 && (
        <g>
          <rect x={tipX(hovX)} y={hovY - 36} width={64} height={28} rx="5" fill="#1e293b" opacity="0.92" />
          <text x={tipX(hovX)+32} y={hovY-22} textAnchor="middle" fontSize="11"
            fill="white" fontFamily="system-ui" fontWeight="700">
            {hovH.count} pts
          </text>
          <text x={tipX(hovX)+32} y={hovY-10} textAnchor="middle" fontSize="9"
            fill="#94a3b8" fontFamily="system-ui">
            {hovH.label}
          </text>
        </g>
      )}
    </svg>
  );
};

// ─── Tier 3 Enterprise Tab ───────────────────────────────────────────────────
const Tier3Tab = ({ tier }: { tier: number }) => {
  const [weeklyData,  setWeeklyData]  = useState<any[]>([]);
  const [peakHours,   setPeakHours]   = useState<any[]>([]);
  const [peakHour,    setPeakHour]    = useState<any>(null);
  const [peakByCount, setPeakByCount] = useState<any>(null);
  const [peakPeriod,  setPeakPeriod]  = useState<"day"|"week"|"month"|"year">("month");
  const [peakDate,    setPeakDate]    = useState("");
  const [peakLoading, setPeakLoading] = useState(false);
  const [deptGrowth,  setDeptGrowth]  = useState<any[]>([]);
  const [topDept,     setTopDept]     = useState<any>(null);
  const [pending,     setPending]     = useState<any[]>([]);
  const [alerts,      setAlerts]      = useState<any[]>([]);
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    if (tier < 3) return;
    setLoading(true);
    Promise.all([
      apiGetWeeklyTrend().then(r  => setWeeklyData(r.weeks || [])),
      apiGetPeakHours("month").then(r => {
        setPeakHours(r.hours || []);
        setPeakHour(r.peakHour || null);
        setPeakByCount(r.peakByCount || null);
      }),
      apiGetDeptGrowth().then(r  => { setDeptGrowth(r.departments || []); setTopDept(r.topDepartment || null); }),
      apiGetPending().then(r     => setPending(r.unpaid || [])),
      apiGetAlerts().then(r      => setAlerts(r.alerts || [])),
    ]).catch(() => {}).finally(() => setLoading(false));
  }, [tier]);

  const loadPeakHours = useCallback(async (period: "day"|"week"|"month"|"year", date?: string) => {
    setPeakLoading(true);
    try {
      const r = await apiGetPeakHours(period, date);
      setPeakHours(r.hours || []);
      setPeakHour(r.peakHour || null);
      setPeakByCount(r.peakByCount || null);
    } catch {}
    finally { setPeakLoading(false); }
  }, []);

  if (tier < 3) return <LockedFeature label="Enterprise Features" minTier={3} />;

  const maxWeekRev   = Math.max(...weeklyData.map((w: any) => w.revenue), 1);
  const maxHourCount = Math.max(...peakHours.map((h: any) => h.count), 1);

  const alertColors: Record<string, string> = {
    danger:  "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400",
    warning: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400",
    info:    "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400",
  };
  const alertIcons: Record<string, React.ElementType> = {
    danger: X, warning: AlertCircle, info: Bell,
  };

  const fmtShortLocal = (n: number) =>
    n >= 100000 ? `₹${(n/100000).toFixed(1)}L` : n >= 1000 ? `₹${(n/1000).toFixed(1)}K` : fmt(n);

  const exportCSV = () => {
    const headers = ["Week","Revenue","Patients","Growth%"];
    const rows    = weeklyData.map((w: any) => [w.label, w.revenue, w.patients, w.growth].join(","));
    const csv     = [headers.join(","), ...rows].join("\n");
    const blob    = new Blob([csv], { type: "text/csv" });
    const url     = URL.createObjectURL(blob);
    const a       = document.createElement("a");
    a.href = url; a.download = `cliniq_weekly_${new Date().toISOString().split("T")[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const exportTransactionCSV = async () => {
    try {
      const r   = await apiGetTransactions({ limit: 1000 });
      const txs = r.payments || [];
      const headers = ["Date","Patient","Doctor","Amount","Method","Type"];
      const rows    = txs.map((t: any) =>
        [t.date, t.patient?.name||"", t.doctor?.name||"", t.amount, t.method, t.type]
          .map((v: any) => `"${v}"`).join(",")
      );
      const csv  = [headers.join(","), ...rows].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url; a.download = `cliniq_transactions_${new Date().toISOString().split("T")[0]}.csv`;
      a.click(); URL.revokeObjectURL(url);
    } catch {}
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Enterprise Intelligence</h2>
        <p className="text-sm text-muted-foreground">Tier 3 — Advanced analytics, alerts &amp; reports</p>
      </div>

      {/* Smart Alerts */}
      {!loading && alerts.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Bell className="w-4 h-4 text-amber-500" /> Smart Alerts
          </h3>
          {alerts.map((a: any, i: number) => {
            const Icon = alertIcons[a.type] ?? Bell;
            return (
              <motion.div key={i} initial={{ opacity:0, x:-8 }} animate={{ opacity:1, x:0 }}
                transition={{ delay: i*0.06 }}
                className={`flex items-start gap-3 border rounded-xl px-4 py-3 ${alertColors[a.type] ?? alertColors.info}`}>
                <Icon className="w-4 h-4 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold">{a.title}</p>
                  <p className="text-xs mt-0.5 opacity-80">{a.message}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Top Performing Department */}
      {!loading && topDept && (
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-4 h-4 text-amber-500" />
            <h3 className="font-semibold text-foreground">Top Performing Department</h3>
          </div>
          <div className="flex items-center justify-between bg-amber-500/10 border border-amber-500/20 rounded-xl px-5 py-4">
            <div>
              <p className="text-xl font-bold text-foreground">{topDept.department}</p>
              <p className="text-xs text-muted-foreground mt-0.5">This month's highest revenue department</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{fmt(topDept.current)}</p>
              <p className={`text-xs font-medium mt-0.5 ${topDept.growth >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>
                {topDept.growth >= 0 ? "▲" : "▼"} {Math.abs(topDept.growth)}% vs last month
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Weekly Trend */}
      {!loading && weeklyData.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-foreground">Weekly Revenue Trend</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Last 8 weeks with week-over-week growth</p>
            </div>
          </div>
          <WeeklyChart data={weeklyData} maxRev={maxWeekRev} />
        </div>
      )}

      {/* Department Growth */}
      {!loading && deptGrowth.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="font-semibold text-foreground mb-1">Department Growth vs Last Month</h3>
          <p className="text-xs text-muted-foreground mb-4">Contribution % and growth/decline tracking</p>
          <div className="space-y-3">
            {deptGrowth.map((d: any) => {
              const totalRev = deptGrowth.reduce((s: number, x: any) => s + x.current, 0);
              const contrib  = totalRev > 0 ? Math.round((d.current / totalRev) * 100) : 0;
              const growing  = d.growth >= 0;
              return (
                <div key={d.department} className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-foreground truncate">{d.department}</span>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`text-xs font-semibold ${growing ? "text-emerald-500" : "text-red-500"}`}>
                          {growing ? "▲" : "▼"} {Math.abs(d.growth)}%
                        </span>
                        <span className="text-xs text-muted-foreground w-8 text-right">{contrib}%</span>
                        <span className="text-sm font-bold text-foreground w-20 text-right">{fmt(d.current)}</span>
                      </div>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <motion.div initial={{ width:0 }} animate={{ width:`${contrib}%` }} transition={{ duration:0.5 }}
                        className={`h-full rounded-full ${growing ? "bg-emerald-500" : "bg-red-400"}`} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Peak Hours */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
          <div>
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <ClockIcon className="w-4 h-4 text-primary" /> Peak Hour Insights
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              {peakByCount
                ? `Busiest: ${peakByCount.label} (${peakByCount.count} patients) · Peak revenue: ${peakHour?.label} (${fmt(peakHour?.revenue ?? 0)})`
                : "24-hour activity breakdown"}
            </p>
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            <div className="flex gap-1 bg-muted rounded-xl p-1">
              {(["day","week","month","year"] as const).map(p => (
                <button key={p} onClick={() => {
                  setPeakPeriod(p);
                  if (p !== "day") loadPeakHours(p);
                  else loadPeakHours("day", peakDate || new Date().toISOString().split("T")[0]);
                }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${
                    peakPeriod === p ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}>{p}</button>
              ))}
            </div>
            {peakPeriod === "day" && (
              <input type="date"
                value={peakDate || new Date().toISOString().split("T")[0]}
                max={new Date().toISOString().split("T")[0]}
                onChange={e => { setPeakDate(e.target.value); loadPeakHours("day", e.target.value); }}
                className="h-8 px-3 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring w-full"
              />
            )}
          </div>
        </div>

        {peakLoading ? (
          <div className="h-56 bg-muted animate-pulse rounded-xl" />
        ) : (
          <PeakChart hours={peakHours} maxCount={maxHourCount} peakHour={peakHour} peakByCount={peakByCount} />
        )}

        {/* Legend */}
        <div className="flex items-center gap-4 mt-3 flex-wrap">
          {[
            { color:"#3b82f6", label:`Peak patients: ${peakByCount?.label ?? "—"} (${peakByCount?.count ?? 0})` },
            { color:"#8b5cf6", label:`Peak revenue: ${peakHour?.label ?? "—"} (${fmt(peakHour?.revenue ?? 0)})` },
            { color:"#10b981", label:"Morning (6–12)" },
            { color:"#f59e0b", label:"Evening (5–9pm)" },
          ].map((l, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm shrink-0" style={{ background: l.color }} />
              <span className="text-[10px] text-muted-foreground">{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Outstanding Payments */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-foreground">Outstanding Payments Today</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Patients seen with no payment recorded</p>
          </div>
          {!loading && (
            <Badge variant={pending.length > 0 ? "destructive" : "secondary"} className="text-xs">
              {pending.length} pending
            </Badge>
          )}
        </div>
        {loading ? (
          <div className="h-16 m-4 bg-muted animate-pulse rounded-xl" />
        ) : pending.length === 0 ? (
          <div className="px-5 py-6 flex items-center gap-3 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
            <p className="text-sm font-medium">All payments collected today</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {pending.map((p: any, i: number) => (
              <div key={i} className="flex items-center gap-3 px-5 py-3">
                <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0 text-sm font-bold text-red-500">
                  {p.queueNumber}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{p.patient?.name ?? "Unknown"}</p>
                  <p className="text-xs text-muted-foreground">{p.patient?.phone ?? ""}</p>
                </div>
                <Badge variant="outline" className="text-xs text-amber-500 border-amber-500/30 shrink-0">Unpaid</Badge>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Export */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <h3 className="font-semibold text-foreground mb-1 flex items-center gap-2">
          <Download className="w-4 h-4 text-primary" /> Export &amp; Reports
        </h3>
        <p className="text-xs text-muted-foreground mb-4">Download clinic data as CSV</p>
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" onClick={exportCSV} className="gap-2 rounded-xl h-11">
            <Download className="w-4 h-4" /> Weekly Report CSV
          </Button>
          <Button variant="outline" onClick={exportTransactionCSV} className="gap-2 rounded-xl h-11">
            <Download className="w-4 h-4" /> Transactions CSV
          </Button>
        </div>
      </div>
    </div>
  );
};

// ─── Settings Tab ─────────────────────────────────────────────────────────────
const SettingsTab = ({ tier, onTierChange }: { tier: number; onTierChange: (t: number) => void }) => {
  const [saving,    setSaving]    = useState<number | null>(null);
  const [saveError, setSaveError] = useState("");

  const TIERS = [
    {
      level: 1 as const, label:"Tier 1", badge:"Basic",
      color:"text-emerald-500", border:"border-emerald-500", bg:"bg-emerald-500/10",
      features:[
        "Revenue Dashboard", "Patient Count Today",
        "Salary Management", "Transaction History", "Staff Management",
      ],
    },
    {
      level: 2 as const, label:"Tier 2", badge:"Pro",
      color:"text-blue-500", border:"border-blue-500", bg:"bg-blue-500/10",
      features:[
        "Everything in Tier 1",
        "Daily Revenue Graph (7/14/30 days)",
        "Revenue by Department",
        "Revenue by Doctor",
        "Payment Breakdown (Cash/UPI/Card)",
        "Doctor Earnings Calculation",
        "Filtered Transactions (by date & doctor)",
      ],
    },
    {
      level: 3 as const, label:"Tier 3", badge:"Enterprise",
      color:"text-violet-500", border:"border-violet-500", bg:"bg-violet-500/10",
      features:[
        "Everything in Tier 2",
        "Weekly & Monthly Revenue Trends",
        "Peak Hour Insights",
        "Top Performing Department Highlight",
        "Department Growth / Decline Tracking",
        "Outstanding Payments Tracking",
        "Advanced Salary — Mixed Model (Base + % per type)",
        "Different % for Consultation vs Procedures",
        "Export Reports as CSV",
        "Smart Alerts (Revenue drop, Pending payments, Doctor overload)",
      ],
    },
  ];

  const handleEnable = async (level: 1 | 2 | 3) => {
    setSaveError(""); setSaving(level);
    try {
      await apiSetTier(level);
      onTierChange(level);
    } catch (e: any) {
      setSaveError(e.message || "Failed to enable tier. Please try again.");
    } finally { setSaving(null); }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Tier Settings</h2>
        <p className="text-sm text-muted-foreground">
          Currently active:&nbsp;
          <span className="font-medium text-foreground">
            {tier > 0 ? `Tier ${tier}` : "No tier enabled"}
          </span>
        </p>
      </div>

      {saveError && (
        <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
          <p className="text-sm text-destructive">{saveError}</p>
        </div>
      )}

      <div className="space-y-4">
        {TIERS.map(t => {
          const isActive = tier === t.level;
          return (
            <div key={t.level}
              className={`bg-card rounded-2xl p-5 border-2 transition-all ${isActive ? `${t.border} ${t.bg}` : "border-border"}`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <Star className={`w-4 h-4 ${isActive ? t.color : "text-muted-foreground"}`} />
                  <span className="font-semibold text-foreground">{t.label}</span>
                  <Badge variant="secondary" className="text-xs">{t.badge}</Badge>
                  {isActive && <Badge className="text-xs bg-emerald-500 hover:bg-emerald-500 text-white">Active</Badge>}
                </div>
                {!isActive && (
                  <Button size="sm" variant="outline"
                    className="rounded-xl text-xs h-8 min-w-[80px] shrink-0"
                    disabled={saving !== null}
                    onClick={() => handleEnable(t.level)}>
                    {saving === t.level ? <RefreshCw className="w-3 h-3 animate-spin" /> : "Enable"}
                  </Button>
                )}
              </div>
              <ul className="space-y-1.5">
                {t.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${isActive ? t.color : "text-muted-foreground/40"}`} />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <div className="bg-card border border-border rounded-2xl p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <div className="text-sm text-muted-foreground">
          <p className="font-medium text-foreground mb-0.5">Billing handled separately</p>
          <p>Tier pricing is managed directly between your clinic and the ClinIQ team. Enabling a tier here does not automatically charge your clinic.</p>
        </div>
      </div>
    </div>
  );
};

// ─── Overview Tab ─────────────────────────────────────────────────────────────
const OverviewTab = ({ setTab, tier }: { setTab: (t: Tab) => void; tier: number }) => {
  const coreCards = [
    { icon:Pill,        label:"Medicines",    desc:"Add & view medicines",       tab:"medicines"     as Tab, color:"text-blue-500",    bg:"bg-blue-500/10"    },
    { icon:Users,       label:"Staff",          desc:"Add & manage all staff members", tab:"staff" as Tab, color:"text-blue-500", bg:"bg-blue-500/10" },
  ];

  const tier1Cards = [
    { icon:IndianRupee, label:"Revenue",      desc:"View earnings & stats",    tab:"revenue"      as Tab, color:"text-amber-500",  bg:"bg-amber-500/10"  },
    { icon:Wallet,      label:"Salary",       desc:"Configure doctor pay",     tab:"salary"       as Tab, color:"text-rose-500",   bg:"bg-rose-500/10"   },
    { icon:BarChart3,   label:"Transactions", desc:"View payment history",     tab:"transactions" as Tab, color:"text-cyan-500",   bg:"bg-cyan-500/10"   },
  ];

  const tier2Cards = [
    { icon:PieChart,   label:"Analytics",  desc:"Revenue graphs, department breakdown & doctor performance", tab:"analytics"  as Tab, color:"text-indigo-500", bg:"bg-indigo-500/10" },
  ];

  const tier3Cards = [
    { icon:Building2,  label:"Enterprise", desc:"Smart alerts, weekly trends, peak hours & exports",         tab:"enterprise" as Tab, color:"text-violet-500", bg:"bg-violet-500/10" },
  ];

  const CardBtn = ({ card }: { card: typeof coreCards[0] }) => (
    <motion.button onClick={() => setTab(card.tab)} whileTap={{ scale: 0.98 }}
      className="w-full flex items-center gap-5 p-5 rounded-2xl border border-border bg-card hover:border-primary/30 hover:bg-primary/5 transition-all text-left group">
      <div className={`w-12 h-12 rounded-2xl ${card.bg} flex items-center justify-center shrink-0`}>
        <card.icon className={`w-6 h-6 ${card.color}`} />
      </div>
      <div className="flex-1">
        <p className="font-semibold text-foreground">{card.label}</p>
        <p className="text-sm text-muted-foreground">{card.desc}</p>
      </div>
      <Plus className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
    </motion.button>
  );

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-xl font-bold text-foreground mb-1">Admin Controls</h2>
      <p className="text-sm text-muted-foreground mb-6">Manage your clinic</p>

      <div className="space-y-3 mb-6">
        {coreCards.map(card => <CardBtn key={card.tab} card={card} />)}
      </div>

      {tier >= 1 && (
        <>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Tier 1 Features</p>
          <div className="space-y-3 mb-6">
            {tier1Cards.map(card => <CardBtn key={card.tab} card={card} />)}
          </div>
        </>
      )}

      {tier >= 2 && (
        <>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Tier 2 Features</p>
          <div className="space-y-3 mb-6">
            {tier2Cards.map(card => <CardBtn key={card.tab} card={card} />)}
          </div>
        </>
      )}

      {tier >= 3 && (
        <>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Tier 3 Features</p>
          <div className="space-y-3 mb-6">
            {tier3Cards.map(card => <CardBtn key={card.tab} card={card} />)}
          </div>
        </>
      )}

      {tier === 0 && (
        <div className="mt-4 border border-dashed border-border rounded-2xl p-5 text-center">
          <Lock className="w-6 h-6 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm font-medium text-foreground mb-0.5">Tier 1 features available</p>
          <p className="text-xs text-muted-foreground mb-3">Enable a tier to unlock revenue tracking, salary management, and more.</p>
          <Button size="sm" variant="outline" className="rounded-xl" onClick={() => setTab("settings")}>
            Go to Settings
          </Button>
        </div>
      )}
    </div>
  );
};

// ─── Admin Avatar Dropdown ────────────────────────────────────────────────────
const AdminAvatarDropdown = ({
  adminName, tier, onChangePassword, onSettings, onLogout,
}: {
  adminName:        string;
  tier:             number;
  onChangePassword: () => void;
  onSettings:       () => void;
  onLogout:         () => void;
}) => {
  const [open, setOpen] = useState(false);

  const menuItems = [
    {
      icon:  User,
      label: "Account Info",
      sub:   `${adminName} · Administrator`,
      onClick: () => {},
      dividerAfter: false,
    },
    {
      icon:  KeyRound,
      label: "Change Password",
      sub:   "Update your admin password",
      onClick: onChangePassword,
      dividerAfter: false,
    },
    {
      icon:  Shield,
      label: "Tier Settings",
      sub:   tier > 0 ? `Tier ${tier} currently active` : "No tier enabled",
      onClick: onSettings,
      dividerAfter: false,
    },
    {
      icon:  Activity,
      label: "Overview",
      sub:   "Go to admin overview page",
      onClick: () => {},
      dividerAfter: true,
    },
    {
      icon:    LogOut,
      label:   "Logout",
      sub:     "Sign out of your account",
      onClick: onLogout,
      danger:  true,
      dividerAfter: false,
    },
  ];

  return (
    <div className="relative shrink-0">
      {/* Avatar button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-10 h-10 rounded-full overflow-hidden border-2 border-border hover:border-primary/60 transition-all focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <circle cx="20" cy="20" r="20" fill="#2563eb" />
          <circle cx="20" cy="15" r="7.5" fill="#1d4ed8" />
          <ellipse cx="20" cy="36" rx="14" ry="11" fill="#1d4ed8" />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -6 }}
              animate={{ opacity: 1, scale: 1,    y: 0   }}
              exit={{    opacity: 0, scale: 0.95, y: -6  }}
              transition={{ duration: 0.15 }}
              className="absolute left-0 top-12 z-50 w-72 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
            >
              {/* Profile header */}
              <div className="flex items-center gap-3 px-4 py-4 bg-muted/40 border-b border-border">
                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-border shrink-0">
                  <svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                    <circle cx="20" cy="20" r="20" fill="#2563eb" />
                    <circle cx="20" cy="15" r="7.5" fill="#1d4ed8" />
                    <ellipse cx="20" cy="36" rx="14" ry="11" fill="#1d4ed8" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-foreground truncate">{adminName}</p>
                  <p className="text-xs text-muted-foreground">Administrator · ClinIQ</p>
                  <div className="mt-1">
                    {tier > 0
                      ? <Badge variant="secondary" className="text-[10px] h-4 px-1.5">Tier {tier} Active</Badge>
                      : <Badge variant="outline" className="text-[10px] h-4 px-1.5 text-muted-foreground">No Tier</Badge>
                    }
                  </div>
                </div>
              </div>

              {/* Menu items */}
              <div className="py-1">
                {menuItems.map((item, i) => (
                  <div key={i}>
                    <button
                      onClick={() => { item.onClick(); setOpen(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 transition-colors text-left group ${
                        (item as any).danger
                          ? "hover:bg-destructive/10"
                          : "hover:bg-muted"
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                        (item as any).danger
                          ? "bg-destructive/10 group-hover:bg-destructive/20"
                          : "bg-muted group-hover:bg-background"
                      }`}>
                        <item.icon className={`w-4 h-4 ${
                          (item as any).danger ? "text-destructive" : "text-muted-foreground"
                        }`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-medium ${
                          (item as any).danger ? "text-destructive" : "text-foreground"
                        }`}>{item.label}</p>
                        <p className="text-xs text-muted-foreground truncate">{item.sub}</p>
                      </div>
                    </button>
                    {item.dividerAfter && <div className="h-px bg-border mx-3 my-1" />}
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="px-4 py-2.5 border-t border-border bg-muted/20">
                <p className="text-[10px] text-muted-foreground text-center">ClinIQ · Admin Panel · v1.0</p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const AdminDashboard = () => {
  const navigate = useNavigate();
  const [activeTab,     setActiveTab]     = useState<Tab>("overview");
  const [tier,          setTier]          = useState(0);
  const [showChangePwd, setShowChangePwd] = useState(false);

  const storedUser = localStorage.getItem("cliniq_user");
  const adminName  = storedUser ? JSON.parse(storedUser).name : "Admin";

  useEffect(() => {
    apiGetTier().then(r => setTier(r.tier ?? 0)).catch(() => {});
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("cliniq_token");
    localStorage.removeItem("cliniq_user");
    navigate("/login");
  };

  const tabs = [
    { key: "overview"      as Tab, label:"Overview",      icon: Activity    },
    { key: "staff"         as Tab, label:"Staff",          icon: Users       },
    { key: "revenue"       as Tab, label:"Revenue",       icon: IndianRupee },
    ...(tier >= 2 ? [{ key: "analytics"  as Tab, label: "Analytics",  icon: PieChart   }] : []),
    ...(tier >= 3 ? [{ key: "enterprise" as Tab, label: "Enterprise", icon: Building2  }] : []),
    { key: "salary"        as Tab, label:"Salary",        icon: Wallet      },
    { key: "transactions"  as Tab, label:"Transactions",  icon: BarChart3   },
    { key: "settings"      as Tab, label:"Settings",      icon: Shield      },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card px-6 py-3 flex items-center gap-4">
        <AdminAvatarDropdown
          adminName={adminName}
          tier={tier}
          onChangePassword={() => setShowChangePwd(true)}
          onSettings={() => setActiveTab("settings")}
          onLogout={handleLogout}
        />
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-semibold text-foreground">{adminName}</h1>
            {tier > 0
              ? <Badge variant="secondary" className="text-xs">Tier {tier}</Badge>
              : <Badge variant="outline"   className="text-xs text-muted-foreground">No Tier</Badge>
            }
          </div>
          <p className="text-xs text-muted-foreground">Admin · ClinIQ</p>
        </div>
      </header>

      {/* Body: vertical sidebar + content */}
      <div className="flex h-[calc(100vh-57px)]">

        {/* Left sidebar tabs */}
        <aside className="w-52 border-r border-border bg-card flex flex-col py-3 shrink-0 overflow-y-auto">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all text-left rounded-none relative ${
                activeTab === t.key
                  ? "text-primary bg-primary/5"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}>
              {/* Active indicator bar */}
              {activeTab === t.key && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute left-0 top-1 bottom-1 w-0.5 bg-primary rounded-r-full"
                />
              )}
              <t.icon className={`w-4 h-4 shrink-0 ${activeTab === t.key ? "text-primary" : ""}`} />
              <span>{t.label}</span>
            </button>
          ))}
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-8">
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}>
              {activeTab === "overview"      && <OverviewTab      setTab={setActiveTab} tier={tier} />}
              {activeTab === "staff"         && <StaffTab />}
              {activeTab === "revenue"       && <RevenueTab       tier={tier} />}
              {activeTab === "analytics"     && <AnalyticsTab     tier={tier} />}
              {activeTab === "enterprise"    && <Tier3Tab         tier={tier} />}
              {activeTab === "salary"        && <SalaryTab        tier={tier} />}
              {activeTab === "transactions"  && <TransactionsTab  tier={tier} />}
              {activeTab === "settings"      && <SettingsTab      tier={tier} onTierChange={t => { setTier(t); setActiveTab("overview"); }} />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <ChangePasswordModal open={showChangePwd} onClose={() => setShowChangePwd(false)} />

      {/* Change Email Modal */}
      {showChangeEmail && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity:0, scale:.95 }} animate={{ opacity:1, scale:1 }}
            className="bg-card border border-border rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-foreground">Change Email</h2>
              <button onClick={() => { setShowChangeEmail(false); setEmailError(""); setEmailSuccess(""); setNewEmail(""); setEmailPassword(""); }}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted">
                <X className="w-4 h-4" />
              </button>
            </div>
            {emailSuccess ? (
              <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl p-4">
                <Check className="w-5 h-5 shrink-0" />
                <p className="text-sm font-medium">{emailSuccess}</p>
              </div>
            ) : (
              <>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">New Email Address</label>
                  <Input type="email" placeholder="new@email.com" value={newEmail} onChange={e => setNewEmail(e.target.value)} className="h-11 rounded-xl" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Current Password (to confirm)</label>
                  <Input type="password" placeholder="Enter your password" value={emailPassword} onChange={e => setEmailPassword(e.target.value)} className="h-11 rounded-xl" />
                </div>
                {emailError && <p className="text-sm text-destructive">{emailError}</p>}
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => { setShowChangeEmail(false); setEmailError(""); setNewEmail(""); setEmailPassword(""); }} className="flex-1 h-11 rounded-xl">Cancel</Button>
                  <Button disabled={emailSaving || !newEmail || !emailPassword} onClick={async () => {
                    setEmailError(""); setEmailSaving(true);
                    try {
                      const r = await apiChangeEmail(newEmail, emailPassword);
                      setEmailSuccess(r.message || "Email updated successfully!");
                      setTimeout(() => { setShowChangeEmail(false); setEmailSuccess(""); setNewEmail(""); setEmailPassword(""); }, 2500);
                    } catch (e: any) {
                      setEmailError(e.message || "Failed to update email");
                    } finally { setEmailSaving(false); }
                  }} className="flex-1 h-11 rounded-xl">
                    {emailSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Update Email"}
                  </Button>
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;