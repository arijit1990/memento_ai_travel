// Lightweight client-side helpers for intake flow.

// Strip filler phrases like "I want to go to X" → "X" — purely cosmetic.
// Falls back to raw text if no patterns match. Multi-pass.
export const cleanDestination = (text) => {
  if (!text) return "";
  let t = text.trim().replace(/[?!.]+$/g, "");
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
    for (const re of patterns) t = t.replace(re, "");
  } while (t !== prev && t.length > 0);
  // Trim trailing duration/group hints
  t = t.replace(/\s+(for|over|across|in|during)\s+(a\s+|the\s+)?(\d+\s+)?(day|week|month|weekend|while|bit|moment).*$/i, "");
  t = t.replace(/\s+please$/i, "");
  t = t.trim();
  if (t.length > 0) {
    t = t
      .split(/\s+/)
      .map((w) => (w.length > 2 ? w[0].toUpperCase() + w.slice(1) : w))
      .join(" ");
  }
  return t || text.trim();
};
