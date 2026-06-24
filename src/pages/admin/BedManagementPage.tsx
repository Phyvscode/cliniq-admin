import { useState, useEffect } from "react";
import { RefreshCw, Download, Printer, FileSpreadsheet, User, Plus, Trash2, X } from "lucide-react";
import { apiGetBeds, apiCreateBed, apiDeleteBed } from "@/lib/api";

interface Bed {
  _id:       string;
  floor:     string;
  bedNumber: string;
  status:    "available" | "occupied";
  patient?:  { name: string; age?: number; gender?: string; permanentCode?: string } | null;
}

const todayDisplay = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

export default function BedManagementPage() {
  const [beds,     setBeds]     = useState<Bed[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState<Bed | null>(null);
  const [showAdd,  setShowAdd]  = useState(false);
  const [newFloor, setNewFloor] = useState("");
  const [newBed,   setNewBed]   = useState("");
  const [adding,   setAdding]   = useState(false);
  const [error,    setError]    = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const d = await apiGetBeds();
      setBeds(d.beds || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const occupied  = beds.filter(b => b.status === "occupied").length;
  const available = beds.filter(b => b.status === "available").length;
  const total      = beds.length;
  const floors     = [...new Set(beds.map(b => b.floor))];
  const occupiedPct = total > 0 ? Math.round((occupied / total) * 100) : 0;
  const availPct    = total > 0 ? Math.round((available / total) * 100) : 0;

  const handleAdd = async () => {
    if (!newFloor.trim() || !newBed.trim()) { setError("Floor and bed number are both required."); return; }
    setAdding(true); setError("");
    try {
      await apiCreateBed({ floor: newFloor.trim(), bedNumber: newBed.trim() });
      setNewBed("");
      await load();
    } catch (e: any) { setError(e.message || "Failed to add bed"); }
    finally { setAdding(false); }
  };

  const handleDelete = async (bed: Bed) => {
    if (bed.status === "occupied") { alert("This bed is occupied — it must be vacated before it can be removed."); return; }
    if (!confirm(`Remove Bed ${bed.bedNumber} on ${bed.floor}?`)) return;
    try { await apiDeleteBed(bed._id); if (selected?._id === bed._id) setSelected(null); load(); }
    catch (e: any) { alert(e.message || "Failed to delete bed"); }
  };

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
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors">
            <Plus className="w-4 h-4" /> Add Bed
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <FileSpreadsheet className="w-4 h-4" /> Excel
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <Printer className="w-4 h-4" /> Print
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
            <p className="text-[10px] font-semibold text-gray-400 tracking-wider">FLOORS</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{floors.length}</p>
            <p className="text-xs text-gray-400 mt-0.5">Configured</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 px-5 py-4">
            <p className="text-[10px] font-semibold text-gray-400 tracking-wider">TOTAL BEDS</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{total}</p>
            <p className="text-xs text-gray-400 mt-0.5">Across all floors</p>
          </div>
        </div>

        {/* Grid + detail panel */}
        <div className="flex gap-5">
          {/* Bed layout by floor */}
          <div className="flex-1 bg-white rounded-2xl border border-gray-100 p-6">
            <div className="mb-4">
              <h2 className="text-base font-semibold text-gray-900">Bed Layout</h2>
              <p className="text-sm text-gray-500 mt-0.5">Click any bed for patient details. Reception assigns patients from the Patient page.</p>
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
            </div>

            {loading ? (
              <div className="text-center py-12 text-gray-400 text-sm">Loading beds…</div>
            ) : beds.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm">No beds configured yet — click "Add Bed" to set up the layout.</div>
            ) : (
              <div className="space-y-5">
                {floors.map(floor => {
                  const floorBeds = beds.filter(b => b.floor === floor);
                  return (
                    <div key={floor}>
                      <p className="text-xs font-semibold text-gray-500 mb-2">{floor}</p>
                      <div className="flex flex-wrap gap-2">
                        {floorBeds.map(bed => (
                          <div key={bed._id} className="relative group">
                            <button
                              onClick={() => setSelected(selected?._id === bed._id ? null : bed)}
                              title={`Bed ${bed.bedNumber} · ${bed.status}`}
                              className={`w-12 h-12 rounded-lg transition-all flex items-center justify-center text-[10px] font-semibold ${
                                bed.status === "occupied" ? "bg-blue-600 text-white" : "bg-gray-100 border border-gray-200 text-gray-500"
                              } ${selected?._id === bed._id ? "ring-2 ring-offset-1 ring-blue-500" : "hover:opacity-80"}`}
                            >
                              {bed.bedNumber}
                            </button>
                            {bed.status === "available" && (
                              <button onClick={() => handleDelete(bed)}
                                className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <X className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
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
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Bed {selected.bedNumber}</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    selected.status === "occupied" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"
                  }`}>
                    {selected.status.charAt(0).toUpperCase() + selected.status.slice(1)}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Floor</p>
                  <p className="text-sm font-medium text-gray-900">{selected.floor}</p>
                </div>
                {selected.patient ? (
                  <div className="border-t border-gray-100 pt-3">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <User className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{selected.patient.name}</p>
                        <p className="text-xs text-gray-400">{selected.patient.age ?? "—"}y · {selected.patient.gender ?? "—"}</p>
                      </div>
                    </div>
                    {selected.patient.permanentCode && (
                      <p className="text-xs font-mono text-gray-400 mt-2">{selected.patient.permanentCode}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">No patient assigned</p>
                )}
                {selected.status === "available" && (
                  <button onClick={() => handleDelete(selected)}
                    className="w-full flex items-center justify-center gap-1.5 h-9 rounded-lg border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" /> Remove bed
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Bed modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Add Bed</h2>
              <button onClick={() => { setShowAdd(false); setError(""); }} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-3">
              <div>
                <label className="text-[10px] font-semibold text-gray-400 tracking-wider mb-1.5 block">FLOOR</label>
                <input value={newFloor} onChange={e => setNewFloor(e.target.value)}
                  placeholder="e.g. Floor 1, ICU"
                  list="existing-floors"
                  className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
                <datalist id="existing-floors">
                  {floors.map(f => <option key={f} value={f} />)}
                </datalist>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-gray-400 tracking-wider mb-1.5 block">BED NUMBER</label>
                <input value={newBed} onChange={e => setNewBed(e.target.value)}
                  placeholder="e.g. 101"
                  className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
              <button onClick={handleAdd} disabled={adding}
                className="w-full h-10 rounded-lg bg-gray-900 text-white text-sm font-semibold flex items-center justify-center gap-1.5 disabled:opacity-40">
                {adding ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} Add Bed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
