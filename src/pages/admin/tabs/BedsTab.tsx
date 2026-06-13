import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bed, User, RefreshCw, X, Stethoscope, Calendar, IndianRupee,
  Pill, FlaskConical, FileText, Clock, AlertCircle, Plus, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const BASE = (import.meta.env.VITE_API_URL as string) || "http://localhost:5000/api";
const tok  = () => localStorage.getItem("cliniq_token") || "";
const api  = async (path: string, opts: RequestInit = {}) => {
  const r = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok()}`, ...opts.headers },
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.message);
  return d;
};

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

type BedStatus = "available" | "occupied" | "maintenance" | "reserved";

interface BedEntry {
  _id: string; number: string; ward: string; type: string;
  status: BedStatus;
  patient?: {
    _id: string; name: string; age: number; gender: string; phone: string;
    doctor: string; diagnosis: string; admissionDate: string;
    expectedDischarge: string; totalBill: number; dueAmount: number;
    medicines: { name: string; dose: string; }[];
    investigations: string[];
    treatmentNotes: string;
  };
}

const BED_STATUS_STYLE: Record<BedStatus, { bg: string; border: string; dot: string; label: string }> = {
  available:   { bg: "bg-emerald-500/10", border: "border-emerald-500/30", dot: "bg-emerald-500", label: "Available"   },
  occupied:    { bg: "bg-primary/10",     border: "border-primary/30",     dot: "bg-primary",     label: "Occupied"    },
  maintenance: { bg: "bg-amber-500/10",   border: "border-amber-500/30",   dot: "bg-amber-500",   label: "Maintenance" },
  reserved:    { bg: "bg-violet-500/10",  border: "border-violet-500/30",  dot: "bg-violet-500",  label: "Reserved"    },
};

export const BedsTab = () => {
  const [beds,      setBeds]      = useState<BedEntry[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [selected,  setSelected]  = useState<BedEntry | null>(null);
  const [wardFilter,setWardFilter]= useState("all");
  const [editing,   setEditing]   = useState(false);
  const [noteText,  setNoteText]  = useState("");
  const [saving,    setSaving]    = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const d = await api("/beds");
      setBeds(d.beds || []);
    } catch { setBeds([]); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const wards = ["all", ...Array.from(new Set(beds.map(b => b.ward)))];

  const filtered = wardFilter === "all" ? beds : beds.filter(b => b.ward === wardFilter);

  const stats = {
    total:       beds.length,
    available:   beds.filter(b => b.status === "available").length,
    occupied:    beds.filter(b => b.status === "occupied").length,
    maintenance: beds.filter(b => b.status === "maintenance").length,
  };

  const handleStatusChange = async (bedId: string, status: BedStatus) => {
    try {
      await api(`/beds/${bedId}`, { method: "PATCH", body: JSON.stringify({ status }) });
      await load();
      if (selected?._id === bedId) setSelected(null);
    } catch (e: any) { alert(e.message); }
  };

  const handleSaveNote = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await api(`/beds/${selected._id}/note`, { method: "PATCH", body: JSON.stringify({ treatmentNotes: noteText }) });
      await load();
      setEditing(false);
    } catch (e: any) { alert(e.message); }
    setSaving(false);
  };

  const daysSince = (date: string) => {
    const d = Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
    return d === 0 ? "Today" : `${d} day${d !== 1 ? "s" : ""}`;
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-foreground">Beds &amp; Cabins</h2>
          <p className="text-sm text-muted-foreground">Live IPD bed management</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} className="gap-2 rounded-xl">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total Beds",   value: stats.total,       color: "text-foreground",     bg: "bg-muted"          },
          { label: "Available",    value: stats.available,   color: "text-emerald-500",    bg: "bg-emerald-500/10" },
          { label: "Occupied",     value: stats.occupied,    color: "text-primary",        bg: "bg-primary/10"     },
          { label: "Maintenance",  value: stats.maintenance, color: "text-amber-500",      bg: "bg-amber-500/10"   },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-xl p-4 text-center`}>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Ward filter */}
      <div className="flex gap-2 flex-wrap mb-5">
        {wards.map(w => (
          <button key={w} onClick={() => setWardFilter(w)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border-2 transition-all capitalize ${
              wardFilter === w ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-primary/40"
            }`}>{w === "all" ? "All Wards" : w}</button>
        ))}
      </div>

      {/* Bed grid */}
      {loading ? (
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
          {Array.from({ length: 24 }).map((_, i) => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Bed className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No beds found</p>
          <p className="text-sm">Beds are managed from the backend system</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {filtered.map(bed => {
            const style = BED_STATUS_STYLE[bed.status];
            const isSelected = selected?._id === bed._id;
            return (
              <motion.button key={bed._id} whileTap={{ scale: 0.97 }}
                onClick={() => { setSelected(bed); setNoteText(bed.patient?.treatmentNotes || ""); setEditing(false); }}
                className={`relative flex flex-col items-center justify-center p-3 rounded-2xl border-2 text-center transition-all cursor-pointer ${style.bg} ${style.border} ${
                  isSelected ? "ring-2 ring-primary ring-offset-1" : "hover:ring-2 hover:ring-primary/30"
                }`}
                style={{ minHeight: 96 }}>
                <div className={`w-2.5 h-2.5 rounded-full ${style.dot} mb-2`} />
                <Bed className="w-6 h-6 text-foreground opacity-60 mb-1" />
                <p className="text-xs font-bold text-foreground">{bed.number}</p>
                <p className="text-[9px] text-muted-foreground">{bed.ward}</p>
                {bed.patient && (
                  <p className="text-[9px] font-medium text-foreground mt-0.5 truncate max-w-full px-1">
                    {bed.patient.name.split(" ")[0]}
                  </p>
                )}
              </motion.button>
            );
          })}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-4">
        {Object.entries(BED_STATUS_STYLE).map(([key, s]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded-full ${s.dot}`} />
            <span className="text-xs text-muted-foreground">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Patient Detail Drawer */}
      <AnimatePresence>
        {selected && (
          <>
            <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setSelected(null)} />
            <motion.div
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed top-0 right-0 h-full w-full max-w-lg bg-card border-l border-border z-50 flex flex-col shadow-2xl overflow-y-auto"
            >
              {/* Drawer header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-card z-10">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${BED_STATUS_STYLE[selected.status].dot}`} />
                  <div>
                    <p className="font-semibold text-foreground">Bed {selected.number}</p>
                    <p className="text-xs text-muted-foreground capitalize">{selected.ward} · {selected.type} · {BED_STATUS_STYLE[selected.status].label}</p>
                  </div>
                </div>
                <button onClick={() => setSelected(null)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-5 flex-1">
                {selected.status === "available" || selected.status === "maintenance" ? (
                  <div className="text-center py-12">
                    <div className={`w-14 h-14 rounded-2xl ${BED_STATUS_STYLE[selected.status].bg} flex items-center justify-center mx-auto mb-4`}>
                      <Bed className="w-7 h-7 text-foreground opacity-50" />
                    </div>
                    <p className="font-semibold text-foreground capitalize">{BED_STATUS_STYLE[selected.status].label}</p>
                    <p className="text-sm text-muted-foreground mt-1">This bed has no active patient</p>
                    {selected.status === "available" && (
                      <Button className="mt-5 rounded-xl gap-2">
                        <Plus className="w-4 h-4" /> Admit Patient
                      </Button>
                    )}
                    <div className="mt-4 flex gap-2 justify-center">
                      {(["available","maintenance"] as BedStatus[]).filter(s => s !== selected.status).map(s => (
                        <Button key={s} variant="outline" size="sm" className="rounded-xl capitalize"
                          onClick={() => handleStatusChange(selected._id, s)}>
                          Mark {s}
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : selected.patient ? (
                  <>
                    {/* Patient info */}
                    <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <User className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-bold text-foreground text-lg">{selected.patient.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {selected.patient.age} yrs · {selected.patient.gender} · {selected.patient.phone}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Clinical info */}
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { icon: Stethoscope, label: "Doctor",    value: `Dr. ${selected.patient.doctor}` },
                        { icon: AlertCircle, label: "Diagnosis",  value: selected.patient.diagnosis       },
                        { icon: Calendar,    label: "Admitted",   value: `${new Date(selected.patient.admissionDate).toLocaleDateString("en-IN")} (${daysSince(selected.patient.admissionDate)})` },
                        { icon: Clock,       label: "Exp. Discharge", value: selected.patient.expectedDischarge ? new Date(selected.patient.expectedDischarge).toLocaleDateString("en-IN") : "—" },
                      ].map(item => (
                        <div key={item.label} className="bg-card border border-border rounded-xl p-3">
                          <div className="flex items-center gap-1.5 mb-1">
                            <item.icon className="w-3.5 h-3.5 text-muted-foreground" />
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{item.label}</p>
                          </div>
                          <p className="text-sm font-medium text-foreground">{item.value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Billing */}
                    <div className="bg-card border border-border rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <IndianRupee className="w-4 h-4 text-muted-foreground" />
                        <p className="text-sm font-semibold text-foreground">Billing</p>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground">Total Bill</p>
                          <p className="text-xl font-bold text-foreground">{fmt(selected.patient.totalBill)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Due Amount</p>
                          <p className={`text-xl font-bold ${selected.patient.dueAmount > 0 ? "text-red-500" : "text-emerald-500"}`}>
                            {fmt(selected.patient.dueAmount)}
                          </p>
                        </div>
                      </div>
                      {selected.patient.dueAmount <= 0 && (
                        <div className="flex items-center gap-1.5 mt-2 text-emerald-600 text-xs">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Fully paid
                        </div>
                      )}
                    </div>

                    {/* Medicines */}
                    {selected.patient.medicines?.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Pill className="w-4 h-4 text-muted-foreground" />
                          <p className="text-sm font-semibold text-foreground">Current Medicines</p>
                        </div>
                        <div className="space-y-1.5">
                          {selected.patient.medicines.map((m, i) => (
                            <div key={i} className="flex items-center justify-between bg-muted/50 rounded-xl px-3 py-2">
                              <span className="text-sm text-foreground">{m.name}</span>
                              <span className="text-xs text-muted-foreground">{m.dose}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Investigations */}
                    {selected.patient.investigations?.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <FlaskConical className="w-4 h-4 text-muted-foreground" />
                          <p className="text-sm font-semibold text-foreground">Investigations Ordered</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {selected.patient.investigations.map((inv, i) => (
                            <span key={i} className="px-3 py-1 bg-primary/10 text-primary text-xs rounded-full font-medium">{inv}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Treatment Notes */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-muted-foreground" />
                          <p className="text-sm font-semibold text-foreground">Treatment Notes</p>
                        </div>
                        <button onClick={() => { setEditing(!editing); setNoteText(selected.patient?.treatmentNotes || ""); }}
                          className="text-xs text-primary hover:underline font-medium">
                          {editing ? "Cancel" : "Edit"}
                        </button>
                      </div>
                      {editing ? (
                        <div className="space-y-2">
                          <textarea value={noteText} onChange={e => setNoteText(e.target.value)} rows={4}
                            className="w-full bg-background border border-border rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring text-foreground" />
                          <Button size="sm" onClick={handleSaveNote} disabled={saving} className="rounded-xl gap-1.5">
                            {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                            Save Notes
                          </Button>
                        </div>
                      ) : (
                        <p className="text-sm text-foreground bg-muted/30 rounded-xl p-3 min-h-[60px]">
                          {selected.patient.treatmentNotes || <span className="text-muted-foreground italic">No notes added</span>}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="border-t border-border pt-4 flex gap-2 flex-wrap">
                      <Button variant="outline" size="sm" className="rounded-xl gap-1.5"
                        onClick={() => handleStatusChange(selected._id, "available")}>
                        <CheckCircle2 className="w-3.5 h-3.5" /> Discharge
                      </Button>
                      <Button variant="outline" size="sm" className="rounded-xl gap-1.5 text-amber-600 border-amber-300 hover:bg-amber-50"
                        onClick={() => handleStatusChange(selected._id, "maintenance")}>
                        Mark Maintenance
                      </Button>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">No patient data available</p>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
