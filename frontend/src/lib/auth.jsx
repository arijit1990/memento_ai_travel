import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api, getGuestSessionId, clearGuestSessionId, setToken, clearToken, getToken } from "./api";

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
const EMERGENT_AUTH_URL = "https://auth.emergentagent.com";

const AuthContext = createContext({
  user: null,
  loading: true,
  refresh: async () => {},
  signIn: () => {},
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const r = await api.get("/auth/me");
      setUser(r.data);
    } catch (_e) {
      clearToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // CRITICAL: If returning from OAuth callback, skip the /me check.
    // AuthCallback will exchange the session_id and establish the session first.
    if (window.location.hash?.includes("session_id=")) {
      setLoading(false);
      return;
    }
    refresh();
  }, [refresh]);

  const signIn = useCallback(() => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + "/trips";
    window.location.href = `${EMERGENT_AUTH_URL}/?redirect=${encodeURIComponent(redirectUrl)}`;
  }, []);

  const signOut = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch (_e) {
      /* ignore */
    }
    clearToken();
    clearGuestSessionId();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, refresh, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const AuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { refresh } = useAuth();
  const [error, setError] = useState(null);

  useEffect(() => {
    const hash = location.hash || window.location.hash;
    const m = hash.match(/session_id=([^&]+)/);
    if (!m) {
      navigate("/auth/login", { replace: true });
      return;
    }
    const sessionId = decodeURIComponent(m[1]);
    const guestId = localStorage.getItem("memento_guest_session_id");

    let cancelled = false;
    (async () => {
      try {
        const resp = await api.post("/auth/session", {
          session_id: sessionId,
          guest_session_id: guestId,
        });
        if (resp.data?.session_token) {
          setToken(resp.data.session_token);
        }
        await refresh();
        if (!cancelled) {
          window.history.replaceState(null, "", window.location.pathname);
          navigate("/trips", { replace: true });
        }
      } catch (e) {
        if (!cancelled) {
          setError(e?.response?.data?.detail || "Authentication failed");
          setTimeout(() => navigate("/auth/login", { replace: true }), 2200);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-memento-cream" data-testid="auth-callback">
      <div className="text-center">
        <div className="w-12 h-12 rounded-full bg-memento-espresso text-memento-cream flex items-center justify-center font-serif text-xl mx-auto mb-5">
          M
        </div>
        {error ? (
          <>
            <p className="font-serif text-2xl text-memento-espresso mb-2">
              Sign-in failed
            </p>
            <p className="text-memento-coffee text-sm">{error}</p>
          </>
        ) : (
          <>
            <p className="font-serif text-2xl text-memento-espresso mb-2">
              Signing you in...
            </p>
            <div className="flex justify-center gap-1.5 mt-3">
              <span className="w-2 h-2 rounded-full bg-memento-terracotta animate-pulse-dot" />
              <span
                className="w-2 h-2 rounded-full bg-memento-terracotta animate-pulse-dot"
                style={{ animationDelay: "200ms" }}
              />
              <span
                className="w-2 h-2 rounded-full bg-memento-terracotta animate-pulse-dot"
                style={{ animationDelay: "400ms" }}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// Provides guest session id helper directly
export { getGuestSessionId };
