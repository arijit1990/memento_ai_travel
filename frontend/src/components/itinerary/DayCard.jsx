import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { ActivityCard } from "./ActivityCard";

export const DayCard = ({ day, defaultOpen = true, dayIndex, prices, pricesLoading, tripId, readOnly }) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="mb-8" data-testid={`day-card-${day.day}`}>
      <button
        onClick={() => setOpen(!open)}
        data-testid={`day-toggle-${day.day}`}
        className="w-full flex items-start gap-5 mb-5 text-left group"
      >
        <div className="shrink-0 w-14 h-14 rounded-2xl bg-memento-espresso text-memento-cream flex flex-col items-center justify-center">
          <span className="text-[10px] uppercase tracking-wider text-memento-cream/60">
            Day
          </span>
          <span className="font-serif text-xl leading-none">{day.day}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-3 flex-wrap">
            <h3 className="font-serif text-2xl sm:text-3xl text-memento-espresso tracking-tight leading-tight">
              {day.title}
            </h3>
            <span className="text-xs uppercase tracking-[0.2em] text-memento-coffee font-semibold">
              {day.date}
            </span>
          </div>
          <p className="text-memento-coffee text-sm mt-1 italic">{day.summary}</p>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-memento-coffee mt-3 shrink-0 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="space-y-3 pl-0 sm:pl-[76px]">
          {day.activities.map((a, i) => (
            <ActivityCard
              key={a.id}
              activity={a}
              dayIndex={dayIndex}
              activityIndex={i}
              livePrice={prices?.[a.id]}
              priceLoading={pricesLoading}
              tripId={tripId}
              readOnly={readOnly}
            />
          ))}
        </div>
      )}
    </div>
  );
};
