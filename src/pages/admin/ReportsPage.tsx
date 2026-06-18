import { useState } from "react";
import {
  TrendingUp, Users, Stethoscope, Building2,
  Activity, BedDouble, Pill, FlaskConical, CalendarClock, UserCog,
  FileSpreadsheet, Printer, Download, Loader2,
} from "lucide-react";

const BASE = (import.meta.env.VITE_API_URL as string) || "http://localhost:5000/api";
const tok  = () => localStorage.getItem("cliniq_token") || "";

const todayDisplay = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
const todayISO     = () => new Date().toISOString().slice(0, 10);

type DateRange = "today" | "yesterday" | "7days" | "30days" | "month" | "custom";

const getDateParams = (range: DateRange) => {
  const today = new Date();
  const fmt   = (d: Date) => d.toISOString().slice(0, 10);
  if (range === "today")     return { from: fmt(today), to: fmt(today) };
  if (range === "yesterday") { const d = new Date(today); d.setDate(d.getDate()-1); return { from: fmt(d), to: fmt(d) }; }
  if (range === "7days")     { const d = new Date(today); d.setDate(d.getDate()-6); return { from: fmt(d), to: fmt(today) }; }
  if (range === "30days")    { const d = new Date(today); d.setDate(d.getDate()-29); return { from: fmt(d), to: fmt(today) }; }
  if (range === "month")     { const d = new Date(today.getFullYear(), today.getMonth(), 1); return { from: fmt(d), to: fmt(today) }; }
  return { from: fmt(today), to: fmt(today) };
};

interface ReportCard {
  key:        string;
  title:      string;
  subtitle:   string;
  icon:       React.ElementType;
  pdfPath?:   string;
}

const REPORTS: ReportCard[] = [
  { key: "revenue",    title: "Revenue Report",    subtitle: "Department, doctor and payment-mode revenue.", icon: TrendingUp,    pdfPath: "/revenue/export" },
  { key: "patient",    title: "Patient Report",    subtitle: "Every visit with UHID, doctor, payment and amount.", icon: Users,         pdfPath: "/revenue/transactions/export" },
  { key: "doctor",     title: "Doctor Report",     subtitle: "Performance, follow-ups, conversion.", icon: Stethoscope,  pdfPath: "/revenue/doctor-performance/export" },
  { key: "department", title: "Department Report", subtitle: "Patients, doctors, revenue, average bill.", icon: Building2,    pdfPath: "/revenue/by-department/export" },
  { key: "opd",        title: "OPD Report",        subtitle: "Outpatient consultations with payment trail.", icon: Activity,     pdfPath: "/revenue/opd/export" },
  { key: "ipd",        title: "IPD Report",        subtitle: "Admissions, beds and inpatient billing.", icon: BedDouble,    pdfPath: "/beds/export" },
  { key: "pharmacy",   title: "Pharmacy Report",   subtitle: "Sales, margin, inventory and expiry.", icon: Pill,         pdfPath: "/pharmacy/analytics/export" },
  { key: "lab",        title: "Laboratory Report", subtitle: "Tests ordered, revenue and referrals.", icon: FlaskConical, pdfPath: "/lab/analytics/export" },
  { key: "followup",   title: "Follow-up Report",  subtitle: "Due, called, confirmed, lost.", icon: CalendarClock, pdfPath: "/prescriptions/followup/export" },
  { key: "staff",      title: "Staff Report",      subtitle: "Doctors, nurses, technicians and payroll.", icon: UserCog,      pdfPath: "/admin/staff/export" },
];

export default function ReportsPage() {
  const [range,       setRange]       = useState<DateRange>("today");
  const [customFrom,  setCustomFrom]  = useState(todayISO());
  const [customTo,    setCustomTo]    = useState(todayISO());
  const [downloading, setDownloading] = useState<string | null>(null);

  const RANGE_TABS: { key: DateRange; label: string }[] = [
    { key: "today",     label: "Today"       },
    { key: "yesterday", label: "Yesterday"   },
    { key: "7days",     label: "Last 7 days" },
    { key: "30days",    label: "Last 30 days"},
    { key: "month",     label: "This Month"  },
    { key: "custom",    label: "Custom"      },
  ];

  const handleDownload = async (report: ReportCard, format: "pdf" | "excel" | "print") => {
    const key = `${report.key}-${format}`;
    setDownloading(key);
    try {
      const params = range === "custom"
        ? { from: customFrom, to: customTo }
        : getDateParams(range);

      if (format === "print") {
        window.print();
        return;
      }

      const q = new URLSearchParams({ ...params, format }).toString();
      const res = await fetch(`${BASE}${report.pdfPath}?${q}`, {
        headers: { Authorization: `Bearer ${tok()}` },
      });

      if (res.ok) {
        const blob = await res.blob();
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement("a");
        a.href     = url;
        a.download = `${report.key}-report.${format === "excel" ? "xlsx" : "pdf"}`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      // endpoint not yet implemented — silently ignore
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#f8f9fc]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-8 py-4 bg-white border-b border-gray-100">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-gray-900">Reports</h1>
          <span className="text-sm text-gray-400">·</span>
          <span className="text-sm text-gray-500">{todayDisplay}</span>
        </div>
        <button className="flex items-center gap-1.5 px-4 py-2 text-sm text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors">
          <Download className="w-4 h-4" /> Export
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-8 space-y-6">
        {/* Header + date range */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="mb-5">
            <h2 className="text-base font-semibold text-gray-900">Report Center</h2>
            <p className="text-sm text-gray-500 mt-0.5">Every report, every format. Download or print on demand.</p>
          </div>

          {/* Date range tabs */}
          <div className="flex items-center gap-1 flex-wrap">
            {RANGE_TABS.map(t => (
              <button key={t.key} onClick={() => setRange(t.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  range === t.key
                    ? "bg-gray-900 text-white"
                    : "text-gray-500 hover:bg-gray-100"
                }`}>
                {t.label}
              </button>
            ))}
          </div>

          {range === "custom" && (
            <div className="flex items-center gap-3 mt-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">From</label>
                <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">To</label>
                <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
              </div>
            </div>
          )}
        </div>

        {/* Report cards grid */}
        <div className="grid grid-cols-3 gap-4">
          {REPORTS.map(report => {
            const Icon = report.icon;
            return (
              <div key={report.key} className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{report.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{report.subtitle}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDownload(report, "excel")}
                    disabled={downloading === `${report.key}-excel`}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50">
                    {downloading === `${report.key}-excel`
                      ? <Loader2 className="w-3 h-3 animate-spin" />
                      : <FileSpreadsheet className="w-3 h-3" />}
                    Excel
                  </button>
                  <button
                    onClick={() => handleDownload(report, "print")}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <Printer className="w-3 h-3" /> Print
                  </button>
                  <button
                    onClick={() => handleDownload(report, "pdf")}
                    disabled={downloading === `${report.key}-pdf`}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50">
                    {downloading === `${report.key}-pdf`
                      ? <Loader2 className="w-3 h-3 animate-spin" />
                      : <Download className="w-3 h-3" />}
                    PDF
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
