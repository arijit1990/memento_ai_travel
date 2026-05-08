import { useState } from "react";
import { Mail, Send, Check, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, getGuestSessionId } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export const ExportModal = ({ open, onClose, trip }) => {
  const { user } = useAuth();
  const [email, setEmail] = useState(user?.email || "");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  // Sync email when user signs in / out
  const initialEmail = user?.email || "";
  if (!open && (email !== initialEmail || done)) {
    // reset on close
  }

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email");
      return;
    }
    setSubmitting(true);
    try {
      await api.post(
        `/trips/${trip.id}/export`,
        {
          email,
          guest_session_id: user ? null : getGuestSessionId(),
        },
      );
      setDone(true);
      toast.success("Sent", { description: `Trip exported to ${email}` });
      setTimeout(() => {
        setDone(false);
        onClose();
      }, 1800);
    } catch (err) {
      const msg = err?.response?.data?.detail || "Export failed";
      toast.error("Couldn't export", { description: msg });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      data-testid="export-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-memento-espresso/60 backdrop-blur-sm p-4 animate-float-up"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-md w-full p-7 sm:p-8 shadow-[0_24px_60px_rgba(0,0,0,0.2)] relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          data-testid="export-close"
          className="absolute top-4 right-4 w-8 h-8 rounded-full hover:bg-memento-sand text-memento-coffee flex items-center justify-center"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-12 h-12 rounded-2xl bg-memento-sand text-memento-terracotta flex items-center justify-center mb-4">
          <Mail className="w-5 h-5" />
        </div>
        <h2 className="font-serif text-2xl text-memento-espresso tracking-tight mb-2">
          Send to your inbox
        </h2>
        <p className="text-sm text-memento-coffee mb-6">
          We'll deliver your <span className="text-memento-espresso font-medium">{trip?.title || "trip"}</span> itinerary plus a shareable link.
        </p>

        <form onSubmit={handleSubmit}>
          <Label
            htmlFor="export-email"
            className="text-xs uppercase tracking-wider text-memento-coffee font-semibold"
          >
            Email
          </Label>
          <Input
            id="export-email"
            type="email"
            data-testid="export-email-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            disabled={submitting || done}
            className="mt-1.5 h-12 rounded-xl border-memento-parchment bg-white text-base"
            autoFocus={!user}
          />
          {user && (
            <p className="text-[11px] text-memento-coffee mt-2">
              Pre-filled from your Memento account. You can change it.
            </p>
          )}

          <Button
            type="submit"
            data-testid="export-submit"
            disabled={submitting || done}
            className="w-full mt-5 h-12 rounded-full bg-memento-terracotta hover:bg-memento-terracotta-dark text-white font-medium disabled:opacity-60"
          >
            {done ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Sent
              </>
            ) : submitting ? (
              <>
                <span className="w-3 h-3 rounded-full bg-white/70 animate-pulse-dot mr-2" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Send itinerary
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
};
