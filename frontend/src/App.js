import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";

import { AppShell } from "@/components/layout/AppShell";
import { AuthProvider, AuthCallback } from "@/lib/auth";
import Landing from "@/pages/Landing";
import Chat from "@/pages/Chat";
import Itinerary from "@/pages/Itinerary";
import Trips from "@/pages/Trips";
import Explore from "@/pages/Explore";
import Saved from "@/pages/Saved";
import Settings from "@/pages/Settings";
import Login from "@/pages/auth/Login";
import Signup from "@/pages/auth/Signup";
import Share from "@/pages/Share";

const Router = () => (
  <Routes>
    {/* Supabase OAuth lands here — outside AppShell so no nav flash */}
    <Route path="/auth/callback" element={<AuthCallback />} />
    {/* Public share lives outside AppShell — no nav rail */}
    <Route path="/share/:token" element={<Share />} />
    <Route element={<AppShell />}>
      <Route path="/" element={<Landing />} />
      <Route path="/chat" element={<Chat />} />
      <Route path="/chat/:sessionId" element={<Chat />} />
      <Route path="/itinerary/:id" element={<Itinerary />} />
      <Route path="/trips" element={<Trips />} />
      <Route path="/explore" element={<Explore />} />
      <Route path="/saved" element={<Saved />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/auth/login" element={<Login />} />
      <Route path="/auth/signup" element={<Signup />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Route>
  </Routes>
);

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <Toaster
            position="bottom-center"
            toastOptions={{
              style: {
                background: "#2D2823",
                color: "#FAF8F5",
                border: "1px solid #5C5449",
                fontFamily: "Outfit, sans-serif",
              },
            }}
          />
          <Router />
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
