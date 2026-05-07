import { useState } from "react";
import { Calendar, Users, Wallet, Share2, Download, Heart, Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

import { DayCard } from "./DayCard";
import { SmartHacksStrip } from "./SmartHacksStrip";
import { RealMap } from "./RealMap";
import { useLivePrices } from "./ActivityCard";
import { api, getGuestSessionId } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export const ItineraryPanel = ({ trip, compact = false, onSave, readOnly = false }) => {
  const { prices, loading: pricesLoading } = useLivePrices(trip);
  const { user } = useAuth();
  const [shareCopied, setShareCopied] = useState(false);
  const [creatingShare, setCreatingShare] = useState(false);

  const handleShare = async () => {
    if (creatingShare || !trip?.id) return;
    setCreatingShare(true);
    try {
      const r = await api.post(
        `/trips/${trip.id}/share`,
        {},
        { params: user ? {} : { guest_session_id: getGuestSessionId() } },
      );
      const url = `${window.location.origin}/share/${r.data.token}`;
      try {
        await navigator.clipboard.writeText(url);
      } catch (_e) {
        /* clipboard may be blocked */
      }
      setShareCopied(true);
      toast.success("Share link copied", { description: url });
      setTimeout(() => setShareCopied(false), 2500);
    } catch (e) {
      toast.error("Couldn't create share link", {
        description: e?.response?.data?.detail || "",
      });
    } finally {
      setCreatingShare(false);
    }
  };

  return (
    <div
      className="flex-1 overflow-y-auto scrollbar-thin"
      data-testid="itinerary-panel"
    >
      {/* Cover */}
      <div className="relative h-56 sm:h-72 overflow-hidden">
        {trip.cover ? (
          <img src={trip.cover} alt={trip.destination} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-memento-terracotta to-memento-espresso" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-memento-espresso/80 via-memento-espresso/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
          <p className="text-xs uppercase tracking-[0.3em] text-memento-apricot font-semibold mb-2">
            {trip.tripType || "Trip"} · {trip.duration || ""}
          </p>
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-memento-cream tracking-tight leading-tight">
            {trip.title}
          </h1>
          <p className="text-memento-cream/80 mt-1 text-sm sm:text-base">
            {trip.destination}
          </p>
        </div>

        {!readOnly && (
          <div className="absolute top-4 right-4 flex gap-2">
            <button
              onClick={onSave}
              data-testid="itinerary-save-btn"
              className="w-10 h-10 rounded-full bg-white/95 backdrop-blur-sm hover:bg-white text-memento-espresso flex items-center justify-center shadow-sm transition-colors"
              aria-label="Save"
            >
              <Heart className="w-4 h-4" />
            </button>
            <button
              onClick={handleShare}
              data-testid="itinerary-share-btn"
              disabled={creatingShare}
              className="w-10 h-10 rounded-full bg-white/95 backdrop-blur-sm hover:bg-white text-memento-espresso flex items-center justify-center shadow-sm transition-colors disabled:opacity-50"
              aria-label="Share"
            >
              {shareCopied ? <Check className="w-4 h-4 text-memento-sage-dark" /> : <Share2 className="w-4 h-4" />}
            </button>
            <button
              data-testid="itinerary-download-btn"
              className="w-10 h-10 rounded-full bg-white/95 backdrop-blur-sm hover:bg-white text-memento-espresso flex items-center justify-center shadow-sm transition-colors"
              aria-label="Download"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <div
        className={`${
          compact ? "px-5 sm:px-8 py-8" : "px-6 sm:px-10 lg:px-14 py-10"
        } max-w-5xl`}
      >
        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="bg-white rounded-2xl p-4 border border-memento-parchment">
            <Calendar className="w-4 h-4 text-memento-terracotta mb-2" />
            <p className="text-[10px] uppercase tracking-[0.15em] text-memento-coffee font-semibold mb-1">
              When
            </p>
            <p className="text-sm text-memento-espresso font-medium leading-tight">
              {trip.startDate || "—"}{trip.endDate ? ` – ${trip.endDate}` : ""}
            </p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-memento-parchment">
            <Users className="w-4 h-4 text-memento-terracotta mb-2" />
            <p className="text-[10px] uppercase tracking-[0.15em] text-memento-coffee font-semibold mb-1">
              Travelers
            </p>
            <p className="text-sm text-memento-espresso font-medium leading-tight">
              {trip.travelers || "—"}
            </p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-memento-parchment">
            <Wallet className="w-4 h-4 text-memento-terracotta mb-2" />
            <p className="text-[10px] uppercase tracking-[0.15em] text-memento-coffee font-semibold mb-1">
              Budget
            </p>
            <p className="text-sm text-memento-espresso font-medium leading-tight">
              {trip.spent ? `${trip.spent} / ${trip.budget}` : trip.budget || "—"}
            </p>
          </div>
        </div>

        {/* Vibe / summary */}
        {(trip.vibe || trip.summary) && (
          <div className="mb-8 bg-memento-sand rounded-3xl p-6 border border-memento-parchment">
            <p className="text-[10px] uppercase tracking-[0.2em] text-memento-terracotta font-bold mb-2">
              The vibe
            </p>
            {trip.vibe && (
              <p className="font-serif text-xl text-memento-espresso leading-snug italic mb-3">
                "{trip.vibe}"
              </p>
            )}
            {trip.summary && (
              <p className="text-sm text-memento-coffee leading-relaxed">
                {trip.summary}
              </p>
            )}
            {trip.travelerType && trip.travelerType.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {trip.travelerType.map((t) => (
                  <span
                    key={t}
                    className="px-3 py-1 rounded-full bg-white text-xs font-medium text-memento-espresso border border-memento-parchment"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Map */}
        <div className="mb-10">
          <RealMap trip={trip} />
        </div>

        {/* Smart hacks */}
        {trip.smartHacks && trip.smartHacks.length > 0 && (
          <div className="mb-12">
            <SmartHacksStrip hacks={trip.smartHacks} />
          </div>
        )}

        {/* Days */}
        <div>
          <div className="flex items-baseline justify-between mb-6">
            <h2 className="font-serif text-2xl sm:text-3xl text-memento-espresso tracking-tight">
              Day-by-day
            </h2>
            {!readOnly && (
              <Button
                variant="ghost"
                data-testid="itinerary-edit-with-ai"
                className="text-xs font-medium text-memento-terracotta hover:bg-memento-sand rounded-full"
              >
                Edit with AI →
              </Button>
            )}
          </div>
          {(trip.days || []).map((d, i) => (
            <DayCard
              key={d.day}
              day={d}
              dayIndex={i}
              defaultOpen={i < 2}
              prices={prices}
              pricesLoading={pricesLoading}
              tripId={trip.id}
              readOnly={readOnly}
            />
          ))}
        </div>

        <div className="mt-16 pb-8 text-center">
          <p className="font-serif italic text-memento-coffee text-lg">
            Memento never books for you — we just point the way.
          </p>
        </div>
      </div>
    </div>
  );
};
