import { useState, useEffect } from "react";
import { RefreshCw, Download, Printer, FileSpreadsheet, User, Calendar, IndianRupee, Stethoscope } from "lucide-react";

const BASE = (import.meta.env.VITE_API_URL as string) || "http://localhost:5000/api";
const tok  = () => localStorage.getItem("cliniq_token") || "";
const api  = async (path: string) => {
  const r = await fetch(`${BASE}${path}`, { headers: { Authorization: `Bearer ${tok()}` } });
  const d = await r.json();
  if (!r.ok) throw new Error(d.message);
  return d;
};

type BedStatus = "available" | "occupied" | "maintenance" | "reserved";

interface Bed {
  _id:    string;
  number: string;
  ward:   string;
  type:   string;
  status: BedStatus;
  patient?: {
    name: string; age: number; gender: string; phone: string;
    doctor: string; diagnosis: string;
    admissionDate: string; expectedDischarge: string;
    totalBill: number; dueAmount: number;
    treatmentNotes: string;
  };
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const todayDisplay = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

const STATUS_COLOR: Record<BedStatus, string> = {
  occupied:    "bg-blue-600",
  available:   "bg-gray-100 border border-gray-200",
  maintenance: "bg-amber-400",
  reserved:    "bg-violet-400",
};

export default function BedManagementPage() {
  const [beds,     setBeds]     = useState<Bed[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState<Bed | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const d = await api("/beds");
      setBeds(d.beds || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const occupied    = beds.filter(b => b.status === "occupied").length;
  const available   = beds.filter(b => b.status === "available").length;
  const maintenance = beds.filter(b => b.status === "maintenance").length;
  const total       = beds.length;
  const wards       = [...new Set(beds.map(b => b.ward))].length;
  const occupiedPct = total > 0 ? Math.round((occupied / total) * 100) : 0;
  const availPct    = total > 0 ? Math.round((available / total) * 100) : 0;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#f8f9fc]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-8 py-4 bg-white border-b border-gray-100">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-gray-900">Bed Management</h1>
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

      <div className="flex-1 overflow-y-auto p-8 space-y-6">
        {/* Stat cards */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-100 px-5 py-4">
            <p className="text-[10px] font-semibold text-gray-400 tracking-wider">OCCUPIED</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{occupied}</p>
            <p className="text-xs text-gray-400 mt-0.5">{occupiedPct}% of capacity</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 px-5 py-4">
            <p className="text-[10px] font-semibold text-gray-400 tracking-wider">AVAILABLE</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{available}</p>
            <p className="text-xs text-gray-400 mt-0.5">{availPct}% free</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 px-5 py-4">
            <p className="text-[10px] font-semibold text-gray-400 tracking-wider">CLEANING / MAINT.</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{maintenance}</p>
            <p className="text-xs text-gray-400 mt-0.5">Turnaround</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 px-5 py-4">
            <p className="text-[10px] font-semibold text-gray-400 tracking-wider">TOTAL</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{total}</p>
            <p className="text-xs text-gray-400 mt-0.5">Across {wards} ward{wards !== 1 ? "s" : ""}</p>
          </div>
        </div>

        {/* Grid + detail panel */}
        <div className="flex gap-5">
          {/* Bed grid */}
          <div className="flex-1 bg-white rounded-2xl border border-gray-100 p-6">
            <div className="mb-4">
              <h2 className="text-base font-semibold text-gray-900">Bed &amp; Cabin Management</h2>
              <p className="text-sm text-gray-500 mt-0.5">Live ward map. Click any bed for full patient context.</p>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-5 mb-5">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-blue-600" />
                <span className="text-xs text-gray-500">Occupied</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-gray-100 border border-gray-200" />
                <span className="text-xs text-gray-500">Available</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-amber-400" />
                <span className="text-xs text-gray-500">Maintenance</span>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12 text-gray-400 text-sm">Loading beds…</div>
            ) : beds.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm">No beds configured</div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {beds.map(bed => (
                  <button
                    key={bed._id}
                    onClick={() => setSelected(selected?._id === bed._id ? null : bed)}
                    title={`Bed ${bed.number} · ${bed.ward} · ${bed.status}`}
                    className={`w-12 h-12 rounded-lg transition-all ${STATUS_COLOR[bed.status]} ${
                      selected?._id === bed._id ? "ring-2 ring-offset-1 ring-blue-500" : "hover:opacity-80"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Detail panel */}
          <div className="w-72 bg-white rounded-2xl border border-gray-100 p-6 shrink-0">
            {!selected ? (
              <div className="flex items-center justify-center h-full min-h-[200px] text-center">
                <p className="text-sm text-gray-400">Click any bed to see patient details.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Bed {selected.number}</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    selected.status === "occupied"    ? "bg-blue-100 text-blue-700" :
                    selected.status === "available"   ? "bg-green-100 text-green-700" :
                    "bg-amber-100 text-amber-700"
                  }`}>
                    {selected.status.charAt(0).toUpperCase() + selected.status.slice(1)}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Ward</p>
                  <p className="text-sm font-medium text-gray-900">{selected.ward}</p>
                </div>
                {selected.patient ? (
                  <>
                    <div className="border-t border-gray-100 pt-3">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <User className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{selected.patient.name}</p>
                          <p className="text-xs text-gray-400">{selected.patient.age}y · {selected.patient.gender}</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-start gap-2">
                          <Stethoscope className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-xs text-gray-400">Doctor</p>
                            <p className="text-sm text-gray-700">{selected.patient.doctor}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <Calendar className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-xs text-gray-400">Admitted</p>
                            <p className="text-sm text-gray-700">{selected.patient.admissionDate}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <IndianRupee className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-xs text-gray-400">Bill / Due</p>
                            <p className="text-sm text-gray-700">
                              {fmt(selected.patient.totalBill)} / <span className="text-red-500">{fmt(selected.patient.dueAmount)}</span>
                            </p>
                          </div>
                        </div>
                        {selected.patient.diagnosis && (
                          <div className="bg-gray-50 rounded-lg p-2.5 mt-1">
                            <p className="text-xs text-gray-400 mb-0.5">Diagnosis</p>
                            <p className="text-xs text-gray-700">{selected.patient.diagnosis}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-400 italic">No patient assigned</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
