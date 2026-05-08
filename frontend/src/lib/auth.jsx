import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api, getGuestSessionId, clearGuestSessionId } from "./api";
import { supabase } from "./supabase";

const AuthContext = createContext({
  user: null,
  loading: true,
  refresh: async () => {},
  signIn: async () => {},
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const r = await api.get("/auth/me");
      setUser(r.data);
    } catch (_e) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Skip /auth/me check if we're on the callback route — AuthCallback sets the session.
    if (window.location.pathname === "/auth/callback") {
      setLoading(false);
      return;
    }
    refresh();
  }, [refresh]);

  const signIn = useCallback(async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }, []);

  const signOut = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch (_e) {
      /* ignore */
    }
    await supabase.auth.signOut();
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
  const { refresh } = useAuth();
  const [error, setError] = useState(null);

  useEffect(() => {
    const guestId = localStorage.getItem("memento_guest_session_id");
    let cancelled = false;

    (async () => {
      try {
        // supabase.auth.getSession() parses the access_token from the URL hash automatically
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session) {
          throw new Error(sessionError?.message || "No session returned from Supabase");
        }

        await api.post("/auth/session", {
          access_token: session.access_token,
          guest_session_id: guestId,
        });

        await refresh();
        if (!cancelled) {
          window.history.replaceState(null, "", window.location.pathname);
          navigate("/trips", { replace: true });
        }
      } catch (e) {
        if (!cancelled) {
          setError(e?.response?.data?.detail || e.message || "Authentication failed");
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

export { getGuestSessionId };
