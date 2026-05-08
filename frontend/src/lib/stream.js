// SSE-style streaming POST consumer. Yields parsed events as they arrive.
import { API, getToken } from "@/lib/api";

export const streamGenerate = async function* (body) {
  const headers = { "Content-Type": "application/json" };
  const t = getToken();
  if (t) headers.Authorization = `Bearer ${t}`;

  const resp = await fetch(`${API}/trips/generate/stream`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!resp.ok || !resp.body) {
    throw new Error(`HTTP ${resp.status}`);
  }
  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    // Parse SSE-style "data: {...}\n\n" frames
    const frames = buf.split("\n\n");
    buf = frames.pop() || "";
    for (const frame of frames) {
      const line = frame.trim();
      if (!line.startsWith("data:")) continue;
      const json = line.slice(5).trim();
      if (!json) continue;
      try {
        yield JSON.parse(json);
      } catch (_e) {
        /* ignore malformed frame */
      }
    }
  }
};
