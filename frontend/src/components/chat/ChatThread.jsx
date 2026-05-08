import { useState, useEffect, useRef } from "react";
import { Send, Sparkles, ListChecks, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export const ChatThread = ({
  messages,
  onSend,
  onConfirm,
  generating,
  generatingLabel = "Handcrafting your itinerary...",
  onSwitchToWizard,
  showConfirmCard,
  confirmSummary,
  placeholder = "Ask Memento anything — 'Make day 3 less touristy'...",
}) => {
  const [input, setInput] = useState("");
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, generating, showConfirmCard]);

  const handleSend = () => {
    if (!input.trim()) return;
    onSend(input.trim());
    setInput("");
  };

  return (
    <div className="flex flex-col h-full" data-testid="chat-thread">
      {/* Header */}
      <div className="px-6 py-4 border-b border-memento-parchment flex items-center justify-between bg-white">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-memento-espresso text-memento-cream flex items-center justify-center font-serif">
            M
          </div>
          <div>
            <p className="font-serif text-base text-memento-espresso leading-none">
              Memento
            </p>
            <p className="text-xs text-memento-coffee mt-0.5">
              Your travel companion
            </p>
          </div>
        </div>
        <button
          onClick={onSwitchToWizard}
          data-testid="switch-to-wizard"
          className="text-xs font-medium text-memento-terracotta hover:text-memento-terracotta-dark flex items-center gap-1.5"
        >
          <ListChecks className="w-3.5 h-3.5" />
          Quick form
        </button>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-6 py-6 space-y-5 scrollbar-thin"
      >
        {messages.map((m) => (
          <div
            key={m.id}
            data-testid={`chat-message-${m.role}`}
            className={`flex gap-3 animate-float-up ${
              m.role === "user" ? "flex-row-reverse" : ""
            }`}
          >
            {m.role === "ai" && (
              <div className="w-8 h-8 shrink-0 rounded-full bg-memento-espresso text-memento-cream flex items-center justify-center font-serif text-sm">
                M
              </div>
            )}
            <div
              className={`max-w-[85%] ${
                m.role === "user"
                  ? "bg-memento-terracotta text-white rounded-2xl rounded-tr-sm px-4 py-3"
                  : "bg-memento-sand text-memento-espresso rounded-2xl rounded-tl-sm px-4 py-3"
              }`}
            >
              <p className="text-[15px] leading-relaxed whitespace-pre-line">
                {m.content}
              </p>
            </div>
          </div>
        ))}

        {/* Confirmation card */}
        {showConfirmCard && !generating && (
          <div
            className="mt-2 animate-float-up"
            data-testid="confirm-card"
          >
            <div className="ml-11 bg-white rounded-2xl rounded-tl-sm border border-memento-parchment p-5 shadow-sm">
              <div className="flex items-start gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-memento-terracotta mt-0.5" />
                <p className="text-sm font-semibold text-memento-espresso">
                  Here's what I have so far
                </p>
              </div>
              <div className="space-y-2 mb-4 text-sm text-memento-coffee">
                {confirmSummary.map((row, i) => (
                  <div key={i} className="flex gap-3">
                    <span className="uppercase text-[10px] tracking-[0.15em] font-semibold text-memento-terracotta w-24 shrink-0 pt-0.5">
                      {row.label}
                    </span>
                    <span className="text-memento-espresso">{row.value}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-memento-coffee mb-4 italic">
                {(() => {
                  const dest = confirmSummary.find((r) => r.label === "Destination")?.value;
                  return dest
                    ? `Want me to handcraft your ${dest} itinerary now?`
                    : "Want me to handcraft your itinerary now?";
                })()}
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={onConfirm}
                  data-testid="confirm-generate-btn"
                  className="bg-memento-terracotta hover:bg-memento-terracotta-dark text-white rounded-full h-10 px-5 text-sm"
                >
                  <Wand2 className="w-4 h-4 mr-2" />
                  Yes, generate it
                </Button>
                <Button
                  variant="ghost"
                  data-testid="confirm-edit-btn"
                  className="rounded-full h-10 px-4 text-sm text-memento-coffee hover:bg-memento-sand"
                >
                  Edit something
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Generating state */}
        {generating && (
          <div className="ml-11 animate-float-up" data-testid="generating-indicator">
            <div className="bg-white rounded-2xl border border-memento-parchment p-5 shadow-sm max-w-md">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-memento-terracotta animate-pulse-dot" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 rounded-full bg-memento-terracotta animate-pulse-dot" style={{ animationDelay: "200ms" }} />
                  <span className="w-2 h-2 rounded-full bg-memento-terracotta animate-pulse-dot" style={{ animationDelay: "400ms" }} />
                </div>
                <p className="text-sm font-medium text-memento-espresso">
                  {generatingLabel}
                </p>
              </div>
              <div className="space-y-2 text-xs text-memento-coffee">
                <p className="flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-memento-sage-dark" />
                  Found 14 hotels in Le Marais
                </p>
                <p className="flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-memento-sage-dark" />
                  Optimizing for art &amp; pastry
                </p>
                <p className="flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-memento-sage-dark" />
                  Routing transit, applying smart hacks...
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-memento-parchment bg-white p-4">
        <div className="relative max-w-3xl mx-auto">
          <Textarea
            data-testid="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={placeholder}
            className="resize-none min-h-[56px] max-h-32 pr-14 pl-5 py-4 rounded-2xl border-memento-parchment bg-memento-cream/50 focus-visible:ring-memento-terracotta text-[15px]"
          />
          <Button
            onClick={handleSend}
            data-testid="chat-send-btn"
            disabled={!input.trim()}
            size="icon"
            className="absolute right-2 bottom-2 w-10 h-10 rounded-full bg-memento-terracotta hover:bg-memento-terracotta-dark disabled:opacity-30"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-[11px] text-memento-coffee/70 text-center mt-2">
          Memento will not save your trip until you sign in.
        </p>
      </div>
    </div>
  );
};
