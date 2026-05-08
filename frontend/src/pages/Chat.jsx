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
import { cleanDestination } from "@/lib/intake";

const Chat = () => {
  const { user } = useAuth();
  const [mode, setMode] = useState("chat"); // 'chat' | 'wizard'
  const [messages, setMessages] = useState(SAMPLE_CHAT);
  const [showConfirm, setShowConfirm] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [trip, setTrip] = useState(null);
  const [confirmSummary, setConfirmSummary] = useState([]);
  const [intake, setIntake] = useState({});
  const [editing, setEditing] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [mobileView, setMobileView] = useState("chat"); // 'chat' | 'itinerary' (mobile only)

  useEffect(() => {
    if (!user) getGuestSessionId();
  }, [user]);

  const buildSummary = (data) => [
    { label: "Destination", value: data.destination || "—" },
    { label: "When", value: data.dates || "Flexible" },
    { label: "Group", value: data.group || "2 adults" },
    { label: "Vibe", value: (data.travelerType || []).join(" · ") || "Explorer" },
    { label: "Trip type", value: data.tripType || "City Break" },
    { label: "Budget", value: data.budget || "Flexible" },
  ];

  const handleSend = async (text) => {
    const userMsg = { id: `m-${Date.now()}`, role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);

    // If we already have a trip, treat the message as an EDIT request
    if (trip) {
      handleEdit(text);
      return;
    }

    // LLM-driven intake extraction (gemini-2.5-flash, ~$0.0001/call)
    setThinking(true);
    try {
      const r = await api.post("/chat/intake", {
        messages: newMessages.map(({ role, content }) => ({ role, content })),
        current_intake: intake,
      });
      const { intake: newIntake, next_question, complete } = r.data;
      setIntake(newIntake);

      if (next_question) {
        setMessages((m) => [
          ...m,
          {
            id: `m-${Date.now() + 1}`,
            role: "ai",
            content: next_question,
          },
        ]);
      }
      if (complete) {
        setTimeout(() => {
          setConfirmSummary(buildSummary(newIntake));
          setShowConfirm(true);
        }, 400);
      }
    } catch (e) {
      const msg = e?.response?.data?.detail || "Network blip";
      setMessages((m) => [
        ...m,
        {
          id: `m-${Date.now() + 1}`,
          role: "ai",
          content: `Hmm, I missed that — could you say that again? (${msg})`,
        },
      ]);
    } finally {
      setThinking(false);
    }
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
    // Apply destination cleanup so confirm card looks tidy even when user types verbosely
    const cleaned = { ...data, destination: cleanDestination(data.destination) };
    setMode("chat");
    setIntake(cleaned);
    setConfirmSummary(buildSummary(cleaned));
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
          travelerType:
            (intake?.travelerType && intake.travelerType.length > 0)
              ? intake.travelerType
              : ["Explorer"],
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
            generating={generating || editing || thinking}
            generatingLabel={
              editing
                ? "Rewriting your itinerary..."
                : thinking
                ? "Thinking..."
                : "Handcrafting your itinerary..."
            }
            onSwitchToWizard={() => setMode("wizard")}
            showConfirmCard={showConfirm}
            confirmSummary={confirmSummary}
            placeholder={
              trip
                ? "Make day 3 less touristy. Or add a romantic dinner..."
                : "Tell me where you're going — 'Paris with my partner for a week, food and art'..."
            }
          />
        )}
      </div>

      <div
        className={`md:flex md:w-[55%] lg:w-[58%] xl:w-[60%] h-full bg-memento-cream flex-col ${
          showItineraryMobile ? "flex w-full" : "hidden"
        }`}
        data-testid="itinerary-side-panel"
      >
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
