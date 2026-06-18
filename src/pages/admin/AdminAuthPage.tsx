import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, EyeOff, Lock, Mail, Activity } from "lucide-react";
import { apiAdminLogin } from "@/lib/api";

const AdminAuthPage = () => {
  const navigate = useNavigate();
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPwd,  setShowPwd]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError("Email and password are required"); return; }
    setError(""); setLoading(true);
    try {
      const data = await apiAdminLogin(email, password);
      localStorage.setItem("cliniq_token", data.token);
      localStorage.setItem("cliniq_user",  JSON.stringify(data.user));
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex bg-[#0f1623]">
      {/* Left panel — branding */}
      <div className="hidden lg:flex flex-col justify-between w-[420px] shrink-0 p-10 border-r border-white/5">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-sm">C</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-white font-semibold text-base">ClinIQ</span>
            <span className="text-[10px] font-semibold bg-white/10 text-white/60 px-1.5 py-0.5 rounded">ADMIN</span>
          </div>
        </div>

        {/* Center text */}
        <div>
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center">
              <Activity className="w-4 h-4 text-blue-400" />
            </div>
            <span className="text-white/40 text-xs font-medium uppercase tracking-widest">Command Center</span>
          </div>
          <h2 className="text-3xl font-bold text-white leading-tight">
            Manage your clinic<br />with full visibility.
          </h2>
          <p className="text-white/40 text-sm mt-4 leading-relaxed">
            Revenue analytics, patient flow, staff management, pharmacy and lab intelligence — all in one place.
          </p>

          {/* Feature list */}
          <div className="mt-8 space-y-3">
            {[
              "Real-time revenue & department analytics",
              "Doctor leaderboard & performance tracking",
              "IPD / Bed management & follow-ups",
              "Pharmacy & lab command center",
            ].map(f => (
              <div key={f} className="flex items-center gap-2.5">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                <p className="text-white/50 text-sm">{f}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-white/20 text-xs">ClinIQ Admin Portal · v2.0</p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-sm"
        >
          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-10 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">C</span>
            </div>
            <span className="text-white font-semibold text-base">ClinIQ</span>
            <span className="text-[10px] font-semibold bg-white/10 text-white/60 px-1.5 py-0.5 rounded">ADMIN</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white tracking-tight">Sign in</h1>
            <p className="text-white/40 mt-1.5 text-sm">Enter your admin credentials to continue.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="text-xs font-semibold text-white/40 uppercase tracking-wide mb-2 block">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
                <input
                  type="email"
                  placeholder="admin@clinic.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email"
                  className="w-full pl-10 pr-4 h-12 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/50 transition-colors"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="text-xs font-semibold text-white/40 uppercase tracking-wide mb-2 block">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
                <input
                  type={showPwd ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="w-full pl-10 pr-12 h-12 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/50 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/50 transition-colors"
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed mt-2 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Signing in…
                </>
              ) : "Sign In"}
            </button>
          </form>

          <p className="text-center text-xs text-white/20 mt-8">
            Authorized personnel only · ClinIQ {new Date().getFullYear()}
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default AdminAuthPage;
