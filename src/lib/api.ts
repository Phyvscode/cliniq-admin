// Admin app always talks to the cloud backend (not local)
// Set VITE_API_URL in your .env file to your deployed backend URL
// e.g. VITE_API_URL=https://api.yourclinic.com/api
const BASE = (import.meta.env.VITE_API_URL as string) || "http://localhost:5000/api";

const getToken = () => localStorage.getItem("cliniq_token") || "";

const request = async (path: string, opts: RequestInit = {}) => {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      Authorization:  `Bearer ${getToken()}`,
      ...(opts.headers || {}),
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `Request failed: ${res.status}`);
  return data;
};

// Multipart (FormData) request — no Content-Type header so browser sets boundary
const multipart = async (path: string, formData: FormData) => {
  const res = await fetch(`${BASE}${path}`, {
    method:  "POST",
    headers: { Authorization: `Bearer ${getToken()}` },
    body:    formData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `Request failed: ${res.status}`);
  return data;
};

// ── Auth ──────────────────────────────────────────────────────────────────────
export const apiAdminLogin    = (email: string, password: string) =>
  request("/auth/login", { method: "POST", body: JSON.stringify({ email, password, role: "admin" }) });

export const apiChangePassword = (currentPassword: string, newPassword: string) =>
  request("/auth/change-password", { method: "PATCH", body: JSON.stringify({ currentPassword, newPassword }) });

// ── Tier ─────────────────────────────────────────────────────────────────────
export const apiGetTier = ()                    => request("/tier");
export const apiSetTier = (tier: 1|2|3, notes?: string) =>
  request("/tier", { method: "POST", body: JSON.stringify({ tier, notes }) });

// ── Staff management ──────────────────────────────────────────────────────────
export const apiGetAllStaff     = ()              => request("/admin/staff");
export const apiGetStaffByRole  = (role: string)  => request(`/admin/staff/${role}`);
export const apiCreateStaff     = (fd: FormData)  => multipart("/admin/staff", fd);
export const apiDeleteStaff     = (userId: string)=> request(`/admin/staff/${userId}`, { method: "DELETE" });
export const apiUpdateStaffFee  = (userId: string, fee: number) =>
  request(`/admin/staff/${userId}/fee`, { method: "PATCH", body: JSON.stringify({ fee }) });

// ── Medicines (admin view) ────────────────────────────────────────────────────
export const apiGetMedicines    = ()              => request("/pharmacy/medicines");
export const apiAddMedicine     = (body: any)     =>
  request("/pharmacy/medicines", { method: "POST", body: JSON.stringify(body) });
export const apiDeleteMedicine  = (id: string)    =>
  request(`/pharmacy/medicines/${id}`, { method: "DELETE" });

// ── Revenue — Tier 1 ─────────────────────────────────────────────────────────
export const apiGetRevenueStats      = ()    => request("/revenue/stats");
export const apiGetDoctorRevStats    = ()    => request("/revenue/doctor-stats");
export const apiGetAllStaffStats     = ()    => request("/revenue/all-staff-stats");
export const apiGetTransactions      = (params?: any) => {
  const q = params ? "?" + new URLSearchParams(params).toString() : "";
  return request(`/revenue/transactions${q}`);
};
export const apiGetMonthlyTrend      = ()    => request("/revenue/monthly-trend");

// ── Revenue — Tier 2 ─────────────────────────────────────────────────────────
export const apiGetDailyGraph = (
  opts: { period: "days"|"week"|"month"|"year"|"day"; days?: 7|14|30; date?: string } = { period:"days", days:7 }
) => {
  const q = new URLSearchParams({ period: opts.period });
  if (opts.days)  q.set("days",  String(opts.days));
  if (opts.date)  q.set("date",  opts.date);
  return request(`/revenue/daily-graph?${q.toString()}`);
};
export const apiGetRevenueByDepartment  = ()    => request("/revenue/by-department");
export const apiGetDoctorPerformance    = ()    => request("/revenue/doctor-performance");
export const apiGetPaymentBreakdown     = ()    => request("/revenue/payment-breakdown");

// ── Revenue — Tier 3 ─────────────────────────────────────────────────────────
export const apiGetWeeklyTrend   = ()    => request("/revenue/weekly-trend");
export const apiGetPeakHours     = (period: "day"|"week"|"month"|"year" = "month", date?: string) => {
  const q = new URLSearchParams({ period });
  if (date) q.set("date", date);
  return request(`/revenue/peak-hours?${q.toString()}`);
};
export const apiGetDeptGrowth    = ()    => request("/revenue/dept-growth");
export const apiGetPending       = ()    => request("/revenue/pending");
export const apiGetAlerts        = ()    => request("/revenue/alerts");

// ── Salary ────────────────────────────────────────────────────────────────────
export const apiGetSalaryConfig    = (doctorId: string) => request(`/salary/config/${doctorId}`);
export const apiUpsertSalaryConfig = (doctorId: string, body: {
  type: "fixed"|"percentage"|"mixed";
  fixedAmount?: number; percentage?: number;
  mixedFixed?: number; consultationPct?: number; procedurePct?: number;
  notes?: string;
}) => request(`/salary/config/${doctorId}`, { method: "POST", body: JSON.stringify(body) });
export const apiDeleteSalaryConfig = (doctorId: string) =>
  request(`/salary/config/${doctorId}`, { method: "DELETE" });