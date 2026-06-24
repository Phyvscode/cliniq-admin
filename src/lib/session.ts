// Idle-session handling: a refresh within 15 minutes of the admin's last
// interaction keeps the session alive; a refresh after 15 minutes of
// inactivity forces them back to login.
const LAST_ACTIVE_KEY = "cliniq_last_active";
export const IDLE_LIMIT_MS = 15 * 60 * 1000;

export const touchActivity = () => {
  localStorage.setItem(LAST_ACTIVE_KEY, String(Date.now()));
};

export const isSessionExpired = (): boolean => {
  const lastActive = Number(localStorage.getItem(LAST_ACTIVE_KEY));
  if (!lastActive) return true;
  return Date.now() - lastActive > IDLE_LIMIT_MS;
};

export const clearSession = () => {
  localStorage.removeItem("cliniq_token");
  localStorage.removeItem("cliniq_user");
  localStorage.removeItem(LAST_ACTIVE_KEY);
};
