import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Eye, EyeOff, Check, X, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const BASE_URL = (import.meta.env.VITE_API_URL as string) || "http://localhost:5000/api";
const getToken = () => localStorage.getItem("cliniq_token");

const apiChangePassword = async (currentPassword: string, newPassword: string) => {
  const res = await fetch(`${BASE_URL}/auth/change-password`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to change password");
  return data;
};

interface PasswordCheck { label: string; passed: boolean; }

const validatePassword = (p: string): PasswordCheck[] => [
  { label: "At least 8 characters",       passed: p.length >= 8 },
  { label: "One uppercase letter (A-Z)",  passed: /[A-Z]/.test(p) },
  { label: "One lowercase letter (a-z)",  passed: /[a-z]/.test(p) },
  { label: "One number (0-9)",            passed: /[0-9]/.test(p) },
  { label: "One special character",       passed: /[^A-Za-z0-9]/.test(p) },
];

const isValid = (p: string) => validatePassword(p).every(c => c.passed);

interface Props {
  open: boolean;
  onClose: () => void;
}

const ChangePasswordModal = ({ open, onClose }: Props) => {
  const [currentPwd, setCurrentPwd]     = useState("");
  const [newPwd, setNewPwd]             = useState("");
  const [confirmPwd, setConfirmPwd]     = useState("");
  const [showCurrent, setShowCurrent]   = useState(false);
  const [showNew, setShowNew]           = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);
  const [newPwdFocused, setNewPwdFocused] = useState(false);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState("");
  const [success, setSuccess]           = useState(false);

  const checks   = validatePassword(newPwd);
  const pwdValid = isValid(newPwd);
  const match    = newPwd === confirmPwd && confirmPwd.length > 0;

  const reset = () => {
    setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
    setError(""); setSuccess(false);
    setShowCurrent(false); setShowNew(false); setShowConfirm(false);
    setNewPwdFocused(false);
  };

  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = async () => {
    if (!currentPwd) { setError("Please enter your current password."); return; }
    if (!pwdValid)   { setError("New password does not meet requirements."); return; }
    if (!match)      { setError("Passwords do not match."); return; }
    setError(""); setLoading(true);
    try {
      await apiChangePassword(currentPwd, newPwd);
      setSuccess(true);
      setTimeout(() => { handleClose(); }, 2000);
    } catch (err: any) {
      setError(err.message || "Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/50 z-40"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-card border border-border rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">

              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-primary" />
                  <h2 className="font-semibold text-foreground">Change Password</h2>
                </div>
                <button onClick={handleClose}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6">
                <AnimatePresence mode="wait">
                  {success ? (
                    <motion.div key="success"
                      initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                      className="flex flex-col items-center py-6 text-center">
                      <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-3">
                        <Check className="w-8 h-8 text-emerald-500" />
                      </div>
                      <h3 className="font-semibold text-foreground mb-1">Password Changed!</h3>
                      <p className="text-sm text-muted-foreground">Your password has been updated successfully.</p>
                    </motion.div>
                  ) : (
                    <motion.div key="form" className="space-y-4">

                      {/* Current password */}
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                          Current Password
                        </label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            type={showCurrent ? "text" : "password"}
                            placeholder="Enter current password"
                            value={currentPwd}
                            onChange={e => setCurrentPwd(e.target.value)}
                            className="pl-10 pr-10 h-11 rounded-xl"
                          />
                          <button type="button" onClick={() => setShowCurrent(!showCurrent)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                            {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* New password */}
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                          New Password
                        </label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            type={showNew ? "text" : "password"}
                            placeholder="Enter new password"
                            value={newPwd}
                            onChange={e => setNewPwd(e.target.value)}
                            onFocus={() => setNewPwdFocused(true)}
                            className="pl-10 pr-10 h-11 rounded-xl"
                          />
                          <button type="button" onClick={() => setShowNew(!showNew)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                            {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>

                        {/* Password strength checklist */}
                        {newPwdFocused && newPwd && (
                          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                            className="mt-2 bg-muted/50 rounded-xl p-3 space-y-1.5">
                            {checks.map(c => (
                              <div key={c.label} className="flex items-center gap-2">
                                {c.passed
                                  ? <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                  : <X className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                                <span className={`text-xs ${c.passed ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
                                  {c.label}
                                </span>
                              </div>
                            ))}
                          </motion.div>
                        )}
                      </div>

                      {/* Confirm password */}
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                          Confirm New Password
                        </label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            type={showConfirm ? "text" : "password"}
                            placeholder="Re-enter new password"
                            value={confirmPwd}
                            onChange={e => setConfirmPwd(e.target.value)}
                            className={`pl-10 pr-10 h-11 rounded-xl ${
                              confirmPwd && !match ? "border-destructive" : confirmPwd && match ? "border-emerald-500" : ""
                            }`}
                          />
                          <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                            {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {confirmPwd && !match && (
                          <p className="text-xs text-destructive mt-1">Passwords do not match</p>
                        )}
                        {confirmPwd && match && (
                          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
                            <Check className="w-3 h-3" /> Passwords match
                          </p>
                        )}
                      </div>

                      {error && <p className="text-sm text-destructive">{error}</p>}

                      <div className="flex gap-2 pt-1">
                        <Button variant="outline" onClick={handleClose} className="flex-1 h-11 rounded-xl">
                          Cancel
                        </Button>
                        <Button
                          onClick={handleSubmit}
                          disabled={loading || !pwdValid || !match || !currentPwd}
                          className="flex-1 h-11 rounded-xl"
                        >
                          {loading ? "Updating..." : "Update Password"}
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ChangePasswordModal;