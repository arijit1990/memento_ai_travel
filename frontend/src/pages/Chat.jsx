import { useState, useEffect } from "react";
import { Plane, ArrowLeft, MessageCircle, Map } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { ChatThread } from "@/components/chat/ChatThread";
import { IntakeWizard } from "@/components/chat/IntakeWizard";
import { ItineraryPanel } from "@/components/itinerary/ItineraryPanel";
import { SAMPLE_CHAT } from "@/lib/mockData";
import { api, getGuestSessionId } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const Chat = () => {
  const { user } = useAuth();
  const [mode, setMode] = useState("chat"); // 'chat' | 'wizard'
  const [messages, setMessages] = useState(SAMPLE_CHAT);
  const [showConfirm, setShowConfirm] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [trip, setTrip] = useState(null);
  const [confirmSummary, setConfirmSummary] = useState([]);
  const [intake, setIntake] = useState(null);
  const [intakeStep, setIntakeStep] = useState("destination"); // 'destination' | 'dates' | 'group' | 'vibe' | 'done'
  const [editing, setEditing] = useState(false);
  const [mobileView, setMobileView] = useState("chat"); // 'chat' | 'itinerary' (mobile only)

  useEffect(() => {
    if (!user) getGuestSessionId();
  }, [user]);

  // Strip filler phrases like "I want to go to X" → "X" — purely cosmetic, falls back to raw text.
  const cleanDestination = (text) => {
    let t = text.trim().replace(/[?!.]+$/g, "");
    // Apply prefix-strip patterns iteratively until nothing changes
    const patterns = [
      /^(hi|hey|hello|so|well|okay|ok|um|uh)[,\s]+/i,
      /^(i|we|we're|we are|i'?[a-z]+|i am|y'?all|you|you'?re)\s+/i,
      /^(want|wanna|would\s+like|like|love|'d\s+like|am\s+thinking|am\s+planning|think|plan|hope|wish|considering|looking|need)(ing|ed|s)?\s+/i,
      /^(to|of|about|on|for)\s+/i,
      /^(go(ing)?|travel(l?ing)?|visit(ing)?|head(ing)?|plan(ning)?|take|do|try)\s+/i,
      /^(a\s+)?(trip|holiday|vacation|getaway|escape)\s+/i,
      /^(to|for|in|at|around|towards?)\s+/i,
      /^(the\s+)/i,
      /^(let'?s|how about|maybe|perhaps|thinking|planning|considering)\s+/i,
    ];
    let prev;
    do {
      prev = t;
      for (const re of patterns) {
        t = t.replace(re, "");
      }
    } while (t !== prev && t.length > 0);
    // Also strip trailing duration/group hints — "Goa for a week" → "Goa"
    t = t.replace(/\s+for\s+(a\s+|the\s+)?(\d+\s+)?(day|week|month|weekend|while|bit|moment).*$/i, "");
    t = t.trim();
    // Capitalize first letter of each word for nicer display
    if (t && t.length > 0) {
      t = t
        .split(/\s+/)
        .map((w) => (w.length > 2 ? w[0].toUpperCase() + w.slice(1) : w))
        .join(" ");
    }
    return t || text.trim();
  };

  const detectGroup = (lower) => {
    if (/\bsolo\b|\balone\b|\bjust me\b|\bby myself\b/.test(lower)) return "Solo";
    if (/\bcouple\b|\bpartner\b|\bspouse\b|\bgirlfriend\b|\bboyfriend\b|\bwife\b|\bhusband\b|\bhoneymoon\b|\b(two|2)\b/.test(lower)) return "2 adults";
    if (/\bfamily\b|\bkids?\b|\bchildren\b/.test(lower)) return "Family with kids";
    if (/\bfriends?\b|\b(three|3|four|4|five|5)\b/.test(lower)) return "Friends (3-5)";
    if (/\bgroup\b/.test(lower)) return "Friends (6+)";
    return null;
  };

  const detectTravelerTypes = (lower) => {
    const types = [];
    if (/\b(food|culinary|eat|foodie|restaurant|wine|gastronomy)\b/.test(lower)) types.push("Food Lover");
    if (/\b(culture|art|museum|history|architecture|gallery)\b/.test(lower)) types.push("Culture Seeker");
    if (/\b(adventure|hike|hiking|outdoor|trek|surf|climb)\b/.test(lower)) types.push("Adventure Seeker");
    if (/\b(wellness|relax|spa|yoga|retreat|quiet|slow)\b/.test(lower)) types.push("Wellness Traveller");
    if (/\b(luxury|luxurious|premium|five-?star|fine)\b/.test(lower)) types.push("Luxury Traveller");
    if (/\b(party|nightlife|club|bars?)\b/.test(lower)) types.push("Party Animal");
    return types;
  };

  const handleSend = (text) => {
    const userMsg = { id: `m-${Date.now()}`, role: "user", content: text };
    setMessages((m) => [...m, userMsg]);

    // If we already have a trip, treat the message as an EDIT request
    if (trip) {
      handleEdit(text);
      return;
    }

    // Step-machine intake: every reply advances state by exactly one step.
    setTimeout(() => {
      const lower = text.toLowerCase();
      const detected = {
        ...(intake || {
          destination: "",
          dates: "Flexible",
          group: "",
          travelerType: [],
          tripType: "City Break",
          budget: "Flexible",
        }),
      };
      let reply;
      let nextStep = intakeStep;

      if (intakeStep === "destination") {
        detected.destination = cleanDestination(text);
        nextStep = "group";
        reply = {
          id: `m-${Date.now() + 1}`,
          role: "ai",
          content: `${detected.destination} — lovely choice. Who's coming along? Solo, a couple, family, or a group of friends? And roughly when are you thinking?`,
        };
      } else if (intakeStep === "group") {
        detected.group = detectGroup(lower) || "2 adults";
        // Try to grab a date phrase if mentioned in the same message
        const dateMatch = text.match(/\b(spring|summer|fall|autumn|winter|january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec|next\s+(week|month|year)|this\s+(week|month|year)|weekend|long weekend|\d+\s+(day|week|month)s?)\b/i);
        if (dateMatch) detected.dates = dateMatch[0];
        nextStep = "vibe";
        reply = {
          id: `m-${Date.now() + 1}`,
          role: "ai",
          content: "Got it. What kind of vibe are you after — culture-heavy, food-forward, adventurous, slow & restful, party? Anything that resonates is fine.",
        };
      } else if (intakeStep === "vibe") {
        const types = detectTravelerTypes(lower);
        detected.travelerType = types.length > 0 ? types : ["Explorer"];
        // Pick up budget if mentioned
        const budgetMatch = text.match(/\$[\d,kK]+(\s*[-–to]+\s*\$?[\d,kK]+)?/);
        if (budgetMatch) detected.budget = budgetMatch[0];
        nextStep = "done";
        reply = {
          id: `m-${Date.now() + 1}`,
          role: "ai",
          content: "Perfect — let me read this back to make sure I have it right.",
        };
      } else {
        // 'done' but user keeps chatting before confirming — gently nudge to confirm or restart
        reply = {
          id: `m-${Date.now() + 1}`,
          role: "ai",
          content: "I have what I need — tap 'Yes, generate it' above when you're ready, or tell me what to change.",
        };
      }

      setIntake(detected);
      setIntakeStep(nextStep);
      setMessages((m) => [...m, reply]);

      if (nextStep === "done") {
        setTimeout(() => {
          setConfirmSummary([
            { label: "Destination", value: detected.destination },
            { label: "When", value: detected.dates || "Flexible" },
            { label: "Group", value: detected.group || "2 adults" },
            { label: "Vibe", value: (detected.travelerType || []).join(" · ") || "Explorer" },
            { label: "Trip type", value: detected.tripType || "City Break" },
            { label: "Budget", value: detected.budget || "Flexible" },
          ]);
          setShowConfirm(true);
        }, 600);
      }
    }, 700);
  };

  const handleEdit = async (message) => {
    setEditing(true);
    setMessages((m) => [
      ...m,
      {
        id: `m-${Date.now()}`,
        role: "ai",
        content: "Working on it — rewriting your itinerary now...",
      },
    ]);
    try {
      const r = await api.post(
        `/trips/${trip.id}/edit`,
        { message },
        { params: user ? {} : { guest_session_id: getGuestSessionId() } },
      );
      setTrip(r.data.trip);
      setMessages((m) => [
        ...m,
        {
          id: `m-${Date.now() + 1}`,
          role: "ai",
          content: "Done — your itinerary is updated. Take a look on the right.",
        },
      ]);
      toast.success("Itinerary updated");
      setMobileView("itinerary");
    } catch (e) {
      const msg = e?.response?.data?.detail || e?.message || "Edit failed";
      toast.error("Couldn't apply that edit", { description: msg });
      setMessages((m) => [
        ...m,
        {
          id: `m-${Date.now() + 2}`,
          role: "ai",
          content: `I hit a snag — ${msg}. Want to try rephrasing?`,
        },
      ]);
    } finally {
      setEditing(false);
    }
  };

  const handleWizardComplete = (data) => {
    setMode("chat");
    setIntake(data);
    setIntakeStep("done");
    setConfirmSummary([
      { label: "Destination", value: data.destination },
      { label: "When", value: data.dates },
      { label: "Group", value: data.group },
      { label: "Vibe", value: data.travelerType.join(" · ") },
      { label: "Trip type", value: data.tripType },
      { label: "Budget", value: data.budget },
    ]);
    setMessages([
      ...SAMPLE_CHAT,
      {
        id: `m-${Date.now()}`,
        role: "ai",
        content: "Perfect — I have everything I need. Let me read this back to make sure I've got it right.",
      },
    ]);
    setShowConfirm(true);
  };

  const handleConfirm = async () => {
    setShowConfirm(false);
    setGenerating(true);
    setMessages((m) => [
      ...m,
      { id: `m-${Date.now()}`, role: "user", content: "Yes, generate it." },
    ]);

    try {
      const payload = {
        intake: {
          destination: intake?.destination || "Paris, France",
          dates: intake?.dates || "Flexible",
          group: intake?.group || "2 adults",
          travelerType: intake?.travelerType || ["Explorer"],
          tripType: intake?.tripType || "City Break",
          budget: intake?.budget || "Flexible",
        },
        guest_session_id: user ? null : getGuestSessionId(),
      };
      const r = await api.post("/trips/generate", payload);
      const generated = r.data.trip;
      setTrip(generated);
      setMobileView("itinerary");
      setMessages((m) => [
        ...m,
        {
          id: `m-${Date.now() + 1}`,
          role: "ai",
          content: `Done — your ${generated.destination} itinerary is on the right. I've layered in ${generated.smartHacks?.length || 0} smart hacks. Tell me what to tweak — anything from "make day 3 less touristy" to "add a romantic dinner".`,
        },
      ]);
      toast.success("Itinerary ready", {
        description: `${generated.title} — ${generated.duration} handcrafted`,
      });
    } catch (e) {
      const msg = e?.response?.data?.detail || e?.message || "Generation failed";
      toast.error("Couldn't generate the trip", { description: msg });
      setMessages((m) => [
        ...m,
        {
          id: `m-${Date.now() + 2}`,
          role: "ai",
          content: `I hit a snag generating that — ${msg}. Want to try again?`,
        },
      ]);
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveTrip = () => {
    if (user) {
      toast.success("Saved to your trips");
    } else {
      toast.message("Sign in to keep this trip", {
        description: "Free — your draft will be moved to your account.",
      });
    }
  };

  const showItineraryMobile = mobileView === "itinerary" && trip;

  return (
    <div
      className="flex h-screen w-full bg-memento-cream overflow-hidden"
      data-testid="chat-page"
    >
      {/* Left: Chat / Wizard */}
      <div
        className={`w-full md:w-[45%] lg:w-[42%] xl:w-[40%] h-full flex flex-col border-r border-memento-parchment bg-white relative ${
          showItineraryMobile ? "hidden md:flex" : "flex"
        }`}
      >
        <div className="md:hidden border-b border-memento-parchment px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-memento-espresso text-sm">
            <ArrowLeft className="w-4 h-4" />
            <span className="font-serif">Memento</span>
          </Link>
          {trip && (
            <button
              onClick={() => setMobileView("itinerary")}
              data-testid="mobile-show-itinerary"
              className="text-xs font-medium text-memento-terracotta flex items-center gap-1"
            >
              <Map className="w-3.5 h-3.5" />
              View itinerary
            </button>
          )}
        </div>

        {mode === "wizard" ? (
          <IntakeWizard
            onComplete={handleWizardComplete}
            onSwitchToChat={() => setMode("chat")}
          />
        ) : (
          <ChatThread
            messages={messages}
            onSend={handleSend}
            onConfirm={handleConfirm}
            generating={generating || editing}
            generatingLabel={editing ? "Rewriting your itinerary..." : "Handcrafting your itinerary..."}
            onSwitchToWizard={() => setMode("wizard")}
            showConfirmCard={showConfirm}
            confirmSummary={confirmSummary}
            placeholder={
              trip
                ? "Make day 3 less touristy. Or add a romantic dinner..."
                : "Ask Memento anything — 'Plan a Paris trip for 2'..."
            }
          />
        )}
      </div>

      {/* Right: Itinerary preview */}
      <div
        className={`md:flex md:w-[55%] lg:w-[58%] xl:w-[60%] h-full bg-memento-cream flex-col ${
          showItineraryMobile ? "flex w-full" : "hidden"
        }`}
        data-testid="itinerary-side-panel"
      >
        {/* Mobile back to chat bar */}
        {showItineraryMobile && (
          <div className="md:hidden border-b border-memento-parchment px-4 py-3 flex items-center justify-between bg-white">
            <button
              onClick={() => setMobileView("chat")}
              data-testid="mobile-show-chat"
              className="flex items-center gap-2 text-memento-espresso text-sm font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to chat
            </button>
            <span className="text-xs uppercase tracking-[0.15em] text-memento-coffee font-semibold flex items-center gap-1">
              <MessageCircle className="w-3 h-3" />
              Edit by message
            </span>
          </div>
        )}
        {trip ? (
          <ItineraryPanel trip={trip} compact onSave={handleSaveTrip} />
        ) : (
          <EmptyItineraryState />
        )}
      </div>
    </div>
  );
};

const EmptyItineraryState = () => (
  <div className="flex-1 flex items-center justify-center p-12">
    <div className="max-w-md text-center">
      <div className="w-20 h-20 rounded-full bg-memento-sand flex items-center justify-center mx-auto mb-6">
        <Plane className="w-8 h-8 text-memento-terracotta" strokeWidth={1.5} />
      </div>
      <p className="text-xs tracking-[0.3em] uppercase text-memento-terracotta font-semibold mb-3">
        Your itinerary
      </p>
      <h2 className="font-serif text-3xl text-memento-espresso tracking-tight mb-3">
        Tell Memento where you're going.
      </h2>
      <p className="text-memento-coffee leading-relaxed mb-6">
        Once we have a few details, your handcrafted day-by-day itinerary will appear here — maps, smart hacks, and all.
      </p>
      <div className="bg-white rounded-2xl p-5 border border-memento-parchment text-left">
        <p className="text-[10px] uppercase tracking-[0.2em] font-semibold text-memento-coffee mb-2">
          Try saying
        </p>
        <p className="text-memento-espresso font-serif italic">
          "Paris with my partner for 5 days, mid-April. We love art and good food."
        </p>
      </div>
    </div>
  </div>
);

export default Chat;
