import { useEffect, useState } from "react";
import { Bookmark, Heart, X } from "lucide-react";
import { toast } from "sonner";
import { api, getGuestSessionId } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { SAVED_ITEMS } from "@/lib/mockData";

const Saved = () => {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api
      .get("/saved", {
        params: user ? {} : { guest_session_id: getGuestSessionId() },
      })
      .then((r) => {
        if (cancelled) return;
        const real = r.data?.items || [];
        setItems(real.length > 0 ? real : SAVED_ITEMS);
      })
      .catch(() => {
        if (!cancelled) setItems(SAVED_ITEMS);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleRemove = async (item) => {
    // Mock fallback items have no real id stored on backend — only attempt API for real ones
    if (item.created_at) {
      try {
        await api.delete(`/saved/${item.id}`, {
          params: user ? {} : { guest_session_id: getGuestSessionId() },
        });
      } catch (_e) {
        /* ignore */
      }
    }
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    toast.message("Removed", { description: item.title });
  };

  return (
    <div className="min-h-screen bg-memento-cream" data-testid="saved-page">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 py-12 lg:py-16">
        <p className="text-xs tracking-[0.3em] uppercase text-memento-terracotta font-semibold mb-3">
          Saved
        </p>
        <h1 className="font-serif text-4xl sm:text-5xl text-memento-espresso tracking-tight leading-tight mb-2">
          Things you've bookmarked
        </h1>
        <p className="text-memento-coffee mb-12 italic">
          Hotels, cafés, sunsets — all the small things you didn't want to forget.
        </p>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-3xl bg-memento-sand h-72 animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptySaved />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {items.map((item) => (
              <div
                key={item.id}
                data-testid={`saved-${item.id}`}
                className="group bg-white rounded-3xl overflow-hidden border border-memento-parchment hover:border-memento-terracotta/40 hover:-translate-y-1 transition-all duration-300"
              >
                <div className="aspect-square overflow-hidden bg-memento-sand">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-memento-sand to-memento-parchment flex items-center justify-center">
                      <Bookmark className="w-8 h-8 text-memento-terracotta" />
                    </div>
                  )}
                </div>
                <div className="p-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-memento-terracotta font-bold mb-1">
                      {item.type}
                    </p>
                    <h3 className="font-serif text-lg text-memento-espresso leading-tight tracking-tight truncate">
                      {item.title}
                    </h3>
                    {item.location && (
                      <p className="text-xs text-memento-coffee mt-1 truncate">
                        {item.location}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleRemove(item)}
                    data-testid={`saved-toggle-${item.id}`}
                    className="shrink-0 w-8 h-8 rounded-full bg-memento-sand flex items-center justify-center text-memento-terracotta hover:bg-memento-terracotta hover:text-white transition-colors"
                    aria-label="Remove"
                  >
                    {item.created_at ? <X className="w-4 h-4" /> : <Heart className="w-4 h-4 fill-current" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const EmptySaved = () => (
  <div className="text-center py-20">
    <div className="w-20 h-20 rounded-full bg-memento-sand flex items-center justify-center mx-auto mb-5">
      <Bookmark className="w-7 h-7 text-memento-terracotta" strokeWidth={1.5} />
    </div>
    <p className="font-serif text-2xl text-memento-espresso mb-2">
      Nothing saved yet
    </p>
    <p className="text-memento-coffee max-w-sm mx-auto">
      Tap the bookmark on any place, hotel, or activity in your itinerary to keep it here.
    </p>
  </div>
);

export default Saved;
