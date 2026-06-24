import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AdminAuthPage  from "@/pages/admin/AdminAuthPage";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import NotFound       from "@/pages/NotFound";
import { isSessionExpired, clearSession } from "@/lib/session";

// ─── Auth guard ───────────────────────────────────────────────────────────────
// A refresh within 15 minutes of the last interaction keeps the session;
// after 15 idle minutes, a refresh drops back to login.
const requireAdmin = (element: JSX.Element): JSX.Element => {
  const token = localStorage.getItem("cliniq_token");
  const user  = JSON.parse(localStorage.getItem("cliniq_user") || "null");
  if (!token || !user || user.role !== "admin") return <Navigate to="/login" replace />;
  if (isSessionExpired()) { clearSession(); return <Navigate to="/login" replace />; }
  return element;
};

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/"                element={<Navigate to="/login" replace />} />
      <Route path="/login"           element={<AdminAuthPage />} />
      <Route path="/dashboard"       element={requireAdmin(<AdminDashboard />)} />
      {/* Legacy redirect from old path */}
      <Route path="/admin"           element={<Navigate to="/login"     replace />} />
      <Route path="/admin/dashboard" element={<Navigate to="/dashboard" replace />} />
      <Route path="*"                element={<NotFound />} />
    </Routes>
  </BrowserRouter>
);

export default App;