import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";

import { ItineraryPanel } from "@/components/itinerary/ItineraryPanel";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";

const Share = () => {
  const { token } = useParams();
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get(`/share/${token}`)
      .then((r) => {
        if (!cancelled) {
          setTrip(r.data.trip);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e?.response?.data?.detail || "Share link not found");
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="min-h-screen bg-memento-cream" data-testid="share-page">
      {/* Public header */}
      <header className="sticky top-0 z-30 bg-memento-cream/90 backdrop-blur-md border-b border-memento-parchment">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2" data-testid="share-home-link">
            <div className="w-8 h-8 rounded-full bg-memento-espresso text-memento-cream flex items-center justify-center font-serif text-sm">
              M
            </div>
            <span className="font-serif text-lg text-memento-espresso">Memento</span>
          </Link>
          <span className="text-[10px] uppercase tracking-[0.2em] text-memento-coffee font-semibold">
            Shared trip · Read-only
          </span>
        </div>
      </header>

      <div className="max-w-5xl mx-auto">
        {loading && (
          <div className="py-32 text-center">
            <div className="w-12 h-12 rounded-full bg-memento-sand mx-auto animate-pulse" />
            <p className="text-memento-coffee mt-4 italic">Opening the postcard...</p>
          </div>
        )}
        {error && !loading && (
          <div className="py-32 text-center px-6">
            <p className="font-serif text-3xl text-memento-espresso mb-2">
              {error}
            </p>
            <p className="text-memento-coffee text-sm mb-6">
              The link may have expired or been removed by its creator.
            </p>
            <Link to="/">
              <Button className="bg-memento-terracotta hover:bg-memento-terracotta-dark text-white rounded-full h-11 px-6">
                Plan your own
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        )}
        {trip && !loading && <ItineraryPanel trip={trip} readOnly />}

        {/* Viral CTA */}
        {trip && !loading && (
          <section className="py-16 px-6 lg:px-12">
            <div className="bg-memento-espresso text-memento-cream rounded-3xl p-10 lg:p-14 text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-grain opacity-30" />
              <div className="relative z-10">
                <Sparkles className="w-6 h-6 text-memento-apricot mx-auto mb-4" />
                <p className="text-xs uppercase tracking-[0.3em] text-memento-apricot font-semibold mb-3">
                  Like what you see?
                </p>
                <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl tracking-tight leading-tight mb-4">
                  Plan a trip you'll
                  <br />
                  <em className="italic font-medium text-memento-apricot">remember.</em>
                </h2>
                <p className="text-memento-cream/80 max-w-md mx-auto mb-8">
                  Memento handcrafts trips like this in 78 seconds. Free, no credit card.
                </p>
                <Link to="/chat" data-testid="share-cta">
                  <Button className="bg-memento-terracotta hover:bg-memento-terracotta-dark text-white rounded-full h-12 px-7 font-medium shadow-[0_12px_30px_rgba(200,90,64,0.4)]">
                    Plan yours
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default Share;
