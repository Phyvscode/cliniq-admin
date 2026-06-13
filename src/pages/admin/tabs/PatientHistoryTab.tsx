import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, User, Phone, Calendar, Stethoscope, Pill, FlaskConical,
  FileText, RefreshCw, Clock, ChevronDown, ChevronRight, AlertCircle,
  IndianRupee, Activity, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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

const fmtDate = (s: string) => new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

interface PatientResult { _id: string; name: string; phone: string; age: number; gender: string; uhid?: string; }

interface Visit {
  _id: string; date: string; type: "OPD" | "IPD";
  doctor: string; specialization: string;
  complaints: string[]; diagnosis: string; vitals?: Record<string, string>;
  prescriptions: { medicine: string; dose: string; duration: string }[];
  investigations: { name: string; status: string; result?: string }[];
  notes?: string; billAmount: number; followUp?: string;
}

interface PatientDetail {
  _id: string; name: string; phone: string; age: number; gender: string;
  bloodGroup?: string; address?: string; uhid?: string;
  visits: Visit[];
  totalVisits: number; totalSpent: number; lastVisit: string;
}

export const PatientHistoryTab = () => {
  const [query,    setQuery]    = useState("");
  const [results,  setResults]  = useState<PatientResult[]>([]);
  const [searching,setSearching]= useState(false);
  const [patient,  setPatient]  = useState<PatientDetail | null>(null);
  const [loadingP, setLoadingP] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [error,    setError]    = useState("");

  const search = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setError("");
    setResults([]);
    setPatient(null);
    try {
      const d = await get(`/patients/search?q=${encodeURIComponent(query.trim())}`);
      setResults(d.patients || []);
      if ((d.patients || []).length === 0) setError("No patients found");
    } catch (e: any) {
      setError(e.message || "Search failed");
    }
    setSearching(false);
  };

  const loadPatient = async (id: string) => {
    setLoadingP(true);
    setError("");
    try {
      const d = await get(`/patients/${id}/history`);
      setPatient(d.patient || d);
      setResults([]);
    } catch (e: any) {
      setError(e.message || "Failed to load patient history");
    }
    setLoadingP(false);
  };

  const toggleExpanded = (id: string) => {
    setExpanded(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const visitIcon: Record<string, any> = { OPD: Stethoscope, IPD: Activity };
  const visitColor: Record<string, string> = { OPD: "text-blue-500", IPD: "text-violet-500" };
  const visitBg:    Record<string, string> = { OPD: "bg-blue-500/10", IPD: "bg-violet-500/10" };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-foreground">Patient History</h2>
        <p className="text-sm text-muted-foreground">Search a patient and view complete visit timeline</p>
      </div>

      {/* Search */}
      <div className="flex gap-2 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={query} onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && search()}
            placeholder="Search by name, phone, or UHID…"
            className="pl-9 h-10 rounded-xl" />
        </div>
        <Button onClick={search} disabled={searching || !query.trim()} className="rounded-xl px-6 gap-2">
          {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          Search
        </Button>
        {patient && (
          <Button variant="outline" onClick={() => { setPatient(null); setQuery(""); }} className="rounded-xl">
            Clear
          </Button>
        )}
      </div>

      {/* Error */}
      {error && !loadingP && (
        <div className="flex items-center gap-2 text-red-500 mb-4 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* Search results */}
      {results.length > 0 && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden mb-6">
          {results.map((r, i) => (
            <button key={r._id} onClick={() => loadPatient(r._id)}
              className={`w-full flex items-center gap-4 px-5 py-3.5 text-left hover:bg-muted/50 transition-colors ${i !== 0 ? "border-t border-border" : ""}`}>
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground text-sm">{r.name}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                  <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{r.phone}</span>
                  <span>{r.age} yrs · {r.gender}</span>
                  {r.uhid && <span className="font-mono">#{r.uhid}</span>}
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </button>
          ))}
        </div>
      )}

      {/* Loading patient */}
      {loadingP && (
        <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loading patient history…</span>
        </div>
      )}

      {/* Patient detail */}
      <AnimatePresence>
        {patient && !loadingP && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            {/* Patient info card */}
            <div className="bg-card border border-border rounded-2xl p-5 mb-5">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="w-7 h-7 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-bold text-foreground">{patient.name}</h3>
                    {patient.uhid && <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded-lg">#{patient.uhid}</span>}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {patient.age} yrs · {patient.gender}
                    {patient.bloodGroup ? ` · ${patient.bloodGroup}` : ""}
                    {patient.phone ? ` · ${patient.phone}` : ""}
                  </p>
                  {patient.address && <p className="text-xs text-muted-foreground mt-0.5">{patient.address}</p>}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 border-t border-border pt-4">
                {[
                  { label: "Total Visits",   value: patient.totalVisits            },
                  { label: "Total Spent",    value: fmt(patient.totalSpent)        },
                  { label: "Last Visit",     value: patient.lastVisit ? fmtDate(patient.lastVisit) : "—" },
                ].map(s => (
                  <div key={s.label} className="text-center">
                    <p className="text-lg font-bold text-foreground">{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Timeline */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">Visit Timeline</h3>
              {patient.visits.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No visits recorded</p>
                </div>
              ) : (
                <div className="relative">
                  {/* Vertical line */}
                  <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />
                  <div className="space-y-3 pl-14">
                    {patient.visits.map((v, i) => {
                      const isOpen = expanded.has(v._id);
                      const Icon   = visitIcon[v.type] || Stethoscope;
                      return (
                        <motion.div key={v._id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.04 }}
                          className="relative bg-card border border-border rounded-2xl overflow-hidden">
                          {/* Timeline dot */}
                          <div className={`absolute -left-[44px] top-4 w-5 h-5 rounded-full flex items-center justify-center ${visitBg[v.type]} border-2 border-background`}>
                            <Icon className={`w-2.5 h-2.5 ${visitColor[v.type]}`} />
                          </div>

                          {/* Header row */}
                          <button className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-muted/30 transition-colors"
                            onClick={() => toggleExpanded(v._id)}>
                            <div className={`px-2 py-0.5 rounded-lg text-xs font-semibold ${visitBg[v.type]} ${visitColor[v.type]}`}>{v.type}</div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-foreground text-sm">{v.diagnosis || "Visit"}</p>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{fmtDate(v.date)}</span>
                                <span className="flex items-center gap-1"><Stethoscope className="w-3 h-3" />Dr. {v.doctor}</span>
                                {v.billAmount > 0 && (
                                  <span className="flex items-center gap-1"><IndianRupee className="w-3 h-3" />{fmt(v.billAmount)}</span>
                                )}
                              </div>
                            </div>
                            {isOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
                          </button>

                          {/* Expanded details */}
                          <AnimatePresence>
                            {isOpen && (
                              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                                className="border-t border-border overflow-hidden">
                                <div className="px-4 py-4 space-y-4">
                                  {/* Vitals */}
                                  {v.vitals && Object.keys(v.vitals).length > 0 && (
                                    <div>
                                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                                        <Activity className="w-3.5 h-3.5" /> Vitals
                                      </p>
                                      <div className="flex flex-wrap gap-2">
                                        {Object.entries(v.vitals).map(([k, val]) => (
                                          <div key={k} className="bg-muted/50 rounded-xl px-3 py-1.5 text-xs">
                                            <span className="text-muted-foreground capitalize">{k.replace(/([A-Z])/g, " $1")}: </span>
                                            <span className="font-semibold text-foreground">{val}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Complaints */}
                                  {v.complaints?.length > 0 && (
                                    <div>
                                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Complaints</p>
                                      <div className="flex flex-wrap gap-1.5">
                                        {v.complaints.map((c, ci) => (
                                          <span key={ci} className="px-2.5 py-0.5 bg-muted rounded-full text-xs text-foreground">{c}</span>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Prescriptions */}
                                  {v.prescriptions?.length > 0 && (
                                    <div>
                                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                                        <Pill className="w-3.5 h-3.5" /> Prescriptions
                                      </p>
                                      <div className="space-y-1.5">
                                        {v.prescriptions.map((p, pi) => (
                                          <div key={pi} className="flex items-center justify-between bg-muted/50 rounded-xl px-3 py-2">
                                            <span className="text-sm font-medium text-foreground">{p.medicine}</span>
                                            <span className="text-xs text-muted-foreground">{p.dose} · {p.duration}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Investigations */}
                                  {v.investigations?.length > 0 && (
                                    <div>
                                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                                        <FlaskConical className="w-3.5 h-3.5" /> Investigations
                                      </p>
                                      <div className="space-y-1.5">
                                        {v.investigations.map((inv, ii) => (
                                          <div key={ii} className="flex items-center justify-between bg-muted/50 rounded-xl px-3 py-2">
                                            <span className="text-sm font-medium text-foreground">{inv.name}</span>
                                            <div className="flex items-center gap-2">
                                              {inv.result && <span className="text-xs text-foreground font-medium">{inv.result}</span>}
                                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                                                inv.status === "completed" ? "bg-emerald-500/10 text-emerald-600" :
                                                inv.status === "pending"   ? "bg-amber-500/10 text-amber-600" :
                                                "bg-muted text-muted-foreground"
                                              }`}>{inv.status}</span>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Notes + Follow-up */}
                                  <div className="grid grid-cols-2 gap-3">
                                    {v.notes && (
                                      <div>
                                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                                          <FileText className="w-3.5 h-3.5" /> Notes
                                        </p>
                                        <p className="text-sm text-foreground bg-muted/40 rounded-xl px-3 py-2">{v.notes}</p>
                                      </div>
                                    )}
                                    {v.followUp && (
                                      <div>
                                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                                          <Clock className="w-3.5 h-3.5" /> Follow-Up
                                        </p>
                                        <p className="text-sm text-foreground bg-muted/40 rounded-xl px-3 py-2">{fmtDate(v.followUp)}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty / initial state */}
      {!patient && !loadingP && results.length === 0 && !error && (
        <div className="text-center py-20 text-muted-foreground">
          <Search className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">Search for a patient</p>
          <p className="text-sm mt-1">Enter name, phone number, or UHID to find patient history</p>
        </div>
      )}
    </div>
  );
};
