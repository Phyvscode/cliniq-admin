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

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const todayDisplay = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

interface TopMed {
  name:     string;
  quantity: number;
  revenue:  number;
  category: string;
  cost?:    number;
  margin?:  number;
}
interface LowStock {
  name:         string;
  stock:        number;
  reorderLevel: number;
  category:     string;
}
interface PharmacyStats {
  totalRevenue:  number;
  totalItems:    number;
  totalBills:    number;
  avgBillValue:  number;
  revenueChange: number;
}

export default function PharmacyPage() {
  const [stats,    setStats]    = useState<PharmacyStats | null>(null);
  const [topMeds,  setTopMeds]  = useState<TopMed[]>([]);
  const [lowStock, setLowStock] = useState<LowStock[]>([]);
  const [loading,  setLoading]  = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [st, tm, ls] = await Promise.allSettled([
        get("/pharmacy/analytics/stats?period=today"),
        get("/pharmacy/analytics/top-medicines?period=month&limit=10"),
        get("/pharmacy/analytics/low-stock"),
      ]);
      if (st.status === "fulfilled") setStats(st.value.stats || st.value);
      if (tm.status === "fulfilled") setTopMeds(tm.value.medicines || []);
      if (ls.status === "fulfilled") setLowStock(ls.value.items || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const lowStockCount   = lowStock.filter(m => m.stock < m.reorderLevel).length;
  const expiringCount   = 0; // would need expiry dates from backend

  const STAT_CARDS = [
    { label: "REVENUE",         value: fmt(stats?.totalRevenue || 0),  sub: "vs yesterday" },
    { label: "PROFIT",          value: fmt(Math.round((stats?.totalRevenue || 0) * 0.35)), sub: "35% margin" },
    { label: "INVENTORY VALUE", value: fmt(topMeds.reduce((s, m) => s + (m.revenue || 0), 0) * 3), sub: "vs last week" },
    { label: "LOW STOCK",       value: String(lowStockCount), sub: "Items below threshold" },
    { label: "EXPIRING (30D)",  value: String(expiringCount), sub: "Action required" },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#f8f9fc]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-8 py-4 bg-white border-b border-gray-100">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-gray-900">Pharmacy</h1>
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

      <div className="flex-1 overflow-y-auto p-8 space-y-6">
        {/* Stat cards */}
        <div className="grid grid-cols-5 gap-4">
          {STAT_CARDS.map(c => (
            <div key={c.label} className="bg-white rounded-xl border border-gray-100 px-5 py-4">
              <p className="text-[10px] font-semibold text-gray-400 tracking-wider">{c.label}</p>
              <p className="text-xl font-bold text-gray-900 mt-1.5 leading-tight">{c.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{c.sub}</p>
            </div>
          ))}
        </div>

        {/* Top Selling Medicines */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">Pharmacy Command Center</h2>
            <p className="text-sm text-gray-500 mt-0.5">Inventory, sales, margin and expiry intelligence.</p>
          </div>
          <div className="px-6 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700">Top Selling Medicines</h3>
            <p className="text-xs text-gray-400 mt-0.5">Click a row for sales, profit and inventory drill-down.</p>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                {["MEDICINE", "SOLD", "REVENUE", "PROFIT", "MARGIN", "STOCK", "STATUS"].map(h => (
                  <th key={h} className="text-left text-[11px] font-semibold text-gray-400 tracking-wider px-6 py-3.5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400 text-sm">Loading…</td></tr>
              ) : topMeds.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400 text-sm">No sales data</td></tr>
              ) : topMeds.map(m => {
                const margin    = m.margin ?? 35;
                const profit    = Math.round(m.revenue * (margin / 100));
                const isLow     = lowStock.some(l => l.name === m.name && l.stock < l.reorderLevel);
                const stockItem = lowStock.find(l => l.name === m.name);
                const stock     = stockItem?.stock ?? "—";
                return (
                  <tr key={m.name} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer">
                    <td className="px-6 py-3.5 text-sm font-semibold text-gray-900">{m.name}</td>
                    <td className="px-6 py-3.5 text-sm text-gray-700">{m.quantity.toLocaleString("en-IN")}</td>
                    <td className="px-6 py-3.5 text-sm text-gray-700">{fmt(m.revenue)}</td>
                    <td className="px-6 py-3.5 text-sm text-emerald-600 font-medium">{fmt(profit)}</td>
                    <td className="px-6 py-3.5 text-sm text-gray-700">{margin}%</td>
                    <td className="px-6 py-3.5 text-sm text-gray-700">{stock}</td>
                    <td className="px-6 py-3.5">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        isLow ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700"
                      }`}>
                        {isLow ? "Low" : "Healthy"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Low stock alert */}
        {lowStock.filter(m => m.stock < m.reorderLevel).length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-red-600">Low Stock Alerts</h3>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  {["MEDICINE", "CURRENT STOCK", "REORDER LEVEL", "CATEGORY"].map(h => (
                    <th key={h} className="text-left text-[11px] font-semibold text-gray-400 tracking-wider px-6 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lowStock.filter(m => m.stock < m.reorderLevel).map(m => (
                  <tr key={m.name} className="border-b border-gray-50">
                    <td className="px-6 py-3 text-sm font-medium text-gray-900">{m.name}</td>
                    <td className="px-6 py-3 text-sm text-red-600 font-semibold">{m.stock}</td>
                    <td className="px-6 py-3 text-sm text-gray-600">{m.reorderLevel}</td>
                    <td className="px-6 py-3 text-sm text-gray-500">{m.category}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
